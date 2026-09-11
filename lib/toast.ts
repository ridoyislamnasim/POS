import { toast } from "sonner";

const CODE_HINTS: Record<string, string> = {
  UNAUTHORIZED: "Sign in required",
  FORBIDDEN: "You do not have permission for this action",
  VALIDATION: "Check the form and try again",
  NOT_FOUND: "That record was not found",
  INSUFFICIENT_STOCK: "Not enough stock",
  SHIFT_REQUIRED: "Open a shift first",
  SHIFT_ALREADY_OPEN: "Close the current shift first",
  CONFLICT: "That value is already in use",
  PLAN_LIMIT: "Plan limit reached",
  PAYMENT_REQUIRED: "Please pay your previous month's bill to continue using the platform.",
};

function clean(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || t === "undefined" || t === "null" || t === "[object Object]") return null;
    return t;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return clean(err) ?? fallback;
  if (err instanceof Error) {
    const coded = err as Error & { code?: string; status?: number };
    const fromCode = coded.code ? CODE_HINTS[coded.code] : null;
    return clean(coded.message) ?? fromCode ?? fallback;
  }
  if (typeof err === "object") {
    const rec = err as { error?: { message?: string; code?: string }; message?: string; code?: string };
    return (
      clean(rec.error?.message) ??
      clean(rec.message) ??
      (rec.error?.code ? CODE_HINTS[rec.error.code] : null) ??
      (rec.code ? CODE_HINTS[rec.code] : null) ??
      fallback
    );
  }
  return fallback;
}

const seen = new Map<string, number>();
function once(key: string, ms = 1200) {
  const now = Date.now();
  const last = seen.get(key) ?? 0;
  if (now - last < ms) return false;
  seen.set(key, now);
  return true;
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function toastSuccess(message: string, description?: string) {
  if (!once(`ok:${message}:${description ?? ""}`)) return;
  toast.success(message, { description, duration: 3500 });
}

export function toastError(err: unknown, fallback?: string) {
  const message = getApiErrorMessage(err, fallback);
  if (!once(`err:${message}`, 1600)) return;
  toast.error(message, { duration: 7000 });
}

export function toastInfo(message: string, description?: string) {
  if (!once(`info:${message}:${description ?? ""}`)) return;
  toast(message, { description, duration: 4000 });
}

export function toastWarn(message: string, description?: string) {
  if (!once(`warn:${message}:${description ?? ""}`)) return;
  toast.warning(message, { description, duration: 5000 });
}

export function toastCreated(entity: string, detail?: string) {
  toastSuccess(`${cap(entity)} created`, detail);
}

export function toastDeleted(entity: string, detail?: string) {
  toastSuccess(`${cap(entity)} deleted`, detail);
}

export function toastUpdated(entity: string, detail?: string) {
  toastSuccess(`${cap(entity)} saved`, detail);
}

export function toastPos(kind: "success" | "error" | "info", message: string) {
  const opts = { duration: kind === "error" ? 7000 : 3500, position: "top-center" as const };
  if (!once(`pos:${kind}:${message}`, kind === "error" ? 1600 : 1200)) return;
  if (kind === "success") toast.success(message, opts);
  else if (kind === "error") toast.error(message, opts);
  else toast(message, opts);
}
