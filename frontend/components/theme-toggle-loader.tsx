"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), {
  ssr: false,
});

const DASHBOARD_PREFIXES = ["/admin", "/analyst", "/user"];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function ThemeToggleLoader() {
  const pathname = usePathname();

  if (isDashboardRoute(pathname)) {
    return null;
  }

  return <ThemeToggle variant="floating" />;
}
