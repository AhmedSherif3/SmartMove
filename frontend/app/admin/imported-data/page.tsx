"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { dynamicUploadApi } from "@/lib/urls/dynamic-upload";
import { SmartDataImporter } from "@/components/upload/SmartDataImporter";
import { uploadFileToAzure } from "@/lib/azure-storage";
import { toast } from "react-hot-toast";

type UploadHistoryItem = {
  id: number | string;
  file_name?: string;
  status?: string;
  created_at?: string;
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

export default function AdminImportedDataPage() {
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await dynamicUploadApi.getHistory();
      const items = Array.isArray(data) ? data : data?.results || data?.history || [];
      setHistory(items);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (file: File, _data: Record<string, string | number>[], region: string) => {
    const loadingToast = toast.loading(`Initiating secure upload for ${file.name}...`);

    try {
      // Step 1: Request SAS Token
      const { sas_url, blob_name } = await dynamicUploadApi.generateSasToken(file.name, region);
      
      // Step 2: Upload directly to Azure
      toast.loading("Streaming data to cloud storage...", { id: loadingToast });
      await uploadFileToAzure(file, sas_url);

      // Step 3: Register upload and trigger processing
      toast.loading("Registering pipeline task...", { id: loadingToast });
      await dynamicUploadApi.registerUpload({
        file_name: file.name,
        region,
        blob_name,
        file_size_bytes: file.size,
        notify_users: notifyUsers,
      });

      toast.success("Upload successful! Processing started.", { id: loadingToast });
      setShowImporter(false);
      loadHistory(); // Refresh the table
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message, { id: loadingToast });
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const totals = {
      total: history.length,
      running: 0,
      failed: 0,
      success: 0,
    };

    history.forEach((item) => {
      const normalized = normalizeStatus(item.status);
      if (normalized === "running") totals.running += 1;
      if (normalized === "failed") totals.failed += 1;
      if (normalized === "success") totals.success += 1;
    });

    const latest = history[0];
    return { ...totals, latest };
  }, [history]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-logo font-bold text-content-strong">Imported Data</h1>
          <p className="mt-1 text-content-secondary">
            Monitor pipeline status and manage uploads across regions.
          </p>
        </div>
        <button
          onClick={() => setShowImporter(!showImporter)}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
            showImporter 
              ? "bg-ui-surface-muted text-content-secondary hover:bg-ui-surface-muted/80" 
              : "bg-brand-primary text-content-on-brand shadow-lg shadow-brand-primary/20 hover:scale-[1.02]"
          }`}
        >
          {showImporter ? (
            <><X size={18} /> Close Importer</>
          ) : (
            <><Plus size={18} /> New Data Import</>
          )}
        </button>
      </div>

      {/* Embedded SmartDataImporter (PowerBI Staging) */}
      {showImporter && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-ui-surface-card rounded-2xl p-8 border border-brand-primary/30 shadow-2xl bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent">
            <SmartDataImporter onConfirm={handleConfirm} />
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 w-full">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="h-4 w-4 rounded border-border-subtle text-brand-primary focus:ring-brand-primary accent-brand-primary"
                />
                <span className="text-sm font-medium text-content-secondary group-hover:text-content-strong transition-colors">
                  Alert users that dashboards have been updated
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Imports" value={String(stats.total)} />
        <StatCard title="Running Jobs" value={String(stats.running)} />
        <StatCard title="Failed Jobs" value={String(stats.failed)} />
        <StatCard title="Successful Jobs" value={String(stats.success)} />
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-content-strong">Latest Import</h2>
        <p className="mt-2 text-sm text-content-secondary">
          {stats.latest?.file_name
            ? `${stats.latest.file_name} (ID ${stats.latest.id})`
            : "No imports yet"}
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-strong">Recent Uploads</h2>
          <Link href="/admin/imported-data/upload" className="text-sm font-semibold text-brand-primary hover:underline">
            Manage Uploads
          </Link>
        </div>
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
                            href={`/admin/imported-data/upload`}
                            className="text-sm font-semibold text-brand-primary hover:underline"
                          >
                            View Details
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

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-glow rounded-xl border border-border-subtle bg-surface-card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-content-muted">{title}</p>
      <p className="mt-3 text-2xl font-logo font-extrabold text-content-strong">{value}</p>
    </div>
  );
}
