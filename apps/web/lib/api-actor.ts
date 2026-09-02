import { getApiBaseUrl } from "./api-base-url";
import { getHinoraSession, getSessionProfileDisplay } from "../components/dashboard/session";

declare global {
  interface Window {
    __hinoraFetchPatched?: boolean;
  }
}

export function installApiActorHeaders() {
  if (typeof window === "undefined" || window.__hinoraFetchPatched) {
    return;
  }

  window.__hinoraFetchPatched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl || !url.startsWith(apiBaseUrl)) {
      return originalFetch(input, init);
    }

    const session = getHinoraSession();
    const profile = getSessionProfileDisplay();
    const headers = new Headers(init?.headers);

    if (session?.userId) {
      headers.set("X-Hinora-User-Id", session.userId);
    }
    if (session?.email) {
      headers.set("X-Hinora-User-Email", session.email);
    }
    if (session && profile.name) {
      headers.set("X-Hinora-User-Name", profile.name);
    }

    const request = originalFetch(input, { ...init, headers });
    return request.catch((error: unknown) => {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error("Unable to reach the server. Please try again.");
      }
      throw error;
    });
  };
}
