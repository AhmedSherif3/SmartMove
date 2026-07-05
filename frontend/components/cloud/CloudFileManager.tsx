"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FileSpreadsheet,
  ChevronRight,
  HardDrive,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Search,
  X,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Loader2,
  Info,
  Copy
} from "lucide-react";
import { DirectUploadPipeline } from "./DirectUploadPipeline";
import { getQuickProfile, engineApi } from "@/lib/engineApi";

export type FileNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number; // bytes
  modifiedAt: string;
  parentId: string | null;
  minioKey?: string;
  extension?: string;
  path?: string;
};

export function CloudFileManager({
  role,
  onFilesCountChange,
  onStorageSizeChange,
}: {
  role?: string;
  onFilesCountChange?: (count: number) => void;
  onStorageSizeChange?: (bytes: number) => void;
}) {
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([{ id: "root", name: "My Workspace" }]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Actions states
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Context Menu & Properties
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [propertiesNode, setPropertiesNode] = useState<FileNode | null>(null);

  // Preview Modal states
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<{
    row_count: number;
    column_names: string[];
    missing_values_detected: boolean;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isAnalyst = role === "analyst" || role === "admin" || role === "data_analyst" || role === "DATA_ANALYST";

  const fetchWorkspace = async (folderId: string) => {
    try {
      const url = folderId === "root" ? "/cloud/workspace/" : `/cloud/workspace/${folderId}/`;
      const { data } = await engineApi.get(url);
      
      const parsedFolders: FileNode[] = data.folders.map((f: { id: string; name: string; created_at?: string; parent?: string | null }) => ({
        id: f.id,
        name: f.name,
        type: "folder",
        modifiedAt: f.created_at || new Date().toISOString(),
        parentId: f.parent || "root"
      }));

      const parsedFiles: FileNode[] = data.files.map((f: { id: string; filename: string; file_size_bytes: number; created_at?: string; folder?: string | null; minio_object_key: string; extension: string }) => ({
        id: f.id,
        name: f.filename,
        type: "file",
        size: f.file_size_bytes,
        modifiedAt: f.created_at || new Date().toISOString(),
        parentId: f.folder || "root",
        minioKey: f.minio_object_key,
        extension: f.extension
      }));

      setNodes([...parsedFolders, ...parsedFiles]);
      if (data.breadcrumbs && data.breadcrumbs.length > 0) {
        setBreadcrumbs([{ id: "root", name: "My Workspace" }, ...data.breadcrumbs]);
      } else {
        setBreadcrumbs([{ id: "root", name: "My Workspace" }]);
      }
    } catch (err) {
      console.error("Error fetching workspace", err);
    }
  };

  useEffect(() => {
    fetchWorkspace(currentFolderId);
    
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [currentFolderId]);

  // Enforce 14-day rule: filter out items older than 14 days if not an analyst
  const filteredNodes = nodes.filter((node) => {
    if (isAnalyst) return true;
    if (node.type === "folder") return true;

    const ageMs = Date.now() - new Date(node.modifiedAt).getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    return ageMs < fourteenDaysMs;
  });

  const activeFolderId = currentFolderId;

  // Get current folder contents, matching search query if typed
  const currentItems = filteredNodes.filter((n) => {
    if (searchQuery.trim() === "") return true;
    return n.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filesCount = filteredNodes.filter((n) => n.type === "file").length;
  const totalStorageBytes = filteredNodes.filter((n) => n.type === "file").reduce((acc, curr) => acc + (curr.size || 0), 0);
  const limitBytes = 100 * 1024 * 1024; // 100 MB for all users
  const remainingStorageBytes = Math.max(0, limitBytes - totalStorageBytes);

  // Sync files count and storage size with parent
  useEffect(() => {
    if (onFilesCountChange) {
      onFilesCountChange(filesCount);
    }
  }, [filesCount, onFilesCountChange]);

  useEffect(() => {
    if (onStorageSizeChange) {
      onStorageSizeChange(totalStorageBytes);
    }
  }, [totalStorageBytes, onStorageSizeChange]);

  const handleNavigate = (folderId: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
    setIsCreatingFolder(false);
    setEditingNodeId(null);
  };

  const onUploadSuccess = () => {
    fetchWorkspace(currentFolderId);
    setIsUploading(false);
  };

  const handleToggleUpload = () => {
    if (totalStorageBytes >= limitBytes) {
      alert(`Storage quota reached! You have used up your maximum allowance of 100 MB. You must delete some old files to free up space before you can upload any more datasets.`);
      return;
    }
    setIsUploading(!isUploading);
    setIsCreatingFolder(false);
  };

  // VFS Actions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await engineApi.post("/cloud/folders/", {
        name: newFolderName.trim(),
        parent: activeFolderId === "root" ? null : activeFolderId
      });
      setNewFolderName("");
      setIsCreatingFolder(false);
      fetchWorkspace(activeFolderId);
    } catch {
      alert("Failed to create folder");
    }
  };

  const handleStartRename = (node: FileNode) => {
    setEditingNodeId(node.id);
    setEditName(node.name);
  };

  const handleRename = async (id: string, type: "folder" | "file") => {
    if (!editName.trim()) return;
    try {
      if (type === "folder") {
        await engineApi.patch(`/cloud/folders/${id}/`, { name: editName.trim() });
      } else {
        await engineApi.patch(`/cloud/files/${id}/`, { filename: editName.trim() });
      }
      setEditingNodeId(null);
      fetchWorkspace(activeFolderId);
    } catch {
      alert("Failed to rename");
    }
  };

  const handleDelete = async (id: string, type: "folder" | "file") => {
    if (!confirm("Are you sure you want to delete this item? Subfolders and files within will be deleted as well.")) return;
    try {
      if (type === "folder") {
        await engineApi.delete(`/cloud/folders/${id}/`);
      } else {
        await engineApi.delete(`/cloud/files/${id}/`);
      }
      fetchWorkspace(activeFolderId);
    } catch {
      alert("Failed to delete");
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };
  
  const handleCopyPath = (node: FileNode) => {
    const path = breadcrumbs.map(b => b.name).join("/") + "/" + node.name;
    navigator.clipboard.writeText(path);
  };

  // Preview Actions
  const handleOpenPreview = async (fileNode: FileNode) => {
    setPreviewFile(fileNode);
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewMetadata(null);

    // Mocks for standard demo keys, else hit backend
    const isMock = fileNode.id.startsWith("file") || !fileNode.id.match(/^[0-9a-fA-F-]{36}$/);

    if (isMock) {
      // Return high quality simulated column profile details immediately
      setTimeout(() => {
        setPreviewMetadata({
          row_count: fileNode.id === "file3" ? 450 : 1200,
          column_names: fileNode.id === "file3"
            ? ["Property_ID", "London_Borough", "Average_Price", "Inventory_Count", "Last_Sold_Date"]
            : ["Transaction_ID", "Dubai_Area", "Property_Type", "Price_AED", "Size_SqFt", "Rooms", "Transaction_Date"],
          missing_values_detected: fileNode.id === "file3" ? true : false,
        });
        setIsPreviewLoading(false);
      }, 600);
    } else {
      try {
        const data = await getQuickProfile(fileNode.id);
        setPreviewMetadata(data);
      } catch {
        setPreviewError("Could not retrieve file schema profile from the server.");
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-surface-page rounded-2xl border border-border-subtle overflow-hidden shadow-xl backdrop-blur-md bg-opacity-70">
      {/* Top Header & Breadcrumbs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-border-subtle bg-surface-card/60 backdrop-blur-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-content-secondary">
            <HardDrive className="w-4 h-4 text-brand-primary" />
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-content-muted" />}
                <button
                  onClick={() => handleNavigate(crumb.id)}
                  className="hover:text-brand-primary hover:underline transition-all"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          {!isAnalyst && (
            <div className="flex items-center gap-1.5 text-xs text-status-warning bg-status-warning/10 border border-status-warning/20 px-2 py-0.5 rounded-md w-fit">
              <Calendar className="w-3 h-3" />
              <span>Standard User: Files older than 14 days automatically expire.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-border-subtle bg-surface-page text-content-strong placeholder-content-muted focus:outline-none focus:border-brand-primary w-full sm:w-48 transition-all"
            />
          </div>

          <button
            onClick={() => {
              setIsCreatingFolder(!isCreatingFolder);
              setIsUploading(false);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-content-strong border border-border-subtle rounded-xl hover:bg-surface-muted transition-all shrink-0"
            title="New Folder"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          <button
            onClick={handleToggleUpload}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-content-on-brand bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-primary/20 shrink-0"
            title="Upload File"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload File</span>
          </button>
        </div>
      </div>

      {/* Creation and Action Inputs */}
      {isCreatingFolder && (
        <div className="p-4 border-b border-border-subtle bg-surface-muted/40 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <Folder className="w-5 h-5 text-brand-accent shrink-0" />
          <input
            type="text"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            className="flex-1 max-w-xs px-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-surface-page focus:outline-none focus:border-brand-primary"
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            className="px-3.5 py-1.5 bg-brand-primary text-content-on-brand text-xs font-bold rounded-lg hover:opacity-90"
          >
            Create
          </button>
          <button
            onClick={() => setIsCreatingFolder(false)}
            className="p-1.5 hover:bg-surface-muted rounded-full"
          >
            <X className="w-4 h-4 text-content-secondary" />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="p-5 border-b border-border-subtle bg-surface-muted/30">
          <DirectUploadPipeline
            currentFolderId={activeFolderId}
            onUploadSuccess={onUploadSuccess}
            remainingStorageBytes={remainingStorageBytes}
          />
        </div>
      )}

      {/* Main Grid View of Files and Folders */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface-page/30 custom-scrollbar">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-content-muted space-y-4 py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center shadow-md">
              <Folder className="w-8 h-8 opacity-40 text-brand-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-content-secondary">No items found</p>
              <p className="text-xs text-content-muted max-w-xs mx-auto mt-1">This workspace branch is currently empty or doesn&apos;t match your search criteria.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentItems.map((item) => {
              const isEditing = editingNodeId === item.id;

              if (item.type === "folder") {
                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col items-center justify-center p-5 border border-border-subtle rounded-2xl bg-surface-card/75 hover:bg-surface-card hover:border-brand-primary/40 hover:shadow-lg cursor-pointer transition-all duration-300"
                    onClick={() => !isEditing && handleNavigate(item.id)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <Folder className="w-11 h-11 text-brand-accent mb-2.5 group-hover:scale-110 transition-transform duration-300" />

                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full px-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(item.id, "folder")}
                          className="w-full text-xs px-2 py-1 rounded bg-surface-page border border-brand-primary focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(item.id, "folder")}
                          className="p-1 text-status-success hover:bg-surface-muted rounded"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-content-strong text-center truncate w-full px-1">
                        {item.name}
                      </span>
                    )}

                    {/* Actions Menu (hover triggered) */}
                    <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-card/90 rounded-lg p-0.5 border border-border-subtle gap-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartRename(item)}
                        title="Rename"
                        className="p-1 hover:bg-surface-muted rounded text-content-secondary hover:text-brand-primary"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {item.id !== "root" && (
                        <button
                          onClick={() => handleDelete(item.id, "folder")}
                          title="Delete"
                          className="p-1 hover:bg-status-error/15 rounded text-content-secondary hover:text-status-error"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // File Node Renderer
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col items-center justify-center p-5 border border-border-subtle rounded-2xl bg-surface-card/75 hover:bg-surface-card hover:border-brand-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  onDoubleClick={() => handleOpenPreview(item)}
                >
                  <FileSpreadsheet className="w-11 h-11 text-brand-primary/80 mb-2.5 group-hover:scale-110 transition-transform duration-300" />

                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full px-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(item.id, "file")}
                        className="w-full text-xs px-2 py-1 rounded bg-surface-page border border-brand-primary focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(item.id, "file")}
                        className="p-1 text-status-success hover:bg-surface-muted rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-content-strong text-center truncate w-full px-2" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-content-muted mt-1 font-mono">
                        {item.size ? (item.size / 1024 / 1024).toFixed(2) + " MB" : "0.00 MB"}
                      </span>
                    </>
                  )}

                  {/* Actions Menu */}
                  <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-card/90 rounded-lg p-0.5 border border-border-subtle gap-0.5 shadow-sm">
                    <button
                      onClick={() => handleOpenPreview(item)}
                      title="Preview Columns"
                      className="p-1 hover:bg-surface-muted rounded text-content-secondary hover:text-brand-accent"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStartRename(item)}
                      title="Rename"
                      className="p-1 hover:bg-surface-muted rounded text-content-secondary hover:text-brand-primary"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, "file")}
                      title="Delete"
                      className="p-1 hover:bg-status-error/15 rounded text-content-secondary hover:text-status-error"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column Preview Modal */}
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
                  <p className="text-xs text-content-secondary">Column Preview & Structural Validation</p>
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
                  <p className="text-xs text-content-secondary font-semibold">Running schema profiling...</p>
                </div>
              ) : previewError ? (
                <div className="flex items-center gap-3 border border-status-error/30 bg-status-error/5 p-4 rounded-xl text-status-error text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{previewError}</span>
                </div>
              ) : previewMetadata ? (
                <div className="space-y-6">
                  {/* File Stats Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Rows</p>
                      <p className="text-lg font-bold text-content-strong mt-1 font-mono">
                        {previewMetadata.row_count}
                      </p>
                    </div>

                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Total Columns</p>
                      <p className="text-lg font-bold text-content-strong mt-1 font-mono">
                        {previewMetadata.column_names.length}
                      </p>
                    </div>

                    <div className="border border-border-subtle bg-surface-muted/30 p-4 rounded-xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-content-muted">Quality Check</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${previewMetadata.missing_values_detected
                          ? "bg-status-warning/10 text-status-warning"
                          : "bg-status-success/10 text-status-success"
                        }`}>
                        {previewMetadata.missing_values_detected ? "Nulls Detected" : "Optimal Schema"}
                      </span>
                    </div>
                  </div>

                  {/* Schema Columns List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-brand-primary" />
                        Identified Columns
                      </h4>
                      <span className="text-[10px] text-content-muted">Valid types parsed</span>
                    </div>

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

                  {previewMetadata.missing_values_detected && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-status-warning/30 bg-status-warning/5 px-4 py-3 text-xs text-status-warning leading-relaxed">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>
                        Note: AI Cleaning agent will automatically fill and impute detected empty fields inside the engine analysis pipeline.
                      </span>
                    </div>
                  )}
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] bg-surface-card/90 backdrop-blur-md border border-border-subtle rounded-xl shadow-2xl py-1 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-border-subtle/50 mb-1">
            <p className="text-xs font-semibold text-content-strong truncate" title={contextMenu.node.name}>
              {contextMenu.node.name}
            </p>
          </div>
          <button
            className="w-full text-left px-4 py-2 text-xs text-content-secondary hover:bg-brand-primary/10 hover:text-brand-primary flex items-center gap-2"
            onClick={() => {
              if (contextMenu.node.type === "folder") handleNavigate(contextMenu.node.id);
              else handleOpenPreview(contextMenu.node);
              setContextMenu(null);
            }}
          >
            {contextMenu.node.type === "folder" ? <Folder className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Open
          </button>
          <button
            className="w-full text-left px-4 py-2 text-xs text-content-secondary hover:bg-surface-muted flex items-center gap-2"
            onClick={() => {
              handleCopyPath(contextMenu.node);
              setContextMenu(null);
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Path
          </button>
          <button
            className="w-full text-left px-4 py-2 text-xs text-content-secondary hover:bg-surface-muted flex items-center gap-2"
            onClick={() => {
              handleStartRename(contextMenu.node);
              setContextMenu(null);
            }}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Rename
          </button>
          <div className="h-px bg-border-subtle/50 my-1 mx-2" />
          <button
            className="w-full text-left px-4 py-2 text-xs text-status-error hover:bg-status-error/10 flex items-center gap-2"
            onClick={() => {
              handleDelete(contextMenu.node.id, contextMenu.node.type);
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="h-px bg-border-subtle/50 my-1 mx-2" />
          <button
            className="w-full text-left px-4 py-2 text-xs text-content-secondary hover:bg-surface-muted flex items-center gap-2"
            onClick={() => {
              setPropertiesNode(contextMenu.node);
              setContextMenu(null);
            }}
          >
            <Info className="w-3.5 h-3.5" />
            Properties
          </button>
        </div>
      )}

      {/* Properties Modal */}
      {propertiesNode && (
        <div className="fixed inset-0 bg-surface-page/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-muted/40">
              <h3 className="text-sm font-bold text-content-strong flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-primary" />
                Properties
              </h3>
              <button
                onClick={() => setPropertiesNode(null)}
                className="p-1.5 hover:bg-surface-muted rounded-full transition-all"
              >
                <X className="w-4 h-4 text-content-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-center py-4 bg-surface-muted/20 rounded-xl border border-border-subtle/50">
                {propertiesNode.type === "folder" ? (
                  <Folder className="w-16 h-16 text-brand-accent" />
                ) : (
                  <FileSpreadsheet className="w-16 h-16 text-brand-primary/80" />
                )}
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-border-subtle/30 pb-2">
                  <span className="text-content-muted font-semibold">Name</span>
                  <span className="text-content-strong font-mono max-w-[200px] truncate" title={propertiesNode.name}>{propertiesNode.name}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/30 pb-2">
                  <span className="text-content-muted font-semibold">Type</span>
                  <span className="text-content-strong capitalize">{propertiesNode.type}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/30 pb-2">
                  <span className="text-content-muted font-semibold">Size</span>
                  <span className="text-content-strong font-mono">
                    {propertiesNode.type === "folder" ? "Directory" : propertiesNode.size ? (propertiesNode.size / 1024 / 1024).toFixed(2) + " MB" : "0 B"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/30 pb-2">
                  <span className="text-content-muted font-semibold">Modified</span>
                  <span className="text-content-strong font-mono">{new Date(propertiesNode.modifiedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-surface-muted/30 border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setPropertiesNode(null)}
                className="px-4 py-1.5 text-xs font-bold text-content-strong border border-border-subtle rounded-lg hover:bg-surface-muted transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
