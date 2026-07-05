"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  HardDrive, 
  FileText, 
  ArrowUpRight, 
  Loader2, 
  Trash2,
  Calendar,
  Sparkles
} from "lucide-react";
import { fetchSubscriptionStatus, cancelSubscription, SubscriptionStatus } from "@/lib/subscriptionApi";
import { getStorageQuota } from "@/lib/engineApi";

export function BillingWorkspace() {
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [storageQuota, setStorageQuota] = useState<{
    bytes_used: number;
    bytes_total: number;
    percentage_used: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingPlan, setCancelingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const subStatus = await fetchSubscriptionStatus();
      setStatus(subStatus);
      
      const quotaData = await getStorageQuota();
      setStorageQuota(quotaData);
    } catch (err) {
      console.error("Failed to fetch billing data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelSub = async (planType: string, displayName: string) => {
    if (!confirm(`Are you sure you want to cancel your ${displayName}? The capabilities will be revoked immediately.`)) {
      return;
    }
    
    setCancelingPlan(planType);
    setMessage(null);
    
    try {
      await cancelSubscription(planType);
      setMessage({ text: `Successfully canceled ${displayName}.`, type: "success" });
      await loadData();
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { error?: string } } };
      setMessage({ 
        text: error.response?.data?.error || `Failed to cancel ${displayName}. Please try again.`, 
        type: "error" 
      });
    } finally {
      setCancelingPlan(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Maps backend plan types to human-readable labels
  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      analyst: "Analyst Plan",
      analyst_pro_max: "Analyst Pro Max Bundle",
      storage_per_gb: "Custom Storage Per GB",
      storage_5gb: "5 GB Cloud Storage Bundle",
      storage_9gb: "9 GB Cloud Storage Bundle",
      report_single_egypt: "Egypt Market Report Mailing",
      report_single_dubai: "Dubai Market Report Mailing",
      report_single_england: "England & Wales Market Report Mailing",
      report_all: "All Regions Reports Bundle",
    };
    return labels[plan] || plan;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-xs text-content-secondary font-semibold">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 bg-surface-page/5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <h1 className="text-3xl font-logo font-bold text-content-strong flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-brand-primary" />
            Billing & Subscriptions
          </h1>
          <p className="text-xs text-content-secondary font-medium mt-1">
            Manage your plans, cloud storage limits, and region reports subscriptions
          </p>
        </div>
        <button
          onClick={() => router.push("/pricing")}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-content-on-brand bg-brand-primary rounded-xl shadow-lg hover:scale-105 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          View Upgrades / Pricing
        </button>
      </div>

      {/* Alert Notices */}
      {message && (
        <div className={`p-4 rounded-xl border flex gap-3 text-xs ${
          message.type === "success" 
            ? "bg-status-success/10 border-status-success/20 text-status-success" 
            : "bg-status-error/15 border-status-error/20 text-status-error"
        }`}>
          <span className="font-bold">{message.type === "success" ? "✓" : "⚠"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Side: Subscription Overview */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Card 1: Account Role Status */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-xl pointer-events-none" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-4">Core Account Tier</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-content-strong">
                  {status?.role === "data_analyst" ? "Analyst Plan" : "User (Free) Plan"}
                </p>
                <p className="text-xs text-content-secondary mt-1">
                  {status?.role === "data_analyst" 
                    ? "Full Access to MoveIQ GPT-4o, Analytics Pro Engine, and EstateMind AI Chart generators." 
                    : "Access to dashboards and MoveIQ Gemini 3.5 chat. Limit: 1 GB cloud storage."
                  }
                </p>
              </div>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                status?.role === "data_analyst" 
                  ? "bg-brand-primary/10 border-brand-primary/25 text-brand-primary" 
                  : "bg-surface-muted border-border-subtle text-content-secondary"
              }`}>
                {status?.role === "data_analyst" ? "Premium" : "Free"}
              </span>
            </div>
          </div>

          {/* Card 2: List of Active Lemon Squeezy Plans */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-4">Active Subscriptions</h2>
            
            {!status?.active_plans || status.active_plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-content-muted text-xs space-y-3">
                <Calendar className="w-8 h-8 opacity-30 text-content-muted" />
                <p>No active paid subscriptions found.</p>
                <p className="text-[10px]">Your account is currently running on the default free tier.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {status.active_plans.map((plan) => (
                  <div key={plan} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                        {plan.includes("storage") ? <HardDrive className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-content-strong">{getPlanLabel(plan)}</p>
                        <p className="text-[10px] text-content-muted uppercase tracking-wider">Active Monthly Subscription</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCancelSub(plan, getPlanLabel(plan))}
                      disabled={cancelingPlan !== null}
                      className="p-2 text-content-secondary hover:text-status-error hover:bg-status-error/10 rounded-lg transition-all"
                      title="Cancel Subscription"
                    >
                      {cancelingPlan === plan ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Storage Quota & CTA Prompts */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Card 3: Cloud Storage Quota */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-4">Cloud Storage Allocation</h2>
            
            {storageQuota ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-brand-secondary" />
                    <div>
                      <p className="text-lg font-bold text-content-strong">
                        {formatBytes(storageQuota.bytes_used)}
                      </p>
                      <p className="text-[10px] text-content-muted">
                        of 100 MB limit used
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-secondary">
                    {Math.min((storageQuota.bytes_used / (100 * 1024 * 1024)) * 100, 100).toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-border-subtle/50">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-secondary to-brand-accent transition-all duration-500"
                    style={{ width: `${Math.min((storageQuota.bytes_used / (100 * 1024 * 1024)) * 100, 100)}%` }}
                  />
                </div>
                
                {/* storage detail math */}
                <div className="text-[10px] text-content-muted space-y-1 bg-surface-page/30 p-3 rounded-lg border border-border-subtle/40">
                  <div className="flex justify-between">
                    <span>Base Tier Storage:</span>
                    <span className="font-bold">100 MB</span>
                  </div>
                  <div className="flex justify-between border-t border-border-subtle/40 pt-1 mt-1 font-bold text-content-secondary">
                    <span>Total Allowance:</span>
                    <span>100 MB</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-content-muted">Failed to load quota metadata.</p>
            )}
          </div>

          {/* Upsells Prompt Box */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted">Get More Out of SmartMove</h2>
            
            <div className="space-y-3">
              
              {/* CTA 1: Storage upgrade */}
              <div 
                onClick={() => router.push("/pricing?tab=cloud")}
                className="group p-3.5 rounded-xl border border-border-subtle hover:border-brand-secondary hover:bg-brand-secondary/5 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-content-strong group-hover:text-brand-secondary transition-colors">
                    Need more storage?
                  </p>
                  <p className="text-[10px] text-content-muted">Add custom GB slider size or 5GB/9GB blocks.</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-muted group-hover:text-brand-secondary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              {/* CTA 2: Reports upgrade */}
              <div 
                onClick={() => router.push("/pricing?tab=reports")}
                className="group p-3.5 rounded-xl border border-border-subtle hover:border-brand-accent hover:bg-brand-accent/5 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-content-strong group-hover:text-brand-accent transition-colors">
                    Want automated reports?
                  </p>
                  <p className="text-[10px] text-content-muted">Activate weekly analytical PDFs for region markets.</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-muted group-hover:text-brand-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              {/* CTA 3: Analyst tier upgrade */}
              {status?.role !== "data_analyst" && (
                <div 
                  onClick={() => router.push("/pricing?tab=role")}
                  className="group p-3.5 rounded-xl border border-border-subtle hover:border-brand-primary hover:bg-brand-primary/5 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-content-strong group-hover:text-brand-primary transition-colors">
                      Upgrade to Analyst Role?
                    </p>
                    <p className="text-[10px] text-content-muted">Unlock GPT-4o engines and EstateMind AI charting.</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-content-muted group-hover:text-brand-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              )}
              
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
