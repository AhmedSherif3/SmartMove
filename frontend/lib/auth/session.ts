export const SESSION_STORAGE_KEY = "smartmove-auth-session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthSession = {
  userId: number;
  email: string;
  role: string;
  expiresAt: number;
};

export function saveAuthSession(session: Omit<AuthSession, "expiresAt">) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: AuthSession = {
    ...session,
    expiresAt: Date.now() + SEVEN_DAYS_MS,
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

export function extendSession() {
  if (typeof window === "undefined") {
    return;
  }

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    parsed.expiresAt = Date.now() + SEVEN_DAYS_MS;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    clearAuthSession();
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    return parsed;
  } catch {
    clearAuthSession();
    return null;
  }
}

