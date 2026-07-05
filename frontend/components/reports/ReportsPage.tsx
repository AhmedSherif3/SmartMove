"use client";

import React, { useEffect, useState } from "react";
import { Download, Eye, FileText, Info, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { ReportItem as ApiReportItem } from "@/lib/auth/api";
import PdfPreviewModal from "./PdfPreviewModal";

// Helper to format bytes to human readable sizes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Helper to format month number to full name
function formatMonth(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1] || `Month ${month}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");
  const [selectedDay, setSelectedDay] = useState<number | "">("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [reports, setReports] = useState<ApiReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallUpgrade, setPaywallUpgrade] = useState(false);
  
  // Preview modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewCanDownload, setPreviewCanDownload] = useState(false);

  // Fetch reports on mount (Hardcoded to 3 PDFs in docs folder)
  useEffect(() => {
    function loadReports() {
      setLoading(true);
      setError(null);
      setPaywallUpgrade(false);
      
      const hardcodedReports: ApiReportItem[] = [
        {
          id: 1,
          region: "dubai",
          region_display: "Dubai",
          report_month: 5,
          report_year: 2026,
          title: "Dubai Executive Summary — Cumulative",
          azure_blob_url: "/docs/SmartMove_Dubai_May_2026_Cumulative.pdf",
          file_size_bytes: 2030194,
          generated_at: new Date().toISOString(),
          can_view: true,
          can_download: true,
        },
        {
          id: 2,
          region: "egypt",
          region_display: "Egypt",
          report_month: 5,
          report_year: 2026,
          title: "Egypt Executive Summary — Cumulative",
          azure_blob_url: "/docs/SmartMove_Egypt_May_2026_Cumulative.pdf",
          file_size_bytes: 1831312,
          generated_at: new Date().toISOString(),
          can_view: true,
          can_download: true,
        },
        {
          id: 3,
          region: "england",
          region_display: "England",
          report_month: 5,
          report_year: 2026,
          title: "England Executive Summary — Cumulative",
          azure_blob_url: "/docs/SmartMove_England_May_2026_Cumulative.pdf",
          file_size_bytes: 1720044,
          generated_at: new Date().toISOString(),
          can_view: true,
          can_download: true,
        }
      ];
      
      setReports(hardcodedReports);
      setLoading(false);
    }
    loadReports();
  }, []);

  // Filter reports depending on Active Tab
  const monthlyReports = reports.filter(r => r.report_month >= 1 && r.report_month <= 12);
  const yearlyReports = reports.filter(r => r.report_month === 0 || r.title.toLowerCase().includes("annual"));

  let displayedReports = activeTab === "monthly" ? monthlyReports : yearlyReports;

  // Apply Region (Country) Filter
  if (selectedRegion !== "") {
    displayedReports = displayedReports.filter(r => r.region === selectedRegion);
  }

  // Apply Month Filter
  if (selectedMonth !== "") {
    displayedReports = displayedReports.filter(r => r.report_month === selectedMonth);
  }

  // Apply Day Filter
  if (selectedDay !== "") {
    displayedReports = displayedReports.filter(r => {
      const day = new Date(r.generated_at).getDate();
      return day === selectedDay;
    });
  }

  // Apply Year Filter
  if (selectedYear !== "") {
    displayedReports = displayedReports.filter(r => r.report_year === selectedYear);
  }

  // Extract unique available years dynamically
  const availableYears = Array.from(new Set(reports.map(r => r.report_year)))
    .filter(Boolean)
    .sort((a, b) => b - a);

  // Subscription states
  const [emailInput, setEmailInput] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("smartmove-reports-email");
    if (saved) {
      // eslint-disable-next-line
      setEmailInput(saved);
      setIsSubscribed(true);
    }
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    localStorage.setItem("smartmove-reports-email", emailInput.trim());
    setIsSubscribed(true);
    alert(`Successfully subscribed to reports! Weekly digests will be delivered to: ${emailInput}`);
  };

  const handleUnsubscribe = () => {
    localStorage.removeItem("smartmove-reports-email");
    setEmailInput("");
    setIsSubscribed(false);
  };

  const handlePreview = (report: ApiReportItem) => {
    setPreviewUrl(report.azure_blob_url);
    setPreviewTitle(report.title);
    setPreviewCanDownload(report.can_download);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-logo font-bold text-content-strong">Reports</h1>
        <p className="mt-1 text-content-secondary">
          Access high-fidelity, machine-generated executive summary reports for your active markets.
        </p>
      </div>

      {/* Subscription Card */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-content-strong mb-2">Automated Report Subscriptions</h3>
        {isSubscribed ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-content-secondary">
              You are currently subscribed to receive weekly and monthly market updates at: <strong className="text-brand-primary">{emailInput}</strong>.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="text-xs font-semibold text-status-error hover:underline bg-transparent border-none cursor-pointer"
            >
              Cancel Subscription
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-lg mt-3">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your professional email"
              className="flex-1 rounded-lg border border-border-subtle bg-surface-muted px-3.5 py-2 text-xs text-content-primary outline-none focus:ring-1 focus:ring-brand-primary"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-content-on-brand hover:brightness-110 shadow-sm"
            >
              Subscribe to Email Reports
            </button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => { setActiveTab("monthly"); setSelectedMonth(""); setSelectedDay(""); setSelectedYear(""); }}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === "monthly"
              ? "bg-brand-primary text-content-on-brand shadow-lg shadow-brand-primary/20"
              : "bg-surface-muted text-content-secondary hover:bg-surface-card"
          }`}
        >
          Monthly Reports
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("yearly"); setSelectedMonth(""); setSelectedDay(""); setSelectedYear(""); }}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === "yearly"
              ? "bg-brand-primary text-content-on-brand shadow-lg shadow-brand-primary/20"
              : "bg-surface-muted text-content-secondary hover:bg-surface-card"
          }`}
        >
          Yearly Summaries
        </button>
      </div>

      {/* Filters (Month, Day, Year) */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-sm">
        <span className="text-xs font-semibold text-content-secondary">Filter by:</span>
        
        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-xs font-medium text-content-muted">Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-surface-muted px-2.5 py-1.5 text-xs text-content-primary focus:ring-1 focus:ring-brand-primary outline-none"
          >
            <option value="">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="month-select" className="text-xs font-medium text-content-muted">Month:</label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-surface-muted px-2.5 py-1.5 text-xs text-content-primary focus:ring-1 focus:ring-brand-primary outline-none"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        {/* Day Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="day-select" className="text-xs font-medium text-content-muted">Day:</label>
          <select
            id="day-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-surface-muted px-2.5 py-1.5 text-xs text-content-primary focus:ring-1 focus:ring-brand-primary outline-none"
          >
            <option value="">All Days</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Country Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="country-select" className="text-xs font-medium text-content-muted">Country:</label>
          <select
            id="country-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-muted px-2.5 py-1.5 text-xs text-content-primary focus:ring-1 focus:ring-brand-primary outline-none"
          >
            <option value="">All Countries</option>
            <option value="dubai">Dubai</option>
            <option value="egypt">Egypt</option>
            <option value="england">England</option>
          </select>
        </div>

        {(selectedMonth !== "" || selectedDay !== "" || selectedYear !== "" || selectedRegion !== "") && (
          <button
            type="button"
            onClick={() => { setSelectedMonth(""); setSelectedDay(""); setSelectedYear(""); setSelectedRegion(""); }}
            className="text-xs font-semibold text-brand-primary hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        // Premium Skeleton Loader with Shimmer effect
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between p-5 border border-border-subtle bg-surface-card rounded-xl animate-pulse"
            >
              <div className="flex items-start gap-3 w-2/3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-surface-muted rounded w-3/4" />
                  <div className="h-3 bg-surface-muted rounded w-1/2" />
                  <div className="h-2.5 bg-surface-muted rounded w-1/4" />
                </div>
              </div>
              <div className="w-24 h-9 bg-surface-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : paywallUpgrade ? (
        // Premium, Gorgeous Paywall Upgrade Card
        <div className="relative max-w-2xl mx-auto overflow-hidden rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex p-3 rounded-full bg-brand-primary/10 text-brand-primary animate-pulse">
              <Sparkles size={28} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-content-strong font-logo">Premium Intelligence Required</h3>
              <p className="text-sm text-content-secondary max-w-md mx-auto">
                Historical executive reports, real-time analytics dashboards, and pro forecasting intelligence require a 
                <strong> Data Analyst</strong> subscription tier.
              </p>
            </div>

            {/* Premium Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full max-w-md py-4 border-y border-border-subtle/50">
              <div className="flex items-center gap-2 text-xs text-content-primary">
                <span className="text-brand-primary">✦</span> Historical Data Access
              </div>
              <div className="flex items-center gap-2 text-xs text-content-primary">
                <span className="text-brand-primary">✦</span> Executive PDF Downloads
              </div>
              <div className="flex items-center gap-2 text-xs text-content-primary">
                <span className="text-brand-primary">✦</span> Advanced AI Chatbot Agents
              </div>
              <div className="flex items-center gap-2 text-xs text-content-primary">
                <span className="text-brand-primary">✦</span> Real-Time SmartMove Cloud
              </div>
            </div>

            <button
              onClick={() => alert("Redirecting to subscription plans...")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-content-on-brand shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[1] transition-all"
            >
              Upgrade Subscription Now
            </button>
          </div>
        </div>
      ) : error ? (
        // Error Alert Card
        <div className="flex items-start gap-3 rounded-xl border border-status-error/20 bg-status-error/5 p-5 text-status-error max-w-xl mx-auto">
          <ShieldAlert size={20} className="mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Failed to load Market Reports</p>
            <p className="text-xs text-content-secondary">{error}</p>
          </div>
        </div>
      ) : displayedReports.length === 0 ? (
        // Clean empty state
        <div className="text-center py-12 rounded-xl border border-dashed border-border-subtle bg-surface-muted/30">
          <FileText size={42} className="mx-auto text-content-muted/60 mb-3" />
          <h3 className="text-sm font-semibold text-content-strong">No Reports Available</h3>
          <p className="text-xs text-content-secondary mt-1 max-w-sm mx-auto">
            {activeTab === "yearly" 
              ? "Yearly summaries are compiled and generated at the end of each calendar fiscal year."
              : "No published reports were found for your active markets at this time."}
          </p>
        </div>
      ) : (
        // Group list of reports
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayedReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-card p-5 hover:border-brand-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary group-hover:text-content-on-brand transition-colors">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-content-strong">{report.title}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      report.region === "egypt" ? "bg-amber-100 text-amber-800" :
                      report.region === "dubai" ? "bg-blue-100 text-blue-800" :
                      "bg-emerald-100 text-emerald-800"
                    }`}>
                      {report.region_display}
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary mt-0.5">
                    {formatMonth(report.report_month)} {report.report_year}
                  </p>
                  <p className="text-[10px] text-content-muted mt-1">
                    Size: {formatBytes(report.file_size_bytes)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                {/* Preview Button */}
                {report.can_view ? (
                  <button
                    type="button"
                    onClick={() => handlePreview(report)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-muted px-3.5 py-2 text-xs font-semibold text-content-primary transition-all"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface-card opacity-50 cursor-not-allowed px-3.5 py-2 text-xs font-semibold text-content-muted"
                  >
                    <Lock size={13} />
                    Locked
                  </button>
                )}

                {/* Download Button (Paywall Gated) */}
                {report.can_download ? (
                  <a
                    href={report.azure_blob_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-content-on-brand hover:brightness-110 shadow-sm shadow-brand-primary/10 transition-all"
                  >
                    <Download size={13} />
                    Download
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => alert("Please upgrade your plan to download older reports.")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-subtle hover:border-brand-primary/40 px-3.5 py-2 text-xs font-semibold text-content-secondary transition-all"
                  >
                    <Lock size={12} className="text-content-muted" />
                    Unlock PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info notice box */}
      <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
        <Info size={18} className="mt-0.5 text-brand-primary flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-content-primary">Tiered Security & Copy Protection Active</p>
          <p className="text-xs text-content-secondary leading-relaxed">
            Market reports are compiled using your region&apos;s authorized datasets. Documents are fully sealed and loaded in secure viewer mode: selecting text, running OCR screen-readers, and copying content are strictly disabled. Switch your region in Account Settings to load reports for Dubai, Egypt, or England.
          </p>
        </div>
      </div>

      {/* Dynamic PDF Viewer Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={previewUrl}
        reportTitle={previewTitle}
        canDownload={previewCanDownload}
      />
    </div>
  );
}
