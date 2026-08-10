/**
 * Public API base URL for browser fetch calls.
 *
 * Local (.env.local):
 *   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
 *
 * Vercel (Project Settings → Environment Variables → Production):
 *   NEXT_PUBLIC_API_BASE_URL=https://your-service.up.railway.app
 * Then Redeploy — NEXT_PUBLIC_* values are baked in at build time.
 *
 * NEXT_PUBLIC_API_URL is accepted as an alias.
 */
export function getApiBaseUrl() {
  const fromEnv = (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "");

  if (fromEnv) {
    return fromEnv;
  }

  // Local/dev only. Production builds must set the env on Vercel.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3001";
  }

  return "";
}

/** Prefer getApiBaseUrl() at call sites when possible. */
export const API_BASE_URL = getApiBaseUrl();
