"use client";

import React from "react";

function KpiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-content-muted">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-logo font-bold text-content-strong">System Monitoring</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="System Status">
          <span className="inline-flex items-center rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1 text-xs font-semibold text-status-success">
            Operational
          </span>
        </KpiCard>

        <KpiCard title="API Response Time">
          <div className="text-2xl font-bold text-content-strong">—ms</div>
          <div className="mt-1 text-xs text-content-muted">Average response time</div>
        </KpiCard>

        <KpiCard title="Pipeline Last Run">
          <div className="text-2xl font-bold text-content-strong">—</div>
          <div className="mt-1 text-xs text-content-muted">Most recent execution</div>
        </KpiCard>

        <KpiCard title="Active Sessions">
          <div className="text-2xl font-bold text-content-strong">—</div>
        </KpiCard>

        <KpiCard title="Error Rate">
          <div className="text-2xl font-bold text-content-strong">—%</div>
        </KpiCard>

        <KpiCard title="Celery Queue">
          <div className="text-2xl font-bold text-content-strong">— jobs pending</div>
        </KpiCard>
      </div>

      <p className="text-sm text-content-muted">Live data coming soon.</p>
    </div>
  );
}
