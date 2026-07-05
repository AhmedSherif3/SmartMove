"use client";

import { usePathname } from "next/navigation";
import NeuralReactorBackground from "@/components/NeuralReactorBackground";

const DASHBOARD_PREFIXES = ["/admin", "/analyst", "/user"];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function NeuralReactorGate() {
  const pathname = usePathname();

  if (!isDashboardRoute(pathname)) {
    return null;
  }

  return <NeuralReactorBackground />;
}
