"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationItem,
} from "@/lib/notificationApi";
import { getPusherClient } from "@/lib/pusher";

interface NotificationContextValue {
  unreadCount: number;
  recentNotifications: NotificationItem[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotif: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  recentNotifications: [],
  markRead: () => {},
  markAllRead: () => {},
  deleteNotif: () => {},
  refreshNotifications: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pusherRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // ── Fetch initial data ─────────────────────────────────
  const loadInitial = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        fetchUnreadCount(),
        fetchNotifications({ page: 1 }),
      ]);
      setUnreadCount(countRes);
      setRecentNotifications(
        Array.isArray(listRes) ? listRes.slice(0, 5) : (listRes.results || []).slice(0, 5)
      );
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadInitial();
    });
  }, [loadInitial]);

  // ── Pusher connection ───────────────────────────────
  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
      return null;
    };

    const token = getCookie("access_token");
    let userId = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.user_id;
      } catch (e) {
        console.error("Could not parse token");
      }
    }

    if (!userId) return;

    const pusher = getPusherClient();
    pusherRef.current = pusher;

    const channelName = `private-notifications-${userId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("notification-event", (data: any) => {
      if (data.type === "new_notification") {
        const notif: NotificationItem = data.notification;
        setRecentNotifications((prev) => [notif, ...prev].slice(0, 5));
        setUnreadCount((prev) => prev + 1);

        // Show toast
        toast(notif.title, {
          icon: notif.priority === "error" ? "🔴"
              : notif.priority === "warning" ? "🟡"
              : notif.priority === "success" ? "🟢"
              : "🔵",
          duration: 5000,
        });
      }

      if (data.type === "unread_count_update") {
        setUnreadCount(data.unread_count);
      }

      if (data.type === "force_disconnect") {
        // Handle force disconnect / log out
        toast.error("Your account has been updated or deactivated. Logging out...");
        setTimeout(() => {
          document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
          window.location.href = "/authentication/login";
        }, 2000);
      }
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(channelName);
        pusherRef.current.disconnect();
      }
    };
  }, []);

  // ── Action handlers ────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    try {
      const wasUnread = recentNotifications.find((n) => n.id === id && !n.is_read);
      await deleteNotification(id);
      setRecentNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, [recentNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        markRead,
        markAllRead,
        deleteNotif,
        refreshNotifications: loadInitial,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
