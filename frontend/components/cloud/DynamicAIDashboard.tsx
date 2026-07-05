"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { Download, Sparkles, TrendingUp, BarChart3, Target, AlertTriangle, CheckCircle2 } from "lucide-react";

import { engineApi } from "@/lib/engineApi";
import { getApiBaseUrl } from "@/lib/urls/apiBase";

export type ChartDataObj = {
  title: string;
  x_axis: string;
  y_axis: string;
  explanation?: string;
  simplified_goal?: string;
  color_hex?: string;
  data: Record<string, string | number>[];
};

export type DashboardJSON = {
  anomalies?: string[];
  recommendations?: string[];
  kpis: { name: string; value: string | number }[];
  charts: {
    Line?: ChartDataObj[];
    Bar?: ChartDataObj[];
    Scatter?: ChartDataObj[];
    Pie?: ChartDataObj[];
    Area?: ChartDataObj[];
  };
  insight_text: string;
};

function normalizeChartData(data: Record<string, string | number>[]) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  
  const numberKey = keys.find(k => typeof data[0][k] === 'number') || keys[1] || keys[0];
  const stringKey = keys.find(k => k !== numberKey) || keys[0];

  return data.map(item => ({
    name: item[stringKey],
    value: item[numberKey]
  }));
}

export function DynamicAIDashboard({
  data,
  workspaceId,
  onClose
}: {
  data: DashboardJSON;
  workspaceId?: string;
  role?: string;
  onClose: () => void;
}) {

  return (
    <div className="w-full h-full flex flex-col bg-surface-page dashboard-print-container">
      {/* Print-specific styles injected directly to ensure neat PDF output */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .dashboard-print-container, .dashboard-print-container * {
            visibility: visible;
          }
          .dashboard-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 border-b border-border-subtle bg-surface-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent/10 flex items-center justify-center rounded-xl text-brand-accent shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-content-strong">AI Synthesis Dashboard</h1>
            <p className="text-xs sm:text-sm text-content-muted">Generated from your workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 no-print">

          <button
            onClick={onClose}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-brand-primary text-content-on-brand text-xs sm:text-sm font-bold rounded-lg shadow-md hover:opacity-90 whitespace-nowrap"
          >
            Close Dashboard
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Anomalies Alert */}
        {data.anomalies && data.anomalies.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Data Anomalies Detected
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-red-600">
              {data.anomalies.map((anomaly, idx) => (
                <li key={idx}>{anomaly}</li>
              ))}
            </ul>
          </div>
        )}

        {/* KPIs */}
        {data.kpis && data.kpis.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.kpis.map((kpi, idx) => (
              <div key={idx} className="p-5 border border-border-subtle rounded-xl bg-surface-card flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-muted rounded-full flex items-center justify-center text-brand-primary">
                  {idx % 3 === 0 ? <TrendingUp className="w-6 h-6" /> : idx % 3 === 1 ? <Target className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-content-muted uppercase tracking-wider">{kpi.name}</p>
                  <p className="text-2xl font-bold text-content-strong">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.charts?.Line && data.charts.Line.map((chart, idx) => (
            <div key={`line-${idx}`} className="p-6 border border-border-subtle rounded-xl bg-surface-card h-80 flex flex-col">
              <h3 className="text-sm font-bold text-content-strong mb-1">{chart.title}</h3>
              <p className="text-xs text-content-muted mb-2">{chart.y_axis} vs {chart.x_axis}</p>
              {chart.explanation && <p className="text-xs text-content-secondary mb-2 italic">{chart.explanation}</p>}
              {chart.simplified_goal && (
                <div className="bg-brand-primary/10 border-l-2 border-brand-primary p-2 mb-4 rounded-r-md">
                  <p className="text-xs font-semibold text-brand-primary">💡 {chart.simplified_goal}</p>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={normalizeChartData(chart.data)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="value" name={chart.y_axis} stroke={chart.color_hex || "#8b5cf6"} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {data.charts?.Bar && data.charts.Bar.map((chart, idx) => (
            <div key={`bar-${idx}`} className="p-6 border border-border-subtle rounded-xl bg-surface-card h-80 flex flex-col">
              <h3 className="text-sm font-bold text-content-strong mb-1">{chart.title}</h3>
              <p className="text-xs text-content-muted mb-2">{chart.y_axis} vs {chart.x_axis}</p>
              {chart.explanation && <p className="text-xs text-content-secondary mb-2 italic">{chart.explanation}</p>}
              {chart.simplified_goal && (
                <div className="bg-brand-primary/10 border-l-2 border-brand-primary p-2 mb-4 rounded-r-md">
                  <p className="text-xs font-semibold text-brand-primary">💡 {chart.simplified_goal}</p>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={normalizeChartData(chart.data)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" name={chart.y_axis} fill={chart.color_hex || "#3b82f6"} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
          
          {data.charts?.Scatter && data.charts.Scatter.map((chart, idx) => (
            <div key={`scatter-${idx}`} className="p-6 border border-border-subtle rounded-xl bg-surface-card h-80 flex flex-col lg:col-span-2">
              <h3 className="text-sm font-bold text-content-strong mb-1">{chart.title}</h3>
              <p className="text-xs text-content-muted mb-2">{chart.y_axis} vs {chart.x_axis}</p>
              {chart.explanation && <p className="text-xs text-content-secondary mb-2 italic">{chart.explanation}</p>}
              {chart.simplified_goal && (
                <div className="bg-brand-primary/10 border-l-2 border-brand-primary p-2 mb-4 rounded-r-md">
                  <p className="text-xs font-semibold text-brand-primary">💡 {chart.simplified_goal}</p>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="name" name={chart.x_axis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="value" name={chart.y_axis} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Scatter name="Data" data={normalizeChartData(chart.data)} fill={chart.color_hex || "#ec4899"} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {data.charts?.Area && data.charts.Area.map((chart, idx) => (
            <div key={`area-${idx}`} className="p-6 border border-border-subtle rounded-xl bg-surface-card h-80 flex flex-col lg:col-span-2">
              <h3 className="text-sm font-bold text-content-strong mb-1">{chart.title}</h3>
              <p className="text-xs text-content-muted mb-2">{chart.y_axis} vs {chart.x_axis}</p>
              {chart.explanation && <p className="text-xs text-content-secondary mb-2 italic">{chart.explanation}</p>}
              {chart.simplified_goal && (
                <div className="bg-brand-primary/10 border-l-2 border-brand-primary p-2 mb-4 rounded-r-md">
                  <p className="text-xs font-semibold text-brand-primary">💡 {chart.simplified_goal}</p>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={normalizeChartData(chart.data)}>
                    <defs>
                      <linearGradient id={`colorArea${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chart.color_hex || "#f59e0b"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chart.color_hex || "#f59e0b"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" name={chart.y_axis} stroke={chart.color_hex || "#f59e0b"} fillOpacity={1} fill={`url(#colorArea${idx})`} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}

          {data.charts?.Pie && data.charts.Pie.map((chart, idx) => {
            const chartData = normalizeChartData(chart.data);
            const baseColor = chart.color_hex || "#10b981";
            // Generate a simple palette from base color for pie slices
            const COLORS = [baseColor, '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];
            
            return (
              <div key={`pie-${idx}`} className="p-6 border border-border-subtle rounded-xl bg-surface-card h-80 flex flex-col">
                <h3 className="text-sm font-bold text-content-strong mb-1">{chart.title}</h3>
                <p className="text-xs text-content-muted mb-2">{chart.x_axis} Distribution</p>
                {chart.explanation && <p className="text-xs text-content-secondary mb-2 italic">{chart.explanation}</p>}
                {chart.simplified_goal && (
                  <div className="bg-brand-primary/10 border-l-2 border-brand-primary p-2 mb-4 rounded-r-md">
                    <p className="text-xs font-semibold text-brand-primary">💡 {chart.simplified_goal}</p>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight Text */}
        {data.insight_text && (
          <div className="p-6 rounded-xl bg-brand-primary/5 border border-brand-primary/20">
            <h3 className="text-sm font-bold text-brand-primary mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Key Insights
            </h3>
            <div className="prose prose-sm max-w-none text-content-secondary leading-relaxed">
              {/* Simple Markdown parsing for bold text */}
              {data.insight_text.split('\n').map((line, i) => (
                <p key={i}>
                  {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j} className="text-content-strong">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action Plan (Recommendations) */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="p-6 rounded-xl bg-surface-card border border-border-subtle shadow-sm">
            <h3 className="text-sm font-bold text-content-strong mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> AI Action Plan
            </h3>
            <div className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted/50 hover:bg-surface-muted transition-colors">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-content-secondary leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
