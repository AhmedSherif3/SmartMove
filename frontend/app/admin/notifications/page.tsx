"use client";

import React, { useState } from "react";
import { Send, Users, Globe2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { broadcastNotification, type NotificationPriority } from "@/lib/notificationApi";
import NotificationHub from "@/components/notifications/NotificationHub";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<NotificationPriority>("info");
  const [targetRole, setTargetRole] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [link, setLink] = useState("");
  
  const [previewMode, setPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Title and message are required.");
      return;
    }
    setPreviewMode(true);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await broadcastNotification({
        title,
        message,
        priority,
        target_role: targetRole,
        target_region: targetRegion,
        link: link || undefined,
      });
      toast.success(`Broadcast sent to ${res.sent_to} users successfully!`);
      // Reset form
      setTitle("");
      setMessage("");
      setPriority("info");
      setTargetRole("");
      setTargetRegion("");
      setLink("");
      setPreviewMode(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to send broadcast.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Broadcast Composer Section */}
      <div className="max-w-4xl mx-auto bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border-subtle pb-4 mb-6">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Send className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-content-strong">Broadcast a Notification</h2>
            <p className="text-xs text-content-secondary">Send alerts, updates, or maintenance notices to your users</p>
          </div>
        </div>

        {!previewMode ? (
          <form onSubmit={handlePreview} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-strong">Notification Title <span className="text-status-error">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance"
                  className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-shadow"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-strong">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                  className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-shadow"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="error">Critical Error (Red)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-content-strong">Message Body <span className="text-status-error">*</span></label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Details about the update..."
                className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-shadow resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-strong flex items-center gap-1">
                  <Users className="w-3 h-3" /> Target Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="USER">Standard User</option>
                  <option value="DATA_ANALYST">Data Analyst</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-strong flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> Target Region
                </label>
                <select
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value)}
                  className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm outline-none"
                >
                  <option value="">All Regions</option>
                  <option value="egypt">Egypt</option>
                  <option value="dubai">Dubai</option>
                  <option value="england">England</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-strong">Action Link (Optional)</label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="e.g. /market-trends"
                  className="w-full bg-surface-muted border border-border-subtle rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-primary/90 transition-colors"
              >
                Preview Broadcast
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 p-4 bg-status-warning/10 border border-status-warning/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-content-strong">Review your broadcast</p>
                <p className="text-xs text-content-secondary mt-1">
                  This notification will be sent immediately to all users matching: 
                  <strong className="text-content-strong mx-1">{targetRole || "All Roles"}</strong>
                  in 
                  <strong className="text-content-strong mx-1">{targetRegion || "All Regions"}</strong>.
                </p>
              </div>
            </div>

            <div className="p-5 border border-brand-primary/20 bg-surface-card rounded-2xl shadow-sm relative">
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-surface-card border border-border-subtle text-[10px] font-bold text-brand-primary rounded uppercase tracking-wider">
                Preview Appearance
              </span>
              <div className="flex gap-3">
                <div className={`mt-1 shrink-0 ${
                  priority === "success" ? "text-status-success" :
                  priority === "warning" ? "text-status-warning" :
                  priority === "error" ? "text-status-error" : "text-brand-primary"
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-content-strong">{title}</h4>
                  <p className="text-xs text-content-secondary mt-1">{message}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-6 py-2 border border-border-subtle text-content-strong text-sm font-bold rounded-xl hover:bg-surface-muted transition-colors"
                disabled={isSending}
              >
                Edit Form
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white text-sm font-bold rounded-xl hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
              >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle my-8" />

      {/* Admin's Own Notification Feed */}
      <div>
         <h2 className="text-2xl font-logo font-bold text-content-strong text-center mb-6">Your Personal Notifications</h2>
         <NotificationHub />
      </div>
    </div>
  );
}
