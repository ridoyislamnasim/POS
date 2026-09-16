/**
 * Central frontend config — সব env read এক জায়গায়।
 * পরে port / backend URL বদলাতে চাইলে শুধু `.env` বদলাও, কোডে হাত দিতে হবে না।
 *
 * Env keys:
 *  - PORT / NEXT_PUBLIC_PORT        -> frontend কোন port-এ run হবে (default: 3020)
 *  - NEXT_PUBLIC_APP_URL            -> frontend নিজের URL (default: http://localhost:3020)
 *  - NEXT_PUBLIC_API_URL            -> backend API URL. দুটো form-ই চলবে:
 *       http://localhost:4000          (base — recommended)
 *       http://localhost:4000/api/v1   (সহ দিলেও auto-normalize হবে)
 *  - NEXT_PUBLIC_BACKEND_PORT       -> শুধু reference/document-এর জন্য (default: 4000)
 */

export const API_VERSION_PREFIX = "/api/v1";

function cleanUrl(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim().replace(/\/+$/, "");
  return v || fallback;
}

function cleanPort(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `http://localhost:4000/api/v1/` -> `http://localhost:4000` (trailing /api/v1 strip) */
function stripApiSuffix(url: string): string {
  return url.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "") || url;
}

const FRONTEND_PORT = cleanPort(
  process.env.NEXT_PUBLIC_PORT ?? process.env.PORT,
  3020,
);

const BACKEND_PORT = cleanPort(process.env.NEXT_PUBLIC_BACKEND_PORT, 4000);

const APP_URL = cleanUrl(
  process.env.NEXT_PUBLIC_APP_URL,
  `http://localhost:${FRONTEND_PORT}`,
);

const RAW_API_URL = cleanUrl(
  process.env.NEXT_PUBLIC_API_URL,
  `http://localhost:${BACKEND_PORT}`,
);

// সবসময় origin/base আকারে রাখো — শেষে /api/v1 থাকলে কেটে দাও,
// তাহলে env-তে দুটো form-ই দিলে একই result আসবে।
const API_URL = stripApiSuffix(RAW_API_URL);

/** Full API prefix সহ URL, যেমন http://localhost:4000/api/v1 */
const API_BASE_URL = `${API_URL}${API_VERSION_PREFIX}`;

export const appConfig = {
  /** Frontend port — `npm run dev` এই port-এ run করে (default 3020) */
  frontendPort: FRONTEND_PORT,
  /** Frontend নিজের URL */
  appUrl: APP_URL,
  /** Backend origin (default http://localhost:4000) — শেষে /api/v1 থাকে না */
  apiUrl: API_URL,
  /** Backend API prefix সহ (default http://localhost:4000/api/v1) */
  apiBaseUrl: API_BASE_URL,
  /** Backend port — শুধু reference-এর জন্য */
  backendPort: BACKEND_PORT,
  isProduction: process.env.NODE_ENV === "production",
} as const;

// Backward-compat: পুরনো import `API_URL from "@/lib/api"` ভাঙবে না।
export { API_URL, API_BASE_URL };
export default appConfig;

/**
 * API path -> full URL builder। দুই রকম path-ই support করে:
 *  - "/api/v1/auth/login" (full prefix সহ — যেভাবে সব page-এ লেখা আছে)
 *  - "/auth/login"         (short form — auto `/api/v1` বসবে)
 *  - "http..."             (absolute URL — touch করে না)
 * fileUrl (/uploads/...) এর জন্য এটা use কোরো না — ওটা সরাসরি API_URL + path।
 */
export function buildApiUrl(path: string): string {
  const p = path.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  if (withSlash.startsWith(`${API_VERSION_PREFIX}/`) || withSlash === API_VERSION_PREFIX) {
    return `${API_URL}${withSlash}`;
  }
  if (withSlash.startsWith("/api/")) {
    // অন্য কোনো /api/* prefix হলে যেমন আছে তেমনই base-এ জোড়া দাও
    return `${API_URL}${withSlash}`;
  }
  return `${API_BASE_URL}${withSlash}`;
}
