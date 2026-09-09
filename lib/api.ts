const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function csrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )pos_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const csrf = csrfFromCookie();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  if (init.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  const json = await res.json().catch(() => ({ success: false, error: { message: "Request failed" } }));
  if (!json.success) {
    const err = new Error(json.error?.message ?? "Request failed") as Error & { code?: string; status?: number };
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}

export function documentUrl(saleId: string, kind: "bill" | "invoice") {
  return `${API}/api/v1/sales/${saleId}/documents/${kind}.pdf`;
}

async function fetchDocument(saleId: string, kind: "bill" | "invoice") {
  const csrf = csrfFromCookie();
  const res = await fetch(documentUrl(saleId, kind), {
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": csrf } : {},
  });
  if (!res.ok) throw new Error("Document denied");
  return res.blob();
}

export async function downloadDocument(saleId: string, kind: "bill" | "invoice") {
  const blob = await fetchDocument(saleId, kind);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${saleId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printDocument(saleId: string, kind: "bill" | "invoice") {
  const blob = await fetchDocument(saleId, kind);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  w?.addEventListener("load", () => w.print());
}
