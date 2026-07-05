"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Database,
  ArrowUpFromLine,
  ShieldCheck,
  FileText,
  Clock,
  Plus,
  Trash2,
  Eye,
  Calendar,
  X,
  FileSpreadsheet,
  Layers,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import { checkAnalyzeStatus, analyzeWorkspace, getQuickProfile, getAllFiles, getAnalysisRuns, deleteAnalysisRun } from "@/lib/engineApi";
import { DynamicAIDashboard, DashboardJSON } from "@/components/cloud/DynamicAIDashboard";
import { useUser } from "@/lib/auth/useUser";
import { FileNode } from "../cloud/CloudFileManager";

interface ApiWorkspaceItem {
  id: string;
  name: string;
  created_at: string;
  status: "completed" | "processing" | "failed";
  files: string[];
}

interface BackendFileNode {
  id: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  folder?: string;
  path?: string;
  extension?: string;
}

interface BackendWorkspaceItem {
  id: string;
  name: string;
  created_at: string;
  status: "completed" | "processing" | "failed";
  files: string[];
}

type PipelineStep = {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: "complete" | "active" | "pending" | "failed";
};

const pipelineBlueprint: PipelineStep[] = [
  { key: "upload", label: "Upload", icon: <ArrowUpFromLine size={18} />, status: "complete" },
  { key: "validate", label: "Validate", icon: <ShieldCheck size={18} />, status: "pending" },
  { key: "clean", label: "Clean", icon: <Sparkles size={18} />, status: "pending" },
  { key: "store", label: "Store", icon: <Database size={18} />, status: "pending" },
  { key: "analyse", label: "Analyse", icon: <FileText size={18} />, status: "pending" },
];

function AnalyticsEnginePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { role: userRole } = useUser();

  const workspaceIdParam = searchParams.get("workspace_id");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(workspaceIdParam);

  const [history, setHistory] = useState<ApiWorkspaceItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Active Ingest Telemetry
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(pipelineBlueprint);
  const [isPolling, setIsPolling] = useState(false);

  // New Analysis Mode selector state
  const [isNewAnalysisMode, setIsNewAnalysisMode] = useState(false);
  const [virtualFiles, setVirtualFiles] = useState<FileNode[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Preview Modal state
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<{
    row_count: number;
    column_names: string[];
    missing_values_detected: boolean;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Dynamic Dashboard Cache
  const [cachedDashboards, setCachedDashboards] = useState<Record<string, DashboardJSON>>({});

  const [dashboardData, setDashboardData] = useState<DashboardJSON | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const isAnalyst = userRole === "analyst" || userRole === "admin";

  // Sync state with URL parameter
  useEffect(() => {
    setActiveWorkspaceId(workspaceIdParam);
  }, [workspaceIdParam]);

  // Load files from Cloud Workspace and analysis history
  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch real files from backend
      try {
        const data = await getAllFiles();
        
        // Map backend UserFile format to UI FileNode format
        const parsed: FileNode[] = data.map((f: BackendFileNode) => ({
          id: f.id,
          name: f.filename,
          type: "file",
          size: f.file_size_bytes,
          modifiedAt: f.created_at,
          path: f.path || "",
          extension: f.extension || f.filename.split('.').pop() || ""
        }));
        
        // Filter applying 14-day rule if regular user
        const validFiles = parsed.filter((n) => {
          if (isAnalyst) return true;
          const ageMs = Date.now() - new Date(n.modifiedAt).getTime();
          return ageMs < 14 * 24 * 60 * 60 * 1000;
        });
        setVirtualFiles(validFiles);
      } catch (err) {
        console.error("Failed to fetch cloud workspace files:", err);
      }

      // 2. Load History Runs
      setIsHistoryLoading(true);
      try {
        const runsData = await getAnalysisRuns();
        const runsList: ApiWorkspaceItem[] = runsData.map((r: BackendWorkspaceItem) => ({
          id: r.id,
          name: r.name,
          created_at: r.created_at,
          status: r.status,
          files: r.files
        }));

        // Apply 14-day rule to history runs if not an analyst
        const filteredRuns = runsList.filter((run) => {
          if (isAnalyst) return true;
          const ageMs = Date.now() - new Date(run.created_at).getTime();
          return ageMs < 14 * 24 * 60 * 60 * 1000;
        });

        setHistory(filteredRuns);
      } catch (err) {
        console.error("Failed to load history runs:", err);
        setHistory([]);
      }
      setIsHistoryLoading(false);
    };

    loadData();
  }, [activeWorkspaceId, isNewAnalysisMode, userRole, isAnalyst]);

  // Handle active workspace dashboard fetching and polling
  useEffect(() => {
    if (!activeWorkspaceId) {
      setDashboardData(null);
      setIsPolling(false);
      return;
    }

    // Check cache
    if (cachedDashboards[activeWorkspaceId]) {
      setDashboardData(cachedDashboards[activeWorkspaceId]);
      setIsPolling(false);
      setIsDashboardLoading(false);
      return;
    }

    setIsPolling(true);
    setIsDashboardLoading(true);

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let currentStep = 1;

    const simulatePipeline = () => {
      setPipelineSteps((prev) =>
        prev.map((step, idx) => {
          if (idx < currentStep) return { ...step, status: "complete" as const };
          if (idx === currentStep) return { ...step, status: "active" as const };
          return { ...step, status: "pending" as const };
        })
      );
      if (currentStep < 4) currentStep += 1;
    };

    const poll = async () => {
      try {
        simulatePipeline();
        const data = await checkAnalyzeStatus(activeWorkspaceId);

        if (data.status === "completed" && data.dashboard_data) {
          setPipelineSteps((prev) => prev.map((s) => ({ ...s, status: "complete" as const })));

          // Dashboard data is returned directly from Postgres
          setCachedDashboards((prev) => ({ ...prev, [activeWorkspaceId]: data.dashboard_data }));
          setDashboardData(data.dashboard_data);

          setIsPolling(false);
          setIsDashboardLoading(false);
          if (pollInterval) clearInterval(pollInterval);
        } else if (data.status === "failed") {
          setPipelineSteps((prev) =>
            prev.map((s, i) => (i === currentStep ? { ...s, status: "failed" as const } : s))
          );
          setIsPolling(false);
          setIsDashboardLoading(false);
          if (pollInterval) clearInterval(pollInterval);
          alert("Ingestion task failed. Please check your data schemas.");
        }
      } catch (err) {
        setPipelineSteps((prev) =>
          prev.map((s, i) => (i === currentStep ? { ...s, status: "failed" as const } : s))
        );
        setIsPolling(false);
        setIsDashboardLoading(false);
        if (pollInterval) clearInterval(pollInterval);
        console.error("Failed to check analyze status", err);
      }
    };

    poll();
    pollInterval = setInterval(poll, 3000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeWorkspaceId, cachedDashboards]);

  const handleSelectHistoryRun = (runId: string) => {
    setIsNewAnalysisMode(false);
    if (!cachedDashboards[runId]) {
      setIsDashboardLoading(true);
    }
    router.push(`?workspace_id=${runId}`);
  };

  const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this historical dashboard run?")) return;

    try {
      await deleteAnalysisRun(runId);
      setHistory((prev) => prev.filter((r) => r.id !== runId));
      if (activeWorkspaceId === runId) {
        setDashboardData(null);
        setActiveWorkspaceId(null);
        router.push("?");
      }
    } catch {
    }
  };

  const handleDeleteAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete ALL historical analysis runs?")) return;
    try {
      await deleteAnalysisRun('all');
      setHistory([]);
      if (activeWorkspaceId && history.find(h => h.id === activeWorkspaceId)) {
        setActiveWorkspaceId(null);
        setDashboardData(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete all history.");
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size < 5) {
          next.add(id);
        } else {
          alert("Maximum 5 files can be analyzed together.");
        }
      }
      return next;
    });
  };

  const handleOpenPreview = async (fileNode: FileNode) => {
    setPreviewFile(fileNode);
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewMetadata(null);

    try {
      const data = await getQuickProfile(fileNode.id);
      setPreviewMetadata(data);
    } catch {
      setPreviewError("Could not retrieve file profile.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (selectedFileIds.size === 0) {
      alert("Please select at least one file to analyze.");
      return;
    }

    try {
      setIsPolling(true);
      setPipelineSteps(pipelineBlueprint.map(s => s.key === "upload" ? { ...s, status: "complete" } : s));

      const selectedFilesObj = virtualFiles.filter((f) => selectedFileIds.has(f.id));
      const fileIds = selectedFilesObj.map(f => f.id);

      let wsId = "run-" + Math.random().toString(36).substr(2, 9);
      try {
        const { workspace_id } = await analyzeWorkspace(fileIds);
        wsId = workspace_id;
      } catch {
        console.warn("Backend analysis API not fully configured. Starting simulated pipeline.");
      }

      setSelectedFileIds(new Set());
      setIsNewAnalysisMode(false);
      router.push(`?workspace_id=${wsId}`);

    } catch (err) {
      console.error(err);
      setIsPolling(false);
      alert("Analysis trigger failed.");
    }
  };

  const handleNavigateToCloud = () => {
    const baseRolePath = pathname.startsWith("/analyst") ? "/analyst" : "/user";
    router.push(`${baseRolePath}/cloud`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-border-subtle bg-surface-card p-0.5 shadow-lg">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src="/Analytics.png"
                  alt="Analytics Pro Engine Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-logo font-bold text-content-strong">Analytics Pro Engine</h1>
            <p className="text-xs text-content-secondary font-medium">
              Run predictive AI pipelines and view dynamic intelligence reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsNewAnalysisMode(!isNewAnalysisMode);
              setDashboardData(null);
              setActiveWorkspaceId(null);
              router.push("?");
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md ${isNewAnalysisMode
                ? "bg-surface-card text-content-strong border border-border-subtle hover:bg-surface-muted"
                : "bg-brand-primary text-content-on-brand hover:opacity-90 shadow-brand-primary/20"
              }`}
          >
            {isNewAnalysisMode ? <Clock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isNewAnalysisMode ? "View Saved Runs" : "New Analysis"}
          </button>
        </div>
      </div>

      {/* Main Workspace Viewports */}
      {isPolling ? (
        // Ingestion Pipeline progress view
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-lg flex flex-col justify-center min-h-[400px]">
          <div className="max-w-4xl mx-auto w-full text-center space-y-8">
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 animate-spin text-brand-accent mx-auto mb-2" />
              <h2 className="text-2xl font-logo font-bold text-content-strong">Sparking Forecasting Models...</h2>
              <p className="text-sm text-content-secondary max-w-lg mx-auto">
                Running data cleaning, outlier imputation, and predictive consensus models.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-left pt-6">
              {pipelineSteps.map((step) => {
                const isComplete = step.status === "complete";
                const isActive = step.status === "active";
                const isFailed = step.status === "failed";

                return (
                  <div
                    key={step.key}
                    className={`relative overflow-hidden rounded-xl border p-4 transition-all ${isComplete
                        ? "border-status-success/30 bg-status-success/5 text-status-success"
                        : isActive
                          ? "border-brand-accent/40 bg-brand-accent/5 text-brand-accent shadow-sm"
                          : isFailed
                            ? "border-status-error/30 bg-status-error/5 text-status-error"
                            : "border-border-subtle bg-surface-muted text-content-muted"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{step.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wider">{step.label}</span>
                      </div>
                      {isComplete && <CheckCircle2 size={14} className="text-status-success" />}
                      {isActive && <Loader2 size={14} className="animate-spin text-brand-accent" />}
                    </div>
                    <p className="mt-2 text-[10px] uppercase font-bold tracking-widest opacity-60">
                      {isComplete ? "Completed" : isActive ? "Active" : isFailed ? "Failed" : "Pending"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : isNewAnalysisMode ? (
        // Select branch files from workspace & analyze
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-lg font-bold text-content-strong">Configure New Dataset Analysis</h2>
              <p className="text-xs text-content-secondary mt-0.5">Select up to 5 datasets from your cloud branch to merge and forecast</p>
            </div>
            <button
              onClick={() => setIsNewAnalysisMode(false)}
              className="p-1.5 hover:bg-surface-muted rounded-full"
            >
              <X className="w-5 h-5 text-content-secondary" />
            </button>
          </div>

          {virtualFiles.length === 0 ? (
            <div className="text-center py-12 text-content-muted text-xs space-y-4">
              <p>No uploaded datasets available to analyze. Please upload files on the cloud workspace first.</p>
              <button
                onClick={handleNavigateToCloud}
                className="px-4 py-2 bg-brand-primary text-content-on-brand text-xs font-bold rounded-xl shadow-md"
              >
                Go to Cloud Explorer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {virtualFiles.map((file) => {
                  const isSelected = selectedFileIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleToggleSelectFile(file.id)}
                      className={`relative flex items-center justify-between p-4 border rounded-xl bg-surface-page/50 hover:bg-surface-page hover:shadow-md cursor-pointer transition-all ${isSelected
                          ? "border-brand-primary ring-1 ring-brand-primary bg-brand-primary/5"
                          : "border-border-subtle"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className={`w-8 h-8 ${isSelected ? "text-brand-primary" : "text-brand-primary/60"}`} />
                        <div className="max-w-[160px] flex flex-col justify-center">
                          <p className="text-[9px] text-content-muted leading-tight truncate uppercase tracking-wider mb-0.5" title={file.path}>
                            {file.path || "My Workspace"}
                          </p>
                          <p className="text-xs font-bold text-content-strong leading-tight truncate" title={file.name}>{file.name}</p>
                          <p className="text-[10px] text-content-muted mt-0.5">{(file.size || 0) ? (file.size! / 1024 / 1024).toFixed(2) + " MB" : ""}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenPreview(file)}
                          title="Preview Schema"
                          className="p-1.5 hover:bg-surface-muted rounded-lg text-content-secondary hover:text-brand-accent transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? "border-brand-primary bg-brand-primary text-content-on-brand" : "border-border-subtle"
                          }`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-content-on-brand rounded-full" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button
                  onClick={() => setIsNewAnalysisMode(false)}
                  className="px-5 py-2 text-xs font-bold text-content-strong border border-border-subtle rounded-xl hover:bg-surface-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartAnalysis}
                  disabled={selectedFileIds.size === 0}
                  className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-content-on-brand bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl hover:opacity-90 shadow-md shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze selected files ({selectedFileIds.size})
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isDashboardLoading ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-8 animate-pulse space-y-6">
          <div className="h-6 bg-surface-muted w-1/4 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-surface-muted rounded-xl" />
            <div className="h-20 bg-surface-muted rounded-xl" />
            <div className="h-20 bg-surface-muted rounded-xl" />
          </div>
          <div className="h-40 bg-surface-muted rounded-xl" />
        </div>
      ) : dashboardData ? (
        // Rendering Dynamic AI Dashboard here
        <div className="border border-border-subtle rounded-2xl bg-surface-card overflow-hidden shadow-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
              <h2 className="text-lg font-bold text-content-strong">Synthesized Intelligence Viewer</h2>
            </div>
            <button
              onClick={() => {
                setDashboardData(null);
                setActiveWorkspaceId(null);
                router.push("?");
              }}
              className="text-xs font-bold text-content-muted hover:text-content-strong hover:bg-surface-muted px-3 py-1.5 rounded-lg border border-border-subtle transition-colors"
            >
              Clear View
            </button>
          </div>
          <DynamicAIDashboard
            data={dashboardData}
            workspaceId={activeWorkspaceId || undefined}
            onClose={() => {
              setDashboardData(null);
              setActiveWorkspaceId(null);
              router.push("?");
            }}
          />
        </div>
      ) : (
        // Welcome and CTA point to starting new prediction
        <div className="rounded-2xl border border-border-subtle bg-surface-card/60 backdrop-blur-sm p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
              <h2 className="text-lg font-logo font-bold text-content-strong">
                Intelligence Dashboard Deck
              </h2>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed">
              Archived outputs and forecasting diagnostics. Choose from recent analysis runs below or click **&quot;New Analysis&quot;** to process custom dataset forecasts.
            </p>
          </div>

          <button
            onClick={() => setIsNewAnalysisMode(true)}
            className="shrink-0 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent px-5 py-3 text-xs font-bold text-content-on-brand shadow-lg hover:scale-105 transition-all flex items-center gap-2 border border-brand-primary/30"
          >
            <Sparkles size={14} />
            Configure New Analysis
          </button>
        </div>
      )}

      {/* Historical Upload Runs Log */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-primary" />
            <div>
              <h2 className="text-lg font-bold text-content-strong font-logo">Recent Analysis Runs</h2>
              <p className="text-xs text-content-secondary mt-0.5">Click any historical run to load its AI dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAnalyst && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning bg-status-warning/10 border border-status-warning/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                14-Day retention active
              </span>
            )}

            <span className="rounded-full border border-border-subtle bg-surface-muted px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-content-muted">
              Telemetry Archive
            </span>
          </div>
        </div>

        {isHistoryLoading ? (
          <div className="flex justify-center items-center py-12 text-brand-primary gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-semibold text-content-secondary">Accessing telemetry repository...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-content-muted text-xs">
            No historical analysis workspaces found. Upload data and configure analysis to generate telemetry.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle">
            <div className="grid grid-cols-12 gap-4 bg-surface-muted px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-content-muted">
              <span className="col-span-5">Analysis Run</span>
              <span className="col-span-4">Associated Datasets</span>
              <span className="col-span-2">Processed Date</span>
              <span className="col-span-1 text-right">Delete</span>
            </div>

            <div className="divide-y divide-border-subtle bg-surface-page/20">
              {history.map((run) => (
                <div
                  key={run.id}
                  onClick={() => handleSelectHistoryRun(run.id)}
                  className={`grid grid-cols-12 gap-4 px-4 py-3.5 text-xs text-content-secondary items-center cursor-pointer transition-all hover:bg-brand-primary/5 hover:translate-x-0.5 ${activeWorkspaceId === run.id ? "bg-brand-primary/10 font-bold" : ""
                    }`}
                >
                  <span className="col-span-5 truncate text-content-strong font-semibold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    {run.name}
                  </span>
                  <span className="col-span-4 truncate text-content-muted text-[11px]">
                    {run.files.join(", ")}
                  </span>
                  <span className="col-span-2 text-content-muted">
                    {new Date(run.created_at).toLocaleDateString()}
                  </span>
                  <span className="col-span-1 flex justify-end">
                    <button
                      onClick={(e) => handleDeleteRun(e, run.id)}
                      className="p-1 hover:bg-status-error/15 rounded text-content-secondary hover:text-status-error"
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

      {/* Schema Profile Modal */}
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

export default function AnalyticsEnginePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-brand-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold text-content-secondary">Accessing Analytics Telemetry...</p>
      </div>
    }>
      <AnalyticsEnginePageContent />
    </Suspense>
  );
}
