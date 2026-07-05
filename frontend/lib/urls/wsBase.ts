import { getApiBaseUrl } from "./apiBase";

export function getWsBaseUrl(): string {
  const apiBase = getApiBaseUrl();
  try {
    // Use the API base URL to determine the WebSocket host.
    // E.g. https://api.smartmoveanalytics.me/api -> wss://api.smartmoveanalytics.me
    const url = new URL(apiBase);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}`;
  } catch {
    // Fallbacks
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}`;
    }
    return "ws://127.0.0.1:8000";
  }
}
