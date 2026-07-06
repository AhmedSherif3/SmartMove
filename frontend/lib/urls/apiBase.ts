export function getApiBaseUrl() {
  const fallback = "http://127.0.0.1:8000/api";

  if (typeof window === "undefined") {
    // SSR: need absolute URL to backend
    return (process.env.NEXT_PUBLIC_API_BASE_URL || fallback).replace(/\/$/, "");
  }

  // Client-side: use local Next.js proxy to avoid third-party cookie blocking
  return "/api";
}
