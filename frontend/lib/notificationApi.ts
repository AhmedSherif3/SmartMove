import { engineApi } from "@/lib/engineApi";

// ── TypeScript Types ────────────────────────────────────────────────────

export type NotificationType = "system" | "data" | "ai" | "security" | "admin" | "subscription" | "report" | "cloud";
export type NotificationPriority = "info" | "success" | "warning" | "error";

export interface NotificationAction {
  label: string;
  url: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  icon: string;
  title: string;
  message: string;
  link: string;
  actions: NotificationAction[];
  is_read: boolean;
  source_app: string;
  created_at: string;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export interface BroadcastPayload {
  title: string;
  message: string;
  priority?: NotificationPriority;
  link?: string;
  target_role?: string;
  target_region?: string;
}

// ── REST API Functions ──────────────────────────────────────────────────

export async function fetchNotifications(params?: {
  is_read?: string;
  type?: string;
  page?: number;
  search?: string;
  ordering?: string;
}): Promise<NotificationListResponse> {
  const query = new URLSearchParams();
  if (params?.is_read !== undefined) query.set("is_read", params.is_read);
  if (params?.type) query.set("type", params.type);
  if (params?.page) query.set("page", String(params.page));
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);
  
  const { data } = await engineApi.get(`/notifications/?${query.toString()}`);
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await engineApi.get("/notifications/unread-count/");
  return data.unread_count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await engineApi.patch(`/notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await engineApi.post("/notifications/mark-all-read/");
}

export async function deleteNotification(id: string): Promise<void> {
  await engineApi.delete(`/notifications/${id}/`);
}

export async function broadcastNotification(
  payload: BroadcastPayload
): Promise<{ sent_to: number }> {
  const { data } = await engineApi.post("/notifications/broadcast/", payload);
  return data;
}
