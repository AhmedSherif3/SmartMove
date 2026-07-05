"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ChevronRight,
  Search
} from "lucide-react";
import { useNotifications } from "@/lib/context/NotificationContext";
import { fetchNotifications, type NotificationItem } from "@/lib/notificationApi";
import { usePathname, useRouter } from "next/navigation";

export default function NotificationHub() {
  const { markRead, markAllRead, deleteNotif, recentNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "system" | "data" | "ai" | "security" | "report">("all");
  const [ordering, setOrdering] = useState<"-created_at" | "created_at" | "priority">("-created_at");

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (activeFilter === "unread") params.is_read = "false";
      else if (activeFilter !== "all") params.type = activeFilter;
      if (searchQuery) params.search = searchQuery;
      if (ordering) params.ordering = ordering;

      const res = await fetchNotifications(params);
      setNotifications(res.results || []);
      setTotalPages(Math.ceil((res.count || 1) / 20));
    } catch (error) {
      console.error("Failed to load notifications page", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeFilter, searchQuery, ordering]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData, recentNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id: string) => {
    await deleteNotif(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear these notifications? Note: there is no bulk delete yet, so marking all read is preferred.")) {
      handleMarkAllRead();
    }
  };

  const renderPriorityIcon = (priority: string) => {
    switch (priority) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-status-success" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-status-warning" />;
      case "error":
        return <XCircle className="w-5 h-5 text-status-error" />;
      default:
        return <Info className="w-5 h-5 text-brand-primary" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    if (!mounted) return date.toLocaleDateString();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getCategoryBadge = (type: string) => {
    switch (type) {
      case "ai":
        return { label: "AI engine", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      case "data":
        return { label: "Data Lake", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case "security":
        return { label: "Security", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "report":
        return { label: "Report", class: "bg-teal-500/10 text-teal-400 border-teal-500/20" };
      case "subscription":
        return { label: "Subscription", class: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
      case "cloud":
        return { label: "Cloud", class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
      case "admin":
        return { label: "Broadcast", class: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
      default:
        return { label: "System", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-border-subtle bg-surface-card p-3 shadow-lg flex items-center justify-center">
              <Bell className="w-7 h-7 text-brand-primary" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-status-error border-2 border-surface-card rounded-full animate-pulse" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-logo font-bold text-content-strong">Notification Hub</h1>
            <p className="text-xs text-content-secondary font-medium">
              Monitor active ingestion steps, storage telemetry, and AI convergence updates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-content-strong border border-border-subtle rounded-xl hover:bg-surface-muted transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-status-error border border-status-error/20 bg-status-error/5 rounded-xl hover:bg-status-error/10 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Clear unread
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card/40 border border-border-subtle p-3 rounded-2xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {["all", "unread", "ai", "data", "security", "system"].map((filter) => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter as "all" | "unread" | "system" | "data" | "ai" | "security" | "report"); setPage(1); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all capitalize ${
                activeFilter === filter ? "bg-brand-primary text-content-on-brand" : "text-content-muted hover:text-content-secondary"
              }`}
            >
              {filter === "all" ? "All Logs" : filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-muted border border-border-subtle rounded-xl focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <select
            value={ordering}
            onChange={(e) => { setOrdering(e.target.value as "-created_at" | "created_at" | "priority"); setPage(1); }}
            className="text-sm bg-surface-muted border border-border-subtle rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-brand-primary"
          >
            <option value="-created_at">Newest First</option>
            <option value="created_at">Oldest First</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-card/25 border border-border-subtle rounded-2xl border-dashed">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent mb-4" />
            <p className="text-sm font-semibold text-content-secondary">Fetching updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-card/25 border border-border-subtle rounded-2xl border-dashed">
            <Bell className="w-10 h-10 text-content-muted opacity-40 mb-3" />
            <p className="text-sm font-semibold text-content-secondary">All caught up!</p>
            <p className="text-xs text-content-muted mt-1">No alerts matching this query.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const badge = getCategoryBadge(notif.type);
            return (
              <div
                key={notif.id}
                className={`group relative flex items-start justify-between p-5 border rounded-2xl transition-all duration-300 ${
                  notif.is_read 
                    ? "bg-surface-card/45 border-border-subtle/50 opacity-80" 
                    : "bg-surface-card border-brand-primary/20 shadow-md ring-1 ring-brand-primary/5 hover:border-brand-primary/45"
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {renderPriorityIcon(notif.priority)}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-sm font-bold ${notif.is_read ? "text-content-secondary" : "text-content-strong"}`}>
                        {notif.title}
                      </h3>
                      <span className={`text-[9px] font-mono border px-2 py-0.5 rounded uppercase tracking-wider ${badge.class}`}>
                        {badge.label}
                      </span>
                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-content-secondary leading-relaxed max-w-2xl whitespace-pre-wrap">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      {notif.actions && notif.actions.length > 0 && (
                        <div className="flex gap-2">
                          {notif.actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const role = pathname.split("/")[1];
                                router.push(`/${role}${action.url}`);
                              }}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-surface-muted border border-border-subtle hover:text-brand-primary hover:border-brand-primary/50 transition-colors"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-content-muted mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(notif.created_at)}
                      </span>

                      {notif.link && (
                        <button
                          onClick={() => {
                            const role = pathname.split("/")[1];
                            router.push(`/${role}${notif.link}`);
                          }}
                          className="text-brand-primary font-bold hover:underline flex items-center gap-0.5 group/btn"
                        >
                          Access workspace
                          <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-4" onClick={(e) => e.stopPropagation()}>
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Mark as read"
                      className="p-2 hover:bg-surface-muted rounded-xl text-content-secondary hover:text-brand-primary transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    title="Delete alert log"
                    className="p-2 hover:bg-status-error/15 rounded-xl text-content-secondary hover:text-status-error transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-border-subtle">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-sm font-medium border border-border-subtle rounded-lg disabled:opacity-50 hover:bg-surface-muted"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-content-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm font-medium border border-border-subtle rounded-lg disabled:opacity-50 hover:bg-surface-muted"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
