"use client";

import React, { useEffect, useState } from "react";
import { FileNode } from "./CloudFileManager";
import { X, Loader2, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getQuickProfile } from "@/lib/engineApi";

type ProfileData = {
  row_count: number;
  column_names: string[];
  missing_values_detected: boolean;
};

export function PreAnalysisModal({
  selectedFiles,
  onClose,
  onConfirm
}: {
  selectedFiles: FileNode[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      setError(null);
      try {
        const newProfiles: Record<string, ProfileData> = {};
        for (const file of selectedFiles) {
          // Note: using file.id for now, assuming the backend uses UUIDs which are string
          const data = await getQuickProfile(file.id);
          newProfiles[file.id] = data;
        }
        setProfiles(newProfiles);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch file profiles. Ensure the files are successfully uploaded and scanned.");
      } finally {
        setLoading(false);
      }
    }

    if (selectedFiles.length > 0) {
      fetchProfiles();
    }
  }, [selectedFiles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-page/80 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-surface-muted/50">
          <h2 className="text-lg font-bold text-content-strong">Pre-Analysis Summary</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-page rounded-full transition-colors text-content-muted hover:text-content-strong">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-content-muted gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              <p className="text-sm">Running quick profile on selected files...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-content-secondary">
                You have selected {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} for analysis. The AI Engine will process these together. Here is a quick profile:
              </p>
              
              <div className="space-y-4">
                {selectedFiles.map((file) => {
                  const profile = profiles[file.id];
                  return (
                    <div key={file.id} className="border border-border-subtle rounded-xl p-4 bg-surface-page">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-brand-primary" />
                          <span className="font-semibold text-content-strong text-sm">{file.name}</span>
                        </div>
                        {profile?.missing_values_detected ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-status-warning/10 text-status-warning rounded-full text-xs font-bold border border-status-warning/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Missing Data
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-status-success/10 text-status-success rounded-full text-xs font-bold border border-status-success/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Clean
                          </span>
                        )}
                      </div>
                      
                      {profile && (
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-content-muted block mb-1">Rows Detected</span>
                            <span className="font-bold text-content-strong">{profile.row_count.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-content-muted block mb-1">Detected Columns ({profile.column_names.length})</span>
                            <div className="max-h-24 overflow-y-auto border border-border-subtle rounded-lg bg-surface-muted p-2 space-y-1 custom-scrollbar">
                              {profile.column_names.map((col) => (
                                <div key={col} className="font-mono text-[10px] text-content-secondary bg-surface-card px-2 py-0.5 rounded border border-border-subtle/50 truncate" title={col}>
                                  {col}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 mt-4">
                <p className="text-xs text-content-secondary leading-relaxed">
                  <span className="font-bold text-brand-accent">Engine Notice: </span>
                  Missing data will be automatically imputed using our ensemble models. PII (Personally Identifiable Information) is automatically masked before generation.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border-subtle bg-surface-muted/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-content-secondary hover:text-content-strong transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={loading || !!error}
            onClick={onConfirm}
            className="px-6 py-2.5 bg-brand-primary text-content-on-brand text-sm font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm & Generate Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
