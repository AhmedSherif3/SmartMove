"use client";

import React from "react";
import DashboardEmbed from "@/components/insights/DashboardEmbed";

export default function MarketTrendsPage() {
  return (
    <div className="space-y-6">
      <DashboardEmbed pageId="trends" />
    </div>
  );
}