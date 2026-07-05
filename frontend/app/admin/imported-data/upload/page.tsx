"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UploadCloud } from "lucide-react";
import { dynamicUploadApi } from "@/lib/urls/dynamic-upload";

type UploadHistoryItem = {
  id: number | string;
  file_name?: string;
  status?: string;
};

const statusMap = {
  success: {
    label: "Success",
    className: "bg-status-success/15 text-status-success border border-status-success/20",
  },
  failed: {
    label: "Failed",
    className: "bg-status-error/15 text-status-error border border-status-error/20",
  },
  running: {
    label: "Running",
    className: "bg-status-warning/15 text-status-warning border border-status-warning/20",
  },
  pending: {
    label: "Pending",
    className: "bg-surface-muted text-content-muted border border-border-subtle",
  },
};

function normalizeStatus(raw?: string) {
  const value = raw?.toLowerCase() || "";
  if (["done", "success", "completed"].includes(value)) return "success";
  if (["failed", "error"].includes(value)) return "failed";
  if (["processing", "running"].includes(value)) return "running";
  if (["pending", "queued"].includes(value)) return "pending";
  return "pending";
}

export default function AdminImportedDataUploadPage() {
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const data = await dynamicUploadApi.getHistory();
        const items = Array.isArray(data) ? data : data?.results || data?.history || [];
        if (isMounted) {
          setHistory(items);
        }
      } catch {
        if (isMounted) {
          setHistory([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-logo font-bold text-content-strong">Imported Data</h1>
        <p className="mt-1 text-content-secondary">Upload files or connect cloud sources.</p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 text-sm font-semibold text-content-on-brand"
        >
          <UploadCloud size={18} />
          Upload File
        </button>
      </div>

      <section>
        <h2 className="mt-8 text-sm font-semibold text-content-strong">Import from Cloud</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-content-on-brand">
              G
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-content-strong">Google Drive</p>
              <p className="text-sm text-status-success">Connected</p>
            </div>
            <button className="text-sm font-semibold text-brand-primary hover:underline">Browse Files</button>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent text-content-on-brand">
              O
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-content-strong">Office 365</p>
              <p className="text-sm text-content-secondary">Connect to import files</p>
            </div>
            <button
              className="cursor-not-allowed rounded-lg bg-surface-muted px-3 py-1 text-sm text-content-secondary opacity-60"
              title="Coming soon"
            >
              Connect
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mt-8 text-sm font-semibold text-content-strong">Recent Uploads</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
          <table className="w-full text-left text-sm text-content-secondary">
            <thead className="bg-surface-muted text-[11px] font-bold uppercase tracking-widest text-content-muted">
              <tr>
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-3 w-32 rounded bg-surface-muted/80" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-16 rounded bg-surface-muted/80" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-20 rounded-full bg-surface-muted/80" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3 w-20 rounded bg-surface-muted/80" />
                    </td>
                  </tr>
                ))}

              {!isLoading && history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-content-muted">
                    No uploads yet
                  </td>
                </tr>
              )}

              {!isLoading &&
                history.map((item) => {
                  const normalized = normalizeStatus(item.status);
                  const statusConfig = statusMap[normalized];
                  const fileName = item.file_name || "Untitled Upload";

                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-content-primary">{fileName}</td>
                      <td className="px-6 py-4 text-content-secondary">{item.id}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            statusConfig.className
                          }`}
                        >
                          {normalized === "running" && <Loader2 size={12} className="animate-spin" />}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {normalized === "success" ? (
                          <Link
                            href={`/user/data-upload/results/${item.id}`}
                            className="text-sm font-semibold text-brand-primary hover:underline"
                          >
                            View Results
                          </Link>
                        ) : (
                          <span className="text-content-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
