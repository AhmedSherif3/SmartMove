"use client";

import { useMemo, useState } from "react";
import { getAuthSession, type AuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/components/layout/DashboardLayoutParts";

type UserInfo = {
  session: AuthSession | null;
  role: "admin" | "analyst" | "user";
};

export function useUser(): UserInfo {
  const [session] = useState<AuthSession | null>(() => getAuthSession());

  const role = useMemo(() => normalizeRole(session?.role), [session?.role]);

  return { session, role };
}
