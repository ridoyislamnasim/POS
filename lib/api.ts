import { downloadPosDocument, printPosDocument } from "@/lib/documents";
export { printPosDocument, downloadPosDocument } from "@/lib/documents";
import { appConfig, buildApiUrl } from "@/lib/config";

export const API_URL = appConfig.apiUrl;
export { buildApiUrl };

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
  const { idempotencyKey: _k, ...rest } = init;
  const res = await fetch(buildApiUrl(path), { ...rest, headers, credentials: "include" });
  const json = await res.json().catch(() => ({ success: false, error: { message: "Request failed" } }));
  if (!json.success) {
    const err = new Error(json.error?.message ?? "Request failed") as Error & { code?: string; status?: number };
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export const EMPTY_PAGINATION: Pagination = { page: 1, limit: 25, total: 0, totalPages: 1 };

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "" || v === false || v === "ALL") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function apiList<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T[]; pagination: Pagination }> {
  const headers = new Headers(init.headers);
  const csrf = csrfFromCookie();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const res = await fetch(buildApiUrl(path), { ...init, headers, credentials: "include" });
  const json = await res.json().catch(() => ({ success: false, error: { message: "Request failed" } }));
  if (!json.success) {
    const err = new Error(json.error?.message ?? "Request failed") as Error & { code?: string; status?: number };
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  const data = Array.isArray(json.data) ? (json.data as T[]) : [];
  const raw = json.pagination ?? json.meta;
  const pagination: Pagination =
    raw && typeof raw.page === "number"
      ? {
          page: raw.page,
          limit: raw.limit ?? data.length ?? 25,
          total: raw.total ?? data.length,
          totalPages: raw.totalPages ?? 1,
        }
      : { page: 1, limit: data.length || 25, total: data.length, totalPages: 1 };
  return { data, pagination };
}

export async function apiEnvelope<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; pagination: Pagination }> {
  const headers = new Headers(init.headers);
  const csrf = csrfFromCookie();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const res = await fetch(buildApiUrl(path), { ...init, headers, credentials: "include" });
  const json = await res.json().catch(() => ({ success: false, error: { message: "Request failed" } }));
  if (!json.success) {
    const err = new Error(json.error?.message ?? "Request failed") as Error & { code?: string; status?: number };
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  const raw = json.pagination ?? json.meta;
  const data = json.data as T;
  const len = Array.isArray(data) ? data.length : Array.isArray((data as { rows?: unknown[] })?.rows) ? (data as { rows: unknown[] }).rows.length : 0;
  const pagination: Pagination =
    raw && typeof raw.page === "number"
      ? {
          page: raw.page,
          limit: raw.limit ?? 25,
          total: raw.total ?? len,
          totalPages: raw.totalPages ?? 1,
        }
      : { page: 1, limit: len || 25, total: len, totalPages: 1 };
  return { data, pagination };
}

export function fileUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  // /uploads/... ফাইল path — /api/v1 prefix বসবে না, সরাসরি backend origin + path
  return `${API_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function documentUrl(saleId: string, kind: "bill" | "invoice") {
  return buildApiUrl(`/api/v1/sales/${saleId}/documents/${kind}.pdf`);
}

export async function downloadDocument(saleId: string, _kind: "bill" | "invoice" = "invoice") {
  await downloadPosDocument("sale", saleId);
}

export async function printDocument(saleId: string, kind: "bill" | "invoice" = "bill") {
  await printPosDocument("sale", saleId, kind === "invoice" ? "invoice" : "receipt");
}

