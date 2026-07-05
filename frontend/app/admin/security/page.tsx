"use client";

import React from "react";
import { Shield } from "lucide-react";

const skeletonRows = Array.from({ length: 5 });

export default function AdminSecurityPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-brand-accent">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-logo font-bold text-content-strong">Security & Audit Log</h1>
            <p className="mt-1 text-content-muted">All user actions are recorded.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card p-4 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          placeholder="Search logs"
          className="w-full rounded-xl border border-border-subtle bg-surface-muted px-4 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
        <select
          className="w-full rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content-primary md:max-w-50"
          defaultValue="all"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-content-secondary">
            <thead className="bg-surface-muted text-[11px] font-bold uppercase tracking-widest text-content-muted">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {skeletonRows.map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-3 w-24 rounded bg-surface-muted/80" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3 w-36 rounded bg-surface-muted/80" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3 w-28 rounded bg-surface-muted/80" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3 w-32 rounded bg-surface-muted/80" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-20 rounded-full bg-surface-muted/80" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
