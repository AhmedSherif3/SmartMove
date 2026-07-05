export function getApiBaseUrl() {
  const fallback = "http://127.0.0.1:8000/api";

  if (typeof window === "undefined") {
    return (process.env.NEXT_PUBLIC_API_BASE_URL || fallback).replace(/\/$/, "");
  }

  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!envValue) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }

  try {
    const envUrl = new URL(envValue);
    const host = window.location.hostname;

    if (envUrl.hostname === "localhost" && host === "127.0.0.1") {
      envUrl.hostname = host;
    } else if (envUrl.hostname === "127.0.0.1" && host === "localhost") {
      envUrl.hostname = host;
    }

    return envUrl.toString().replace(/\/$/, "");
  } catch {
    return envValue.replace(/\/$/, "");
  }
}
