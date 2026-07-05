import axios, { AxiosHeaders } from "axios";
import { clearAuthSession, extendSession } from "./session";
import { getApiBaseUrl } from "@/lib/urls/apiBase";
import { ensureCsrfCookie, getCsrfToken } from "@/lib/auth/csrf";

// This variable will hold the current refresh promise to avoid multiple simultaneous refresh calls.
let refreshPromise: Promise<unknown> | null = null;

const authApi = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 15000,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

authApi.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!"get,head,options".includes(method)) {
    await ensureCsrfCookie();
    const token = getCsrfToken();
    if (token) {
      const headers = AxiosHeaders.from(config.headers || {});
      headers.set("X-CSRFToken", token);
      config.headers = headers;
    }
  }
  return config;
});

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user_id: number;
  email: string;
  role: string;
  access_expires_in: number;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  confirm_password: string;
  region: "egypt" | "dubai" | "england";
  role?: "ADMIN" | "DATA_ANALYST" | "USER";
};

export async function login(payload: LoginPayload) {
  const { data } = await authApi.post<LoginResponse>("/auth/login/", payload);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await authApi.post("/auth/register/", payload);
  return data;
}

// Forgot password (request)
export async function forgotPassword(email: string) {
  return authApi.post("/auth/forgot-password/", { email });
}

// Verify OTP for forgot password
export async function verifyForgotOtp(email: string, code: string) {
  return authApi.post("/auth/verify-forgot-otp/", { email, code });
}

// Reset password
export async function resetPassword(email: string, code: string, newPassword: string, confirmPassword: string) {
  return authApi.post("/auth/reset-password/", {
    email,
    code,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}

// Verify email OTP
export async function verifyEmailOtp(email: string, otp: string) {
  return authApi.post("/auth/verify-email/", { email, otp });
}

// Resend OTP
export async function resendOtp(email: string, purpose: "verify_email" | "reset_password" | "change_password") {
  return authApi.post("/auth/resend-otp/", { email, purpose });
}

// Logout
export async function logout() {
  clearAuthSession();
  return authApi.post("/auth/logout/");
}

// Refresh JWT
export async function refresh() {
  return authApi.post("/auth/refresh/", {});
}

// Get profile
export async function getProfile() {
  const { data } = await authApi.get("/users/me/");
  return data;
}

// Add axios interceptor for automatic token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    // If it's not a 401 or we don't have the original request info, just reject.
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Never retry the refresh endpoint itself or a login attempt that failed.
    const isRefreshPath = typeof originalRequest.url === "string" && originalRequest.url.includes("/auth/refresh/");
    const isLoginPath = typeof originalRequest.url === "string" && originalRequest.url.includes("/auth/login/");

    if (isRefreshPath || isLoginPath) {
      if (isRefreshPath) {
        clearAuthSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/authentication")) {
          window.location.href = "/authentication/login";
        }
      }
      return Promise.reject(error);
    }

    // Only attempt refresh once per original request.
    if (!originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Deduplicate: If a refresh is already in progress, wait for it.
        if (!refreshPromise) {
          refreshPromise = refresh().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;
        extendSession();

        // Retry the original request with the new tokens (cookies).
        return authApi(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear session and redirect to login.
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

// Change password (request/verify)
export async function changePasswordRequest(oldPassword: string) {
  return authApi.post("/auth/change-password/request/", { old_password: oldPassword });
}

export async function changePasswordVerify(code: string, newPassword: string, confirmPassword: string) {
  return authApi.post("/auth/change-password/verify/", {
    code,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}

// User Management (Admin Only)
export interface UserListItem {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

export async function listUsers() {
  const { data } = await authApi.get<UserListItem[]>("/users/list/");
  return data;
}

export async function updateUser(id: number, payload: Partial<UserListItem>) {
  const { data } = await authApi.patch(`/users/${id}/`, payload);
  return data;
}

export async function deleteUser(id: number) {
  return authApi.delete(`/users/${id}/`);
}

export interface ReportItem {
  id: number;
  region: string;
  region_display: string;
  report_month: number;
  report_year: number;
  title: string;
  azure_blob_url: string;
  file_size_bytes: number;
  generated_at: string;
  can_view: boolean;
  can_download: boolean;
}

export async function getReports() {
  const { data } = await authApi.get<ReportItem[]>("/reports/");
  return data;
}
