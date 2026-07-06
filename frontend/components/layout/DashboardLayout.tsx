"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { getAuthSession, type AuthSession } from "@/lib/auth/session";
import { Sidebar, Topbar, normalizeRole } from "@/components/layout/DashboardLayoutParts";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { CurrencyProvider } from "@/lib/currency-context";
import { RegionProvider } from "@/lib/context/RegionContext";
import { PortalWarpProvider, type PortalType } from "@/components/PortalWarpTransition";
import { CountryAtmosphereCanvas } from "@/components/CountryAtmosphere";
import { CountryLandmarkLayer } from "@/components/CountryLandmarkLayer";
import { CursorReticle } from "@/components/CursorReticle";
import Footer from "@/components/layout/Footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session] = useState<AuthSession | null>(() => getAuthSession());
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSessionReady(true);
  }, []);

  const sessionRole = normalizeRole(session?.role);
  const isAdmin = sessionRole === "admin";
  const isAnalystView = isAdmin && pathname.startsWith("/analyst");
  const displayRole = isAnalystView ? "analyst" : sessionRole;
  const rolePrefix = session ? `/${displayRole}` : null;
  const isPathAllowed = Boolean(
    rolePrefix && (pathname.startsWith(rolePrefix) || (isAdmin && pathname.startsWith("/analyst")))
  );

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    if (!session) {
      router.replace("/authentication/login");
      return;
    }

    if (!isPathAllowed && rolePrefix) {
      router.replace(rolePrefix);
    }
  }, [isPathAllowed, isSessionReady, rolePrefix, router, session]);

  if (!isSessionReady || !session) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-transparent">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PortalWarpProvider initialPortal={displayRole as PortalType}>
      <RegionProvider>
        <CurrencyProvider>
          <CountryAtmosphereCanvas />
          <CountryLandmarkLayer />
          <CursorReticle />
          <div
            className="flex min-h-screen bg-transparent font-base text-content-primary transition-colors duration-300"
            data-portal={displayRole}
          >
            {isSidebarOpen && (
              <button
                type="button"
                aria-label="Close sidebar backdrop"
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-30 bg-overlay-backdrop lg:hidden"
              />
            )}

            <Sidebar
              role={displayRole}
              userEmail={session.email}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
              isMobileOpen={isSidebarOpen}
              onCloseMobile={() => setIsSidebarOpen(false)}
              canReturnToAdmin={isAnalystView}
            />

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden reactor-content">
              <Topbar onOpenMobileSidebar={() => setIsSidebarOpen(true)} />
              <main className="flex-1 overflow-y-auto p-4 sm:p-8">
                <motion.div
                  className="mx-auto max-w-7xl"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
                <Footer />
              </main>
            </div>
          </div>
          <ChatbotWidget userRole={displayRole || "user"} />
        </CurrencyProvider>
      </RegionProvider>
    </PortalWarpProvider>
  );
}