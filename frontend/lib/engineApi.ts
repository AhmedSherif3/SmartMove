import axios from "axios";
import { getApiBaseUrl } from "@/lib/urls/apiBase";
import { ensureCsrfCookie, getCsrfToken } from "@/lib/auth/csrf";
import { refresh } from "@/lib/auth/api";
import { clearAuthSession, extendSession } from "@/lib/auth/session";

const API_BASE_URL = getApiBaseUrl();

// Hold the current refresh promise to avoid duplicate refresh requests
let refreshPromise: Promise<unknown> | null = null;

export const engineApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

engineApi.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!"get,head,options".includes(method)) {
    await ensureCsrfCookie();
    const token = getCsrfToken();
    if (token && config.headers) {
      config.headers.set("X-CSRFToken", token);
    }
  }
  return config;
});

// Response interceptor to handle token refresh on 401 errors
engineApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refresh().finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        extendSession();
        return engineApi(originalRequest);
      } catch (refreshError) {
        clearAuthSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/authentication")) {
          window.location.href = "/authentication/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);



export async function getStorageQuota() {
  const { data } = await engineApi.get("/cloud/quota/");
  return data;
}

export async function getWorkspaceContents() {
  const { data } = await engineApi.get("/cloud/workspace/");
  return data;
}



export async function getQuickProfile(fileId: string) {
  const { data } = await engineApi.get(`/engine/quick-profile/${fileId}/`);
  return data;
}

export async function analyzeWorkspace(fileIds: string[]) {
  const { data } = await engineApi.post("/engine/analyze/", { file_ids: fileIds });
  return data;
}

export async function checkAnalyzeStatus(workspaceId: string) {
  const { data } = await engineApi.get(`/engine/analyze/status/${workspaceId}/`);
  return data;
}

export async function getAgentSessions() {
  const { data } = await engineApi.get("/agentic/sessions/");
  return data;
}

export async function getAgentSessionDetail(sessionId: string) {
  const { data } = await engineApi.get(`/agentic/sessions/${sessionId}/`);
  return data;
}

export async function getAllFiles() {
  const { data } = await engineApi.get("/cloud/files/");
  return data;
}

export async function getAnalysisRuns() {
  const { data } = await engineApi.get("/engine/analyze/runs/");
  return data;
}

export async function deleteAnalysisRun(workspaceId: string) {
  const { data } = await engineApi.delete(`/engine/analyze/runs/${workspaceId}/`);
  return data;
}
