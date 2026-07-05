"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { engineApi } from "@/lib/engineApi";
import { FileNode } from "./CloudFileManager";
import axios from "axios";
import Papa from "papaparse";

export function DirectUploadPipeline({
  currentFolderId,
  onUploadSuccess,
  remainingStorageBytes
}: {
  currentFolderId: string;
  onUploadSuccess: (fileNode: FileNode) => void;
  remainingStorageBytes: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "uploading" | "confirming" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string | number>[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
 
  const buildPreview = useCallback((nextFile: File) => {
    setPreviewHeaders([]);
    setPreviewRows([]);
    setPreviewError(null);
 
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setPreviewError("Preview is available for CSV files only.");
      return;
    }
 
    Papa.parse(nextFile, {
      header: true,
      skipEmptyLines: true,
      preview: 11,
      complete: (results) => {
        if (results.errors.length > 0) {
          setPreviewError("Error parsing CSV preview.");
          return;
        }
 
        const headers = results.meta.fields || [];
        const rows = (results.data || []).slice(0, 10) as Record<string, string | number>[];
        setPreviewHeaders(headers);
        setPreviewRows(rows);
      },
    });
  }, []);
 
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const nextFile = acceptedFiles[0];
      
      if (nextFile.size > remainingStorageBytes) {
        setErrorMsg(`File size (${(nextFile.size / 1024 / 1024).toFixed(2)} MB) exceeds your remaining storage quota.`);
        setStatus("error");
        setFile(null);
        return;
      }
 
      setFile(nextFile);
      setStatus("idle");
      setErrorMsg(null);
      buildPreview(nextFile);
    }
  }, [buildPreview, remainingStorageBytes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus("uploading");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);
      formData.append("file_size_bytes", String(file.size));
      if (currentFolderId) {
        formData.append("folder_id", currentFolderId);
      }

      const res = await engineApi.post("/cloud/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setStatus("success");
      
      // Notify parent
      onUploadSuccess({
        id: res.data?.file_id || Math.random().toString(),
        name: file.name,
        type: "file",
        size: file.size,
        modifiedAt: new Date().toISOString(),
        parentId: currentFolderId,
        minioKey: ""
      });

    } catch (err: unknown) {
      console.error(err);
      setStatus("error");

      if (axios.isAxiosError(err)) {
        const serverMsg = err.response?.data as { error?: string } | undefined;
        setErrorMsg(serverMsg?.error || "An error occurred during upload.");
      } else {
        setErrorMsg("An error occurred during upload.");
      }
    }
  };

  const cancel = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setPreviewError(null);
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-status-success rounded-xl bg-status-success/5">
        <CheckCircle2 className="w-12 h-12 text-status-success mb-3" />
        <p className="text-sm font-semibold text-status-success">Upload Complete</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={`
            cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors
            ${isDragActive ? "border-brand-primary bg-brand-primary/5" : "border-border-subtle hover:border-brand-primary/50 hover:bg-surface-page"}
          `}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-10 h-10 ${isDragActive ? "text-brand-primary" : "text-content-muted"}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-content-strong">Drag & drop your file here</p>
            <p className="text-xs text-content-muted">Supports .CSV, .XLSX</p>
          </div>
        </div>
      ) : (
        <div className="border border-border-subtle rounded-xl p-4 bg-surface-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 flex items-center justify-center rounded-lg text-brand-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-content-strong truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-content-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "idle" && (
              <>
                <button onClick={cancel} className="p-2 hover:bg-status-error/10 text-content-muted hover:text-status-error rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <button onClick={handleUpload} className="px-4 py-2 bg-brand-primary text-content-on-brand text-xs font-bold rounded-lg shadow-md hover:opacity-90">
                  Start Upload
                </button>
              </>
            )}
            {["requesting", "uploading", "confirming"].includes(status) && (
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-muted rounded-lg text-xs font-bold text-content-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status === "requesting" && "Requesting Token..."}
                {status === "uploading" && "Direct to MinIO..."}
                {status === "confirming" && "Confirming..."}
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-status-error/10 text-status-error rounded-lg text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
                <button onClick={() => setStatus("idle")} className="ml-2 underline">Retry</button>
              </div>
            )}
          </div>
        </div>
      )}

      {file && (previewHeaders.length > 0 || previewError) && (
        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-content-muted">Preview</p>
            <span className="text-xs text-content-muted">First 10 rows</span>
          </div>

          {previewError ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
              <AlertCircle className="h-4 w-4" />
              {previewError}
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border-subtle">
              <table className="min-w-full text-left text-xs text-content-secondary">
                <thead className="bg-surface-muted text-[10px] font-bold uppercase tracking-widest text-content-muted">
                  <tr>
                    {previewHeaders.map((header) => (
                      <th key={header} className="px-3 py-2">
                        <div className="truncate" title={header}>{header}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-surface-muted/40">
                      {previewHeaders.map((header) => (
                        <td key={`${rowIndex}-${header}`} className="px-3 py-2">
                          <div className="truncate" title={row[header] !== undefined ? String(row[header]) : undefined}>
                            {row[header] === "" || row[header] === undefined ? (
                              <span className="text-content-muted/50 italic">null</span>
                            ) : (
                              String(row[header])
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
