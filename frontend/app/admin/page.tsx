"use client";
import React from "react";
import { User, Activity, AlertCircle, Database } from "lucide-react";
import WelcomeGlobe from "@/components/WelcomeGlobe";
import PipelineVisualizer from "@/components/PipelineVisualizer";
import FlipCounter from "@/components/FlipCounter";
import { getAuthSession } from "@/lib/auth/session";

export default function AdminPage() {
  const session = getAuthSession();
  const userName = session?.email.split("@")[0] || "Admin";

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <WelcomeGlobe userName={userName} />
        <PipelineVisualizer />
      </div>
      <div>
        <h1 className="text-3xl font-logo font-extrabold text-content-strong">Admin Dashboard</h1>
        <p className="text-content-muted mt-1">System control and user management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value="1,248" icon={<User className="text-brand-primary" />} trend="+12%" />
        <StatCard title="System Health" value="Healthy" icon={<Activity className="text-status-success" />} />
        <StatCard title="API Requests" value="48.2k" icon={<Database className="text-brand-accent" />} trend="+5%" />
        <StatCard title="Active Errors" value="0" icon={<AlertCircle className="text-status-error" />} />
      </div>

      <div className="card bg-surface-card border border-border-subtle shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-content-primary mb-4">Pipeline Status</h2>
          <div className="space-y-4">
            <PipelineItem name="Dubai Transactions Sync" status="Completed" time="2 mins ago" />
            <PipelineItem name="Egypt Market Trends Update" status="Running" time="Now" />
            <PipelineItem name="England Price Prediction Model" status="Queued" time="15:00" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="card kpi-glow bg-surface-card border border-border-subtle transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center">
            {icon}
          </div>
          {trend && (
            <span className="inline-flex items-center rounded-full border border-status-success/20 bg-status-success/15 px-2.5 py-1 text-xs font-semibold text-status-success">
              {trend}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-xs text-content-muted font-bold uppercase tracking-wider">{title}</p>
          <FlipCounter value={value} size={24} className="mt-1 font-logo font-extrabold" />
        </div>
      </div>
    </div>
  );
}

function PipelineItem({ name, status, time }: { name: string; status: "Completed" | "Running" | "Queued"; time: string }) {
  const statusColors = {
    Completed: "bg-status-success/15 text-status-success border border-status-success/20",
    Running: "bg-brand-primary/15 text-brand-primary border border-brand-primary/20 animate-pulse",
    Queued: "bg-surface-muted text-content-muted border border-border-subtle",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-muted/50 border border-border-subtle/50">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-content-primary">{name}</span>
        <span className="text-xs text-content-muted">{time}</span>
      </div>
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[status]}`}>
        {status}
      </span>
    </div>
  );
}
