import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center — SmartMove Analytics",
  description: "Learn how to use SmartMove Analytics. Step-by-step guides for MoveIQ AI, EstateMind Agentic Dashboards, CSV Uploads, and Cloud Workspaces.",
  keywords: ["SmartMove help", "how to use MoveIQ", "real estate cloud workspace guide", "agentic dashboard tutorial", "CSV upload real estate data"],
};

export default function HelpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
