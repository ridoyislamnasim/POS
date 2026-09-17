/**
 * Central frontend API config — SINGLE source of truth for the backend base URL.
 *
 * Chain: API clients (`lib/api.ts`, `lib/documents.ts`) -> this config
 *        -> `NEXT_PUBLIC_API_URL` -> local OR production backend.
 *
 * No backend URL is hardcoded anywhere in app code. No per-call
 * `if (env === ...) fetch(...)` logic — the environment is resolved
 * ONCE here, every API client just uses the resolved base URL.
 *
 * Required env (no silent fallbacks):
 *  - NEXT_PUBLIC_APP_ENV : "local" | "production"
 *  - NEXT_PUBLIC_API_URL : backend origin, e.g.
 *      local:      http://localhost:4000
 *      production: https://server.shohojhisab.com   (no trailing /api)
 *    A trailing `/api` or `/api/v1` is normalized away so all three forms
 *    resolve to the same base (prevents double `/api/api/v1`).
 *
 * Missing/invalid values throw a clear error at startup/build instead of
 * silently calling the wrong backend.
 *
 * Next.js rule: NEXT_PUBLIC_* is embedded at dev-start / build time.
 * After changing `.env.local` you MUST restart `npm run dev`;
 * for production, configure env BEFORE `npm run build`.
 */

export const APP_ENVIRONMENTS = ["local", "production"] as const;
export type AppEnv = (typeof APP_ENVIRONMENTS)[number];

export const API_VERSION_PREFIX = "/api/v1";

function readAppEnv(): AppEnv {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? "").trim().toLowerCase();
  if (!raw) {
    throw new Error(
      "[api-config] NEXT_PUBLIC_APP_ENV is missing. " +
        `Set it to one of: ${APP_ENVIRONMENTS.join(" | ")}. ` +
        "Then restart `npm run dev` (or rebuild for production).",
    );
  }
  if (raw !== "local" && raw !== "production") {
    throw new Error(
      `[api-config] Invalid NEXT_PUBLIC_APP_ENV=${JSON.stringify(raw)}. ` +
        `Supported values: ${APP_ENVIRONMENTS.join(" | ")}.`,
    );
  }
  return raw;
}

function readApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error(
      "[api-config] NEXT_PUBLIC_API_URL is missing. " +
        "Set the backend base URL (e.g. http://localhost:4000 for local, " +
        "https://server.shohojhisab.com for production). " +
        "Then restart `npm run dev` (or rebuild for production).",
    );
  }
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(
      `[api-config] Invalid NEXT_PUBLIC_API_URL=${JSON.stringify(raw)}. ` +
        "It must start with http:// or https://",
    );
  }
  return stripApiSuffix(raw);
}

/** Trailing `/api/v1` or `/api` is normalized to the origin.
 *  `https://host/api/v1` -> `https://host`
 *  `https://host/api/`   -> `https://host`
 *  `https://host`        -> `https://host` (unchanged — exact env value is kept) */
function stripApiSuffix(url: string): string {
  return url
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "") || url;
}

const APP_ENV = readAppEnv();
const API_URL = readApiUrl();

/** Full API prefix, e.g. http://localhost:4000/api/v1 */
const API_BASE_URL = `${API_URL}${API_VERSION_PREFIX}`;

function isLocalhostLike(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|.*\.local)(:\d+)?(\/|$)/i.test(url);
}

// Warn (never throw) on env/URL mismatch — the classic wrong-backend accident.
if (APP_ENV === "local" && !isLocalhostLike(API_URL)) {
  console.warn(
    `[api-config] WARNING: NEXT_PUBLIC_APP_ENV=local but NEXT_PUBLIC_API_URL=${API_URL} ` +
      "points at a remote backend. Local work may hit production data.",
  );
}
if (APP_ENV === "production" && isLocalhostLike(API_URL)) {
  console.warn(
    `[api-config] WARNING: NEXT_PUBLIC_APP_ENV=production but NEXT_PUBLIC_API_URL=${API_URL} ` +
      "points at localhost. The production build will not reach the live backend.",
  );
}

// Dev/debug visibility only (no secrets — just env name + base URL).
if (process.env.NODE_ENV !== "production") {
  console.info(`[api-config] Environment: ${APP_ENV.toUpperCase()} | API: ${API_URL}`);
}

export const appConfig = {
  /** "local" | "production" — from NEXT_PUBLIC_APP_ENV */
  appEnv: APP_ENV,
  /** Backend origin from NEXT_PUBLIC_API_URL (no /api/v1 suffix) */
  apiUrl: API_URL,
  /** Backend API prefix, e.g. https://server.shohojhisab.com/api/v1 */
  apiBaseUrl: API_BASE_URL,
} as const;

// Backward-compat: existing `API_URL from "@/lib/api"` imports keep working.
export { API_URL, API_BASE_URL };
export default appConfig;

/**
 * API path -> full URL builder. All API clients must go through this.
 *  - "/api/v1/auth/login" (full prefix, as used across pages)
 *  - "/auth/login"         (short form — auto `/api/v1` prefix)
 *  - "http..."             (absolute URL — untouched)
 * fileUrl (/uploads/...) must NOT use this — it joins API_URL + path directly.
 */
export function buildApiUrl(path: string): string {
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  // Safety: never produce a double /api even if API_URL ever ends with /api.
  const base = API_URL.replace(/\/+$/, "");
  const baseWithoutApi =
    base.endsWith("/api") && withSlash.startsWith("/api/") ? base.slice(0, -4) : base;
  if (withSlash.startsWith(`${API_VERSION_PREFIX}/`) || withSlash === API_VERSION_PREFIX) {
    return `${baseWithoutApi}${withSlash}`;
  }
  if (withSlash.startsWith("/api/")) {
    // Other /api/* paths as-is (/api/health, /api/ready).
    return `${baseWithoutApi}${withSlash}`;
  }
  return `${API_BASE_URL}${withSlash}`;
}
