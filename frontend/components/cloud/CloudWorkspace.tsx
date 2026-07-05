"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CloudFileManager, FileNode } from "./CloudFileManager";
import { HardDrive, Calendar, Database, Clock, Eye, Trash2, ShieldAlert, FileText } from "lucide-react";
import Image from "next/image";
import { useUser } from "@/lib/auth/useUser";
import { getQuickProfile, getAllFiles, engineApi } from "@/lib/engineApi";
import { X, Loader2, AlertTriangle, Layers } from "lucide-react";

interface BackendFileNode {
  id: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  folder?: string;
  path?: string;
  extension?: string;
}

export function CloudWorkspace({ role }: { role?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role: userRole } = useUser();
  const effectiveRole = (role ?? userRole ?? "").toLowerCase();
  const isAnalyst = effectiveRole === "data_analyst" || effectiveRole === "analyst" || effectiveRole === "admin";

  const [activeTab, setActiveTab] = useState<"explorer" | "history">("explorer");

  // File Telemetries for Upload Quota Limits
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const [nodes, setNodes] = useState<FileNode[]>([]);

  // Preview Modal state in workspace
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<{
    row_count: number;
    column_names: string[];
    missing_values_detected: boolean;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch files list for history display
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await getAllFiles();
        const parsed: FileNode[] = data.map((f: BackendFileNode) => ({
          id: f.id,
          name: f.filename,
          type: "file",
          size: f.file_size_bytes,
          modifiedAt: f.created_at,
          parentId: f.folder || "root",
          path: f.path || "",
          extension: f.extension || f.filename.split('.').pop() || ""
        }));
        setNodes(parsed);
      } catch (err) {
        console.error("Failed to fetch cloud history", err);
      }
    };
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter files list for history
  const historyFiles = nodes.filter((n) => {
    if (n.type !== "file") return false;
    if (isAnalyst) return true;
    const ageMs = Date.now() - new Date(n.modifiedAt).getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    return ageMs < fourteenDaysMs;
  });

  const handleDeleteHistoryItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    try {
      await engineApi.delete(`/cloud/files/${id}/`);
      setNodes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      alert("Failed to delete file.");
    }
  };

  const handleOpenPreview = async (fileNode: FileNode) => {
    setPreviewFile(fileNode);
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewMetadata(null);

    const isMock = fileNode.id.startsWith("file") || !fileNode.id.match(/^[0-9a-fA-F-]{36}$/);

    if (isMock) {
      setTimeout(() => {
        setPreviewMetadata({
          row_count: fileNode.id === "file3" ? 450 : 1200,
          column_names: fileNode.id === "file3"
            ? ["Property_ID", "London_Borough", "Average_Price", "Inventory_Count", "Last_Sold_Date"]
            : ["Transaction_ID", "Dubai_Area", "Property_Type", "Price_AED", "Size_SqFt", "Rooms", "Transaction_Date"],
          missing_values_detected: fileNode.id === "file3" ? true : false,
        });
        setIsPreviewLoading(false);
      }, 500);
    } else {
      try {
        const data = await getQuickProfile(fileNode.id);
        setPreviewMetadata(data);
      } catch {
        setPreviewError("Could not retrieve file schema profile.");
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  // Quota calculation (Strict 100MB for all users)
  const limitBytes = 100 * 1024 * 1024;
  const isQuotaReached = totalStorageBytes >= limitBytes;
  const percentage = Math.min((totalStorageBytes / limitBytes) * 100, 100);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-y-auto p-6 space-y-6 custom-scrollbar bg-surface-page/10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-border-subtle bg-surface-card p-0.5 shadow-lg">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src="/Cloud.png"
                  alt="SmartMove Cloud Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-logo font-bold text-content-strong">SmartMove Cloud</h1>
            <p className="text-xs text-content-secondary font-medium">Your secure, multi-tenant consumerized data lake</p>
          </div>
        </div>

        {/* Navigation button to Analytics Engine */}
        <button
          onClick={() => {
            const baseRolePath = pathname.startsWith("/analyst") ? "/analyst" : "/user";
            router.push(`${baseRolePath}/analytics-engine-ai`);
          }}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-content-on-brand bg-brand-primary rounded-xl shadow-lg hover:scale-105 transition-all"
        >
          <Database className="w-4 h-4" />
          Go to Analytics Engine
        </button>
      </div>

      {/* Storage Quota Bar */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card/60 backdrop-blur-sm p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className={isQuotaReached ? "text-status-warning" : "text-brand-primary"} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">Cloud Storage Quota</p>
              <p className="mt-0.5 text-sm font-bold text-content-strong">
                {formatBytes(totalStorageBytes)} of 100 MB used
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full">
            <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-border-subtle/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isQuotaReached ? "bg-status-warning animate-pulse" : "bg-gradient-to-r from-brand-primary to-brand-accent"
                  }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${isQuotaReached
              ? "bg-status-warning/15 text-status-warning border-status-warning/20 animate-pulse"
              : "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
            }`}>
            {formatBytes(Math.max(0, limitBytes - totalStorageBytes))} REMAINING
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border-subtle gap-4">
        <button
          onClick={() => setActiveTab("explorer")}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${activeTab === "explorer"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-content-muted hover:text-content-secondary"
            }`}
        >
          Workspace Explorer
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-1.5 ${activeTab === "history"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-content-muted hover:text-content-secondary"
            }`}
        >
          <Clock className="w-4 h-4" />
          Past Imports History
        </button>
      </div>

      {/* Tab content viewports */}
      {activeTab === "explorer" ? (
        <div className="h-[520px]">
          <CloudFileManager
            role={effectiveRole}
            onStorageSizeChange={setTotalStorageBytes}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-surface-card/60 backdrop-blur-sm p-6 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-content-strong">Import History Log</h2>
              <p className="text-xs text-content-secondary">Manage and preview your historical file imports</p>
            </div>
            {!isAnalyst && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning bg-status-warning/10 border border-status-warning/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                14-Day Expiration Active
              </span>
            )}
          </div>

          {historyFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-content-muted text-xs space-y-3">
              <ShieldAlert className="w-10 h-10 opacity-30 text-brand-primary" />
              <p>No active historical datasets found.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-page/35">
              <div className="grid grid-cols-12 gap-4 bg-surface-muted/65 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                <span className="col-span-5">File Name</span>
                <span className="col-span-3">File Size</span>
                <span className="col-span-2">Upload Date</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>

              <div className="divide-y divide-border-subtle bg-surface-card/40">
                {historyFiles.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3.5 text-xs text-content-secondary items-center hover:bg-surface-muted/20 transition-all"
                  >
                    <span className="col-span-5 truncate text-content-strong font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-content-muted leading-tight truncate">{file.path || "My Workspace"}</div>
                        <div className="truncate" title={file.name}>{file.name}</div>
                      </div>
                    </span>
                    <span className="col-span-3 font-mono">
                      {file.size ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "0.00 MB"}
                    </span>
                    <span className="col-span-2 text-content-muted font-mono">
                      {new Date(file.modifiedAt).toLocaleDateString()}
                    </span>
                    <span className="col-span-2 flex justify-end items-center gap-2">
                      <button
                        onClick={() => handleOpenPreview(file)}
                        title="Preview Schema"
                        className="p-1.5 hover:bg-brand-primary/10 rounded-lg text-brand-primary transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHistoryItem(file.id)}
                        title="Delete File"
                        className="p-1.5 hover:bg-status-error/15 rounded-lg text-content-secondary hover:text-status-error transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reusable column preview dialog */}
      {previewFile && (
        <div className="fixed inset-0 bg-surface-page/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-surface-muted/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-content-strong">{previewFile.name}</h3>
                  <p className="text-xs text-content-secondary">Column Preview & Quality Check</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-surface-muted rounded-full transition-all"
              >
                <X className="w-5 h-5 text-content-secondary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  <p className="text-xs text-content-secondary font-semibold">Running profiling...</p>
                </div>
              ) : previewError ? (
                <div className="flex items-center gap-3 border border-status-error/30 bg-status-error/5 p-4 rounded-xl text-status-error text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{previewError}</span>
                </div>
              ) : previewMetadata ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Rows</p>
                      <p className="text-lg font-bold text-content-strong mt-1 font-mono">{previewMetadata.row_count}</p>
                    </div>
                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Columns</p>
                      <p className="text-lg font-bold text-content-strong mt-1 font-mono">{previewMetadata.column_names.length}</p>
                    </div>
                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Imputation Needs</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${previewMetadata.missing_values_detected ? "bg-status-warning/10 text-status-warning" : "bg-status-success/10 text-status-success"
                        }`}>
                        {previewMetadata.missing_values_detected ? "Missing Data Detected" : "Optimal Schema"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-primary" />
                      Parsed Schema Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border-subtle rounded-xl p-3 bg-surface-muted/10 custom-scrollbar">
                      {previewMetadata.column_names.map((col, idx) => (
                        <div key={col} className="flex items-center justify-between p-2 rounded-lg bg-surface-card border border-border-subtle/50 text-xs text-content-secondary font-mono">
                          <span className="truncate" title={col}>{col}</span>
                          <span className="text-[10px] text-content-muted bg-surface-muted px-1.5 py-0.5 rounded uppercase">
                            {idx === 0 ? "ID" : idx === previewMetadata.column_names.length - 1 ? "Date" : "Feature"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface-muted/30 flex justify-end">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-5 py-2 text-xs font-bold text-content-strong border border-border-subtle rounded-xl hover:bg-surface-muted transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
