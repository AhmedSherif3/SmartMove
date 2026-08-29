import { getApiBaseUrl } from "@/lib/urls/apiBase";

function hasCsrfCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("csrftoken="));
}

let csrfPromise: Promise<void> | null = null;

export function getCsrfToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("csrftoken="));

  if (!match) {
    return null;
  }

  return match.split("=").slice(1).join("=") || null;
}

/**
 * Forcibly expire the csrftoken cookie so that ensureCsrfCookie() will
 * re-fetch it from the server on the next mutating request.
 * Call this from the Axios response interceptor whenever a 403 is received.
 */
export function invalidateCsrfCache() {
  if (typeof document === "undefined") return;

  // Overwrite the cookie with a max-age of 0, which tells the browser to
  // delete it immediately (works for non-HttpOnly cookies like csrftoken).
  document.cookie = "csrftoken=; max-age=0; path=/";

  // Also kill any in-flight fetch promise so the next call triggers a fresh GET.
  csrfPromise = null;
}

export async function ensureCsrfCookie(force = false) {
  if (typeof window === "undefined") {
    return;
  }

  // If forced (e.g. after a 403 CSRF failure) bypass the cookie presence check.
  if (!force && hasCsrfCookie()) {
    return;
  }

  if (!csrfPromise) {
    const baseUrl = getApiBaseUrl();
    csrfPromise = fetch(`${baseUrl}/auth/csrf/`, {
      method: "GET",
      credentials: "include",
    })
      .then(() => {})
      .finally(() => {
        csrfPromise = null;
      });
  }

  await csrfPromise;
}
