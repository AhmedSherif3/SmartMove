"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Loader2, Download, AlertCircle } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  reportTitle: string;
  canDownload: boolean;
}

type PdfViewport = {
  width: number;
  height: number;
};

type PdfRenderTask = {
  promise: Promise<void>;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => PdfRenderTask;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { url: string; withCredentials?: boolean }) => { promise: Promise<PdfDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

function scheduleStateUpdate(fn: () => void) {
  requestAnimationFrame(fn);
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  reportTitle,
  canDownload,
}: PdfPreviewModalProps) {
  const [libLoaded, setLibLoaded] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDoc, setPdfDoc] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF.js from CDN dynamically to avoid Node peer dependency bloat
  useEffect(() => {
    if (!isOpen) return;

    if (window.pdfjsLib) {
      scheduleStateUpdate(() => setLibLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const pdfjsLib = window.pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        scheduleStateUpdate(() => setLibLoaded(true));
      }
    };
    script.onerror = () => {
      scheduleStateUpdate(() => {
        setError("Failed to load PDF preview engine from CDN.");
        setLoading(false);
      });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen]);

  // Load PDF Document when lib is loaded and URL changes
  useEffect(() => {
    if (!libLoaded || !pdfUrl || !isOpen) return;

    scheduleStateUpdate(() => {
      setLoading(true);
      setError(null);
    });

    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      scheduleStateUpdate(() => {
        setError("PDF preview engine is not available.");
        setLoading(false);
      });
      return;
    }
    
    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      withCredentials: true
    });

    loadingTask.promise.then(
      (pdf) => {
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        scheduleStateUpdate(() => setLoading(false));
      },
      (err: unknown) => {
        console.error("Error loading PDF:", err);
        scheduleStateUpdate(() => {
          setError("Unable to render the secure report. Please try again or download directly.");
          setLoading(false);
        });
      }
    );
  }, [libLoaded, pdfUrl, isOpen]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !isOpen) return;

    let active = true;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Custom canvas rendering guarantees NO interactive layers or selectable text.
        // This is the direct native equivalent of renderTextLayer={false} and renderAnnotationLayer={false}.
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: unknown) {
        console.error("Error rendering page:", err);
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, isOpen]);

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      {/* Modal Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Container */}
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] bg-surface-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-muted">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-content-strong font-logo">{reportTitle}</h3>
            <p className="text-xs text-content-muted">Secure Document Preview Mode</p>
          </div>
          <div className="flex items-center gap-3">
            {canDownload && (
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-content-on-brand hover:brightness-110 transition-all"
              >
                <Download size={14} />
                Download PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border-subtle text-content-secondary hover:bg-surface-card transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-950 flex justify-center items-center p-6 relative">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-brand-primary">
              <Loader2 size={36} className="animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Loading secure viewport...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 text-status-error max-w-md text-center">
              <AlertCircle size={36} />
              <p className="text-sm font-semibold text-slate-200">{error}</p>
              <p className="text-xs text-slate-400">
                This report requires a valid session token. If the preview fails, try direct download if authorized.
              </p>
            </div>
          )}

          {/* Render Canvas */}
          <div className={`relative shadow-lg border border-slate-800 rounded overflow-hidden max-w-full ${loading || error ? "hidden" : "block"}`}>
            <canvas ref={canvasRef} className="max-w-full h-auto bg-white" />
            
            {/* Watermark/Flat Overlay to prevent screenshot OCR easily */}
            <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.03]">
              <span className="text-7xl font-bold font-logo text-slate-950 uppercase rotate-45">SmartMove Private</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        {!loading && !error && numPages > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-surface-muted">
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-border-subtle text-content-secondary hover:bg-surface-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-content-primary">
                Page {currentPage} of {numPages}
              </span>
              <button
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="p-2 rounded-lg border border-border-subtle text-content-secondary hover:bg-surface-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="text-xs text-content-muted italic">
              🔒 Copy/Paste and links are disabled for copyright protection.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
