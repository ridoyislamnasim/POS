const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PosDocumentType =
  | "sale"
  | "sale-payment"
  | "payment"
  | "return"
  | "purchase"
  | "purchase-order"
  | "purchase-return";

export type DocumentLayout = "receipt" | "invoice";

function csrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )pos_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function deny(res: Response): never {
  const err = new Error(res.status === 401 ? "Sign in required" : res.status === 403 ? "You do not have permission for this document" : "Document denied") as Error & {
    status?: number;
    code?: string;
  };
  err.status = res.status;
  err.code = res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : "VALIDATION";
  throw err;
}

async function fetchDoc(path: string) {
  const csrf = csrfFromCookie();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
  });
  if (!res.ok) deny(res);
  return res;
}

function filenameFrom(res: Response, fallback: string) {
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i.exec(cd);
  if (match?.[1]) return decodeURIComponent(match[1]).replace(/[^\w.\-]+/g, "-");
  return fallback;
}

const htmlCache = new Map<string, string>();

function cacheKey(type: PosDocumentType, id: string, layout: DocumentLayout) {
  return `${type}:${id}:${layout}`;
}

export function clearDocumentCache(type?: PosDocumentType, id?: string) {
  if (!type || !id) {
    htmlCache.clear();
    return;
  }
  htmlCache.delete(cacheKey(type, id, "receipt"));
  htmlCache.delete(cacheKey(type, id, "invoice"));
}

export async function fetchPrintHtml(type: PosDocumentType, id: string, layout: DocumentLayout, autoPrint = false) {
  const key = cacheKey(type, id, layout);
  const cached = htmlCache.get(key);
  if (cached && !autoPrint) return cached;
  const res = await fetchDoc(`/api/v1/documents/${type}/${id}/print?layout=${layout}&autoprint=${autoPrint ? "1" : "0"}`);
  const html = await res.text();
  htmlCache.set(key, html.replace(/window\.print\(\)/g, "/* preview */"));
  return autoPrint ? html : htmlCache.get(key)!;
}

let printFrame: HTMLIFrameElement | null = null;

export function openPrintHtml(html: string, layout: DocumentLayout) {
  if (printFrame) {
    printFrame.remove();
    printFrame = null;
  }
  const iframe = document.createElement("iframe");
  iframe.title = "Print";
  iframe.setAttribute("aria-hidden", "true");
  const size = layout === "invoice" ? { width: "210mm", height: "297mm" } : { width: "80mm", height: "220mm" };
  iframe.style.cssText = `position:absolute;left:-12000px;top:0;width:${size.width};height:${size.height};border:0;`;
  document.body.appendChild(iframe);
  printFrame = iframe;
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    printFrame = null;
    throw new Error("Print window unavailable");
  }

  let printed = false;
  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
      if (printFrame === iframe) printFrame = null;
    }, 800);
  };
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      printed = false;
      iframe.remove();
      if (printFrame === iframe) printFrame = null;
      throw new Error("Print failed");
    }
  };

  win.addEventListener("afterprint", cleanup);
  iframe.addEventListener("load", () => {
    const doc = iframe.contentDocument;
    const imgs = doc ? Array.from(doc.images) : [];
    const pending = imgs.filter((img) => !img.complete);
    if (!pending.length) {
      window.setTimeout(trigger, 250);
      return;
    }
    let left = pending.length;
    const done = () => {
      left -= 1;
      if (left <= 0) window.setTimeout(trigger, 250);
    };
    pending.forEach((img) => {
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });
    window.setTimeout(trigger, 2500);
  });
  iframe.srcdoc = html;
  window.setTimeout(trigger, 3000);
}

export async function printPosDocument(type: PosDocumentType, id: string, layout: DocumentLayout = "receipt") {
  const res = await fetchDoc(`/api/v1/documents/${type}/${id}/print?layout=${layout}&autoprint=0`);
  const html = await res.text();
  htmlCache.set(cacheKey(type, id, layout), html);
  openPrintHtml(html, layout);
}

export async function downloadPosDocument(type: PosDocumentType, id: string, fallbackName?: string) {
  const res = await fetchDoc(`/api/v1/documents/${type}/${id}.pdf`);
  const blob = await res.blob();
  const name = filenameFrom(res, `${fallbackName || type}.pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".pdf") ? name : `${name}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export type DocumentPayload = {
  title: string;
  number: string;
  filename: string;
  status?: string;
  datetime: string;
  currency: string;
  paperWidthMm?: 58 | 80;
  layout?: DocumentLayout;
  relatedNumber?: string;
  relatedLabel?: string;
  issuer: { name: string; legalName?: string; address?: string; phone?: string; email?: string; taxId?: string; logoUrl?: string; footer?: string };
  party?: { name: string; phone?: string; email?: string; address?: string };
  partyLabel?: string;
  branchName?: string;
  staffName?: string;
  lines: { name: string; sku?: string; variant?: string; qty: string; unitPrice: string; discount: string; tax: string; lineTotal: string }[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  due: string;
  change: string;
  payments: { method: string; amount: string; status?: string; reference?: string }[];
  notes?: string;
  terms?: string;
  thankYou?: string;
  returnPolicy?: string;
  paymentHeadline?: string;
  watermark?: string;
  meta: { label: string; value: string }[];
  operational?: boolean;
  defaultPrintLayout?: DocumentLayout;
};

export async function fetchDocumentPayload(type: PosDocumentType, id: string, layout: DocumentLayout = "invoice") {
  const res = await fetchDoc(`/api/v1/documents/${type}/${id}?layout=${layout}`);
  const json = await res.json();
  if (!json.success) deny(res);
  return json.data as DocumentPayload;
}
