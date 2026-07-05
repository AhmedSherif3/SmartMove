"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bot,
  Compass,
  DollarSign,
  FileText,
  LineChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Hexagon,
  Sparkles,
  TrendingUp,
  ArrowRightLeft,
  Menu,
  X,
  Cloud,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import { logout } from "@/lib/auth/api";
import MagneticButton from "@/components/MagneticButton";
import { CountryToggle } from "@/components/PortalWarpTransition";
import { CountryFlagAnimated, CountryRibbon } from "@/components/CountryAtmosphere";
import { clearAuthSession } from "@/lib/auth/session";
import { getStorageQuota } from "@/lib/engineApi";

interface SidebarProps {
  role: string | undefined;
  userEmail: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  canReturnToAdmin?: boolean;
}

interface TopbarProps {
  onOpenMobileSidebar: () => void;
}

type RoleKey = "admin" | "analyst" | "user";

type MenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export function normalizeRole(role: string | undefined): RoleKey {
  const value = role?.toLowerCase();

  if (value === "admin" || value === "analyst" || value === "user") {
    return value;
  }

  // Handle various formats of Data Analyst
  if (value === "data_analyst" || value === "data-analyst" || value === "data analyst") {
    return "analyst";
  }

  return "user";
}

export function Sidebar({
  role,
  userEmail,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  canReturnToAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const roleKey = normalizeRole(role);
  const isCompact = isCollapsed && !isMobileOpen;
  const rolePath = `/${roleKey}`;

  const clearAuthCookies = () => {
    if (typeof document === "undefined") return;

    const cookieNames = ["access_token", "refresh_token", "csrftoken", "sessionid"];
    cookieNames.forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`; // expire immediately
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore network failures and proceed with local cleanup.
    } finally {
      clearAuthSession();
      clearAuthCookies();
      router.push("/authentication/login");
    }
  };



  const userFeatureItems: Array<{ name: string; slug: string; icon: LucideIcon }> = [
    { name: "Market Trends", slug: "market-trends", icon: TrendingUp },
    { name: "Investment", slug: "investment-insights", icon: DollarSign },
    { name: "Risks", slug: "risks", icon: Compass },
    { name: "Reports", slug: "reports", icon: FileText },
    // { name: "Predictions", slug: "predictions", icon: LineChart },
    { name: "Agentic", slug: "agentic", icon: Bot },
    { name: "Analytics Pro Engine", slug: "analytics-engine-ai", icon: Sparkles },
    { name: "SmartMove Cloud", slug: "cloud", icon: Cloud },
  ];

  const mapRoleItems = (roleBase: RoleKey) =>
    userFeatureItems.map((item) => ({
      name: item.name,
      href: `/${roleBase}/${item.slug}`,
      icon: item.icon,
    }));

  const analystExtras: MenuItem[] = [
    { name: "Notifications", href: "/analyst/notifications", icon: Bell },
  ];

  const userExtras: MenuItem[] = [
    { name: "Notifications", href: "/user/notifications", icon: Bell },
  ];

  const roleMenuItems: Record<RoleKey, MenuItem[]> = {
    admin: [
      { name: "Dashboards", href: "/admin/dashboards", icon: BarChart3 },
      { name: "Imported Data", href: "/admin/imported-data", icon: BarChart3 },
      { name: "User Management", href: "/admin/users", icon: Users, badge: 3 },
      { name: "SOC Monitoring", href: "/admin/monitoring/soc", icon: Bot },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
    analyst: [...mapRoleItems("analyst"), ...analystExtras],
    user: [...mapRoleItems("user"), ...userExtras],
  };

  const accountItems: MenuItem[] = [
    { name: "Billing & Quota", href: `${rolePath}/billing`, icon: CreditCard },
    { name: "Settings", href: `${rolePath}/settings`, icon: Settings },
  ];

  if (roleKey === "admin") {
    accountItems.push({ name: "View as Analyst", href: "/analyst", icon: ArrowRightLeft });
  }

  if (roleKey === "analyst" && canReturnToAdmin) {
    accountItems.push({ name: "Back to Admin", href: "/admin", icon: ArrowRightLeft });
  }

  const menuSections: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: "Workspace",
      items: [{ name: "Overview", href: rolePath, icon: LayoutDashboard }, ...roleMenuItems[roleKey]],
    },
    {
      title: "Account",
      items: accountItems,
    },
  ];

  const rolePillClass: Record<RoleKey, string> = {
    admin: "border-status-error/35 bg-status-error/15 text-status-error",
    analyst: "border-brand-accent/35 bg-brand-accent/15 text-brand-accent",
    user: "border-status-success/35 bg-status-success/15 text-status-success",
  };

  const collapsedDotClass: Record<RoleKey, string> = {
    admin: "bg-status-error",
    analyst: "bg-brand-accent",
    user: "bg-status-success",
  };

  const userName = userEmail ? userEmail.split("@")[0] : "User";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border-subtle bg-surface-card transition-transform duration-300 lg:static lg:translate-x-0 lg:transition-[width] lg:duration-300 lg:ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCompact ? "lg:w-16" : "lg:w-60"}`}
      aria-label="Sidebar navigation"
    >
      <button
        type="button"
        onClick={onCloseMobile}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-content-primary transition-colors hover:bg-surface-page hover:text-content-strong lg:hidden"
        aria-label="Close sidebar"
      >
        <X size={16} />
      </button>

      <MagneticButton strength={0.3}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-content-on-brand shadow-sm transition-transform hover:scale-110 lg:flex"
          aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCompact ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>
      </MagneticButton>

      <div
        className={`flex h-16 items-center border-b border-border-subtle ${isCompact ? "justify-center px-0" : "gap-3 px-5"
          }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-primary/15 text-brand-primary">
          <Hexagon size={18} fill="currentColor" />
        </div>
        {!isCompact && (
          <span className="font-logo text-xl font-bold leading-none tracking-tight text-content-strong">
            smartmove
          </span>
        )}
      </div>

      {!isCompact ? (
        <div className="px-5 py-4">
          <div
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${rolePillClass[roleKey]}`}
          >
            {roleKey}
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <div className={`h-2 w-2 rounded-full ${collapsedDotClass[roleKey]}`} />
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: "none" }}>
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCompact && (
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-content-muted">
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const isActive =
                item.href === rolePath
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                    ? "border-brand-primary/30 bg-brand-primary/12 text-brand-primary glow-primary"
                    : "border-transparent text-content-secondary hover:border-border-subtle hover:bg-surface-muted hover:text-content-strong"
                    }`}
                  title={isCompact ? item.name : undefined}
                >
                  <span
                    className={`absolute left-0 top-2 h-[calc(100%-16px)] w-0.5 rounded-full bg-(--ui-portal-accent) transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      }`}
                  />
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={18}
                      className={isActive ? "text-brand-primary" : "group-hover:text-content-strong"}
                    />
                    {!isCompact && <span>{item.name}</span>}
                  </div>

                  {!isCompact && item.badge && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-brand-primary/15 px-2 text-[10px] font-bold text-brand-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`mt-auto border-t border-border-subtle ${isCompact ? "p-2" : "p-3"}`}>
        {/* Mobile/Tablet Settings Controls (Theme, Logout) */}
        {!isCompact && (
          <div className="lg:hidden flex flex-col gap-3 mb-4 px-2 border-b border-border-subtle pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Theme</span>
              <ThemeToggle variant="topbar" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-status-error bg-status-error/10 hover:bg-status-error/20 transition-colors mt-1"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}


        <div
          className={`flex items-center ${isCompact ? "justify-center" : "gap-3 rounded-xl border border-border-subtle bg-surface-muted p-2"
            }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-brand-primary to-brand-accent text-xs font-bold text-content-on-brand shadow-sm">
            {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
          </div>
          {!isCompact && (
            <div className="min-w-0 flex flex-col">
              <span className="truncate text-sm font-bold text-content-strong">{userName}</span>
              <span className="truncate text-[10px] capitalize text-content-muted">{roleKey}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const pathParts = pathname.split("/").filter(Boolean);
  const pageTitle = pathParts[pathParts.length - 1]?.replace(/-/g, " ") || "Overview";

  const clearAuthCookies = () => {
    if (typeof document === "undefined") return;

    const cookieNames = ["access_token", "refresh_token", "csrftoken", "sessionid"];
    cookieNames.forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`; // expire immediately
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore network failures and proceed with local cleanup.
    } finally {
      clearAuthSession();
      clearAuthCookies();
      router.push("/authentication/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border-subtle bg-surface-card px-4 shadow-sm sm:px-6">
      <CountryRibbon />
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-content-primary transition-colors hover:bg-surface-page hover:text-content-strong lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-3">
          <CountryFlagAnimated size={28} />
          <h2 className="truncate font-logo text-sm font-bold capitalize text-content-strong sm:text-xl">
            {pageTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Country Toggle (dropdown selector on mobile/tablet, pills on desktop) */}
        <div className="flex items-center gap-2">
          <CountryToggle />
        </div>

        <div className="h-6 w-px bg-border-subtle hidden lg:block" />

        {/* Desktop-only: Theme Toggle */}
        <div className="hidden lg:block">
          <ThemeToggle variant="topbar" />
        </div>

        {/* Notification Bell (always visible) */}
        <NotificationDropdown pathname={pathname} router={router} />

        {/* Desktop-only: Logout Button */}
        <div className="hidden lg:flex items-center">
          <div className="mx-1 h-6 w-px bg-border-subtle sm:block" />
          <MagneticButton strength={0.2}>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-content-secondary transition-colors hover:bg-status-error/10 hover:text-status-error"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </MagneticButton>
        </div>
      </div>
    </header>
  );
}

import { useNotifications } from "@/lib/context/NotificationContext";

function NotificationDropdown({ pathname, router }: { pathname: string; router: ReturnType<typeof useRouter> }) {
  const { unreadCount, recentNotifications, markRead } = useNotifications();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!notifOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [notifOpen]);

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setNotifOpen(!notifOpen)}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border ${notifOpen ? "border-border-subtle bg-surface-muted text-content-strong" : "border-transparent text-content-secondary"} transition-colors hover:border-border-subtle hover:bg-surface-muted hover:text-content-strong`}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-status-error text-[8px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-4 top-14 mt-2.5 w-80 rounded-xl border border-border-subtle bg-surface-card p-3 shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
            <span className="font-logo text-xs font-bold uppercase tracking-wider text-content-strong">Notifications</span>
            <span className="text-[10px] text-brand-primary font-medium">{unreadCount} unread</span>
          </div>

          <div className="flex flex-col gap-2">
            {recentNotifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-content-muted">No recent notifications.</p>
            ) : (
              recentNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    if (n.link) {
                      const role = pathname.split("/")[1];
                      router.push(`/${role}${n.link}`);
                    }
                    setNotifOpen(false);
                  }}
                  className={`flex flex-col rounded-lg p-2 hover:bg-surface-muted transition-colors text-left ${!n.is_read ? 'bg-brand-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${!n.is_read ? "text-content-strong" : "text-content-secondary"}`}>{n.title}</span>
                    {!n.is_read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-primary" />}
                  </div>
                  <span className="text-[10px] text-content-secondary line-clamp-1 mt-0.5">{n.message}</span>
                  <span className="text-[9px] text-content-muted mt-1">{new Date(n.created_at).toLocaleString()}</span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setNotifOpen(false);
              const role = pathname.split("/")[1];
              router.push(`/${role}/notifications`);
            }}
            className="mt-2 w-full text-center border-t border-border-subtle pt-2 text-xs font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}


