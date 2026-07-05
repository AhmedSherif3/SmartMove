"use client";

import React, { useEffect, useState } from "react";
import { Bot, ShieldAlert, Activity, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { getSocLogs, SelfHealingLog } from "@/lib/monitoringApi";

export default function SocDashboard() {
  const [logs, setLogs] = useState<SelfHealingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await getSocLogs();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch SOC logs:", err);
        setError("Failed to load Robot Mechanic logs. Please ensure you have Admin privileges.");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "failed":
        return <XCircle className="w-4 h-4 mr-1" />;
      case "skipped":
        return <AlertTriangle className="w-4 h-4 mr-1" />;
      default:
        return <Activity className="w-4 h-4 mr-1" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return "bg-status-success/20 text-status-success border-status-success/30";
      case "failed":
        return "bg-status-error/20 text-status-error border-status-error/30";
      default:
        return "bg-status-warning/20 text-status-warning border-status-warning/30";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-logo font-bold text-content-strong flex items-center gap-3">
            <Bot className="w-8 h-8 text-brand-primary" />
            Robot Mechanic <span className="text-brand-primary opacity-80">Logs</span>
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            Live feed of all automated self-healing actions performed by the SOC backend.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-surface-card border border-border-subtle rounded-xl px-4 py-2 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-status-success" />
            <div>
              <p className="text-xs text-content-muted font-semibold uppercase tracking-wider">System Status</p>
              <p className="text-sm font-bold text-status-success">Self-Healing Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card bg-surface-card border border-border-subtle shadow-lg">
        <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-brand-primary/5">
          <h2 className="text-lg font-bold font-logo text-content-strong">Incident Audit Trail</h2>
          <div className="flex items-center text-xs text-content-muted font-mono">
            <Clock className="w-3 h-3 mr-1" />
            Auto-updating
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <span className="loading loading-spinner loading-lg text-brand-primary"></span>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-status-error">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-content-muted">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No incidents recorded</p>
              <p className="text-sm">The robot mechanic has not needed to fix anything yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/50 text-xs uppercase tracking-wider text-content-muted border-b border-border-subtle">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Alert Trigger</th>
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Action Taken</th>
                  <th className="px-6 py-4 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="group hover:bg-brand-primary/5 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content-secondary font-mono">
                      {new Date(log.triggered_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-content-strong">
                        {log.alert_name}
                      </div>
                      <div className="text-xs text-content-muted mt-0.5">
                        Severity: <span className="uppercase text-status-error">{log.severity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-surface-muted text-content-primary text-xs font-mono border border-border-subtle">
                        {log.service || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-brand-primary font-mono bg-brand-primary/10 inline-block px-2 py-0.5 rounded">
                        {log.runbook_name}()
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status.toUpperCase()}
                        </span>
                        {log.result_message && (
                          <span className="text-xs text-content-muted truncate max-w-xs block" title={log.result_message}>
                            {log.result_message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
