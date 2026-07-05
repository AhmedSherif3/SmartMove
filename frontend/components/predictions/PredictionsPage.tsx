"use client";

import React, { useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ForecastData = {
  avg_price_change: string;
  hotspot: string;
  demand_index: string;
  market_phase: string;
};

type YearOption = 1 | 2 | 3 | 5;

const forecastByYears: Record<YearOption, ForecastData> = {
  1: {
    avg_price_change: "+8.2%",
    hotspot: "New Cairo",
    demand_index: "High",
    market_phase: "Growth",
  },
  2: {
    avg_price_change: "+15.7%",
    hotspot: "Dubai Marina",
    demand_index: "Very High",
    market_phase: "Expansion",
  },
  3: {
    avg_price_change: "+21.3%",
    hotspot: "London Zone 2",
    demand_index: "High",
    market_phase: "Stabilizing",
  },
  5: {
    avg_price_change: "+34.1%",
    hotspot: "New Cairo",
    demand_index: "Moderate",
    market_phase: "Maturity",
  },
};

const yearOptions: YearOption[] = [1, 2, 3, 5];

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-glow rounded-xl border border-border-subtle bg-surface-card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-content-muted">{title}</p>
      <p className="mt-3 text-2xl font-logo font-bold text-content-strong">{value}</p>
    </div>
  );
}

export default function PredictionsPage() {
  const [selectedYears, setSelectedYears] = useState<YearOption>(1);
  const forecast = forecastByYears[selectedYears];

  const projectionData = useMemo(() => {
    const totalGrowth = Number.parseFloat(forecast.avg_price_change.replace("%", ""));
    const step = totalGrowth / selectedYears;

    return Array.from({ length: selectedYears + 1 }, (_, index) => {
      const year = 2024 + index;
      const value = 100 + step * index;
      return { year, index: Number(value.toFixed(1)) };
    });
  }, [forecast.avg_price_change, selectedYears]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-logo font-bold text-content-strong">Future Predictions</h1>
        <p className="mt-1 text-content-secondary">
          AI-powered real estate forecasts for Egypt, Dubai &amp; England.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-content-secondary">Forecast Horizon:</span>
        <div className="flex flex-wrap gap-2">
          {yearOptions.map((years) => {
            const isActive = selectedYears === years;
            return (
              <button
                key={years}
                type="button"
                onClick={() => setSelectedYears(years)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-primary text-content-on-brand"
                    : "bg-surface-muted text-content-secondary hover:bg-surface-card"
                }`}
              >
                {years} Year{years > 1 ? "s" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={selectedYears}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 animate-in fade-in duration-300"
      >
        <KpiCard title="Predicted Price Change" value={forecast.avg_price_change} />
        <KpiCard title="Top Hotspot" value={forecast.hotspot} />
        <KpiCard title="Demand Index" value={forecast.demand_index} />
        <KpiCard title="Market Phase" value={forecast.market_phase} />
      </div>

      <div className="mt-6 rounded-xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-sm font-semibold text-content-strong">Price Index Projection</h2>
        <div className="mt-4 h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-subtle)" />
              <XAxis dataKey="year" stroke="var(--ui-content-muted)" />
              <YAxis stroke="var(--ui-content-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--ui-surface-card)",
                  border: "1px solid var(--ui-border-subtle)",
                  borderRadius: "10px",
                  color: "var(--ui-content-primary)",
                }}
              />
              <Area
                type="monotone"
                dataKey="index"
                stroke="var(--ui-brand-primary)"
                fill="var(--ui-brand-primary)"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-xl border-2 border-dashed border-border-subtle bg-surface-muted p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-content-muted">
          <BarChart2 size={48} className="text-content-muted" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-content-strong">Advanced Analytics Dashboard</h3>
        <p className="mt-1 text-sm text-content-secondary">Power BI embedded report will appear here.</p>
        <p className="mt-2 text-sm text-content-muted">
          To embed: replace this section with <code>&lt;iframe src=&apos;YOUR_POWERBI_EMBED_URL&apos; .../&gt;</code>
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-card p-4 text-left text-sm text-content-secondary">
          {"<iframe\n  src='YOUR_POWERBI_EMBED_URL'\n  width='100%'\n  height='480'\n  frameBorder='0'\n  allowFullScreen\n/>"}
        </pre>
      </div>
    </div>
  );
}
