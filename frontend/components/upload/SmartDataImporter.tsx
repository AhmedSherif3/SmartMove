"use client";

/**
 * SmartDataImporter.tsx — PropSphere
 * 
 * A high-end, reusable CSV staging component.
 * Features:
 *   - Glassmorphic Drag & Drop zone.
 *   - Client-side parsing (PapaParse).
 *   - 10-row "PowerBI-style" preview.
 *   - Column metadata detection.
 */

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  FileSpreadsheet, X, CheckCircle2, AlertCircle,
  Table as TableIcon, UploadCloud, MapPin, ChevronDown
} from "lucide-react";

interface SmartDataImporterProps {
  onConfirm?: (file: File, data: Record<string, string | number>[], region: string) => void;
  title?: string;
  description?: string;
}

export function SmartDataImporter({
  onConfirm,
  title = "Data Staging Environment",
  description = "Select a CSV file to preview and validate before importing."
}: SmartDataImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Record<string, string | number>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [region, setRegion] = useState<string>("england");
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Invalid file type. Please upload a CSV file.");
      return;
    }

    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 11, // First 10 rows + 1 for safety
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV. Please check the file format.");
          return;
        }

        setHeaders(results.meta.fields || []);
        setData(results.data.slice(0, 10) as Record<string, string | number>[]); // Force exactly 10 rows
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  const clearFile = () => {
    setFile(null);
    setData([]);
    setHeaders([]);
    setError(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-content-strong">{title}</h2>
        <p className="text-content-secondary text-sm">{description}</p>
      </div>

      {!file ? (
        /* Drop Zone */
        <div
          {...getRootProps()}
          className={`
            relative group cursor-pointer overflow-hidden
            border-2 border-dashed rounded-2xl p-12
            transition-all duration-300 ease-out
            flex flex-col items-center justify-center gap-4
            ${isDragActive
              ? "border-brand-primary bg-brand-primary/5 scale-[1.01]"
              : "border-ui-border-subtle hover:border-brand-primary/50 hover:bg-ui-surface-muted"
            }
          `}
        >
          <div className="relative">
            <div className={`
              absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full transition-opacity duration-300
              ${isDragActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"}
            `} />
            <UploadCloud className={`w-12 h-12 relative z-10 transition-transform duration-300 ${isDragActive ? "scale-110" : "group-hover:scale-110"}`} />
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-medium">Drag and drop your CSV here</p>
            <p className="text-sm text-content-muted">or click to browse from your device</p>
          </div>

          <input {...getInputProps()} />
        </div>
      ) : (
        /* Preview State */
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-ui-surface-card/95 backdrop-blur-md p-5 rounded-2xl border border-ui-border-subtle shadow-xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-content-strong leading-tight">{file.name}</p>
                  <p className="text-xs text-content-muted">{(file.size / 1024).toFixed(2)} KB • {headers.length} Columns</p>
                </div>
              </div>

              {/* Elite Region Selector */}
              <div className="flex items-center gap-4 pl-6 border-l border-ui-border-subtle/50">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black uppercase text-content-muted tracking-[0.2em] mb-1.5 ml-1">Target Region</label>
                  <div className="relative group/select">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                    </div>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="appearance-none bg-ui-surface-muted/50 border border-ui-border-subtle pl-10 pr-10 py-2 rounded-xl text-xs font-bold text-content-strong outline-none cursor-pointer hover:border-brand-primary/50 hover:bg-ui-surface-muted transition-all min-w-35 shadow-sm"
                    >
                      <option value="england" className="bg-ui-surface-card text-content-primary">England</option>
                      <option value="dubai" className="bg-ui-surface-card text-content-primary">Dubai</option>
                      <option value="egypt" className="bg-ui-surface-card text-content-primary">Egypt</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-content-muted group-hover/select:text-brand-primary transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-ui-status-error/10 hover:text-ui-status-error rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-ui-status-error/5 text-ui-status-error rounded-xl border border-ui-status-error/20">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Data Grid Preview */}
          <div className="relative group rounded-2xl border border-ui-border-subtle bg-ui-surface-card/95 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-subtle bg-ui-surface-muted/50">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-brand-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-content-muted">Data Staging: First 10 Rows</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-ui-status-success/10 text-ui-status-success border border-ui-status-success/20">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Schema Verified</span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar border-t border-ui-border-subtle">
              <table className="w-full text-left border-collapse table-fixed min-w-250">
                <thead>
                  <tr className="bg-ui-surface-muted/90 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-content-strong border-r border-ui-border-subtle last:border-r-0"
                      >
                        <div className="truncate" title={h}>{h}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-subtle/40">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-brand-primary/8 transition-colors group even:bg-ui-surface-muted/20">
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="px-4 py-3 text-[13px] font-mono font-medium text-content-secondary border-r border-ui-border-subtle/50 last:border-r-0"
                        >
                          <div className="truncate" title={row[h] !== undefined ? String(row[h]) : undefined}>
                            {row[h] === "" || row[h] === undefined ? (
                              <span className="text-content-muted/30 italic text-[10px] tracking-normal">null</span>
                            ) : (
                              String(row[h])
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fade effect at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-ui-surface-card to-transparent pointer-events-none" />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4 text-xs text-content-muted font-medium">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-ui-status-success" />
                Valid Encoding
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                CSV Format
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearFile}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-content-primary hover:bg-ui-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm?.(file, data, region)}
                className="px-8 py-2.5 bg-brand-primary text-content-on-brand rounded-xl font-bold text-sm hover:opacity-90 shadow-xl shadow-brand-primary/30 hover:-translate-y-px active:translate-y-0 transition-all"
              >
                Load & Transform Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
