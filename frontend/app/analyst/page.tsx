"use client";

import React from "react";
import DashboardEmbed from "@/components/insights/DashboardEmbed";
import WelcomeGlobe from "@/components/WelcomeGlobe";
import { getAuthSession } from "@/lib/auth/session";

export default function AnalystPage() {
  const session = getAuthSession();
  const userName = session?.email.split("@")[0] || "Analyst";

  return (
    <div className="space-y-6">
      <WelcomeGlobe userName={userName} />
      <DashboardEmbed pageId="overview" />
    </div>
  );
}