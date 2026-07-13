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

export async function ensureCsrfCookie() {
  if (typeof window === "undefined" || hasCsrfCookie()) {
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
