import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans — SmartMove Analytics",
  description: "View SmartMove Analytics pricing plans. Get access to the Analyst Plan, Pro Max bundle, Cloud Storage, Regional Reports, and the Analytics Pro Engine.",
  keywords: ["real estate analytics pricing", "property data subscription", "agentic chart maker", "Analyst Plan SmartMove", "Analytics Pro Engine pricing"],
};

export default function PricingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
