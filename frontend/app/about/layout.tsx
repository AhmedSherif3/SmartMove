import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About SmartMove — Real Estate Market Intelligence Platform",
  description: "Learn about SmartMove Analytics. Our mission is to provide multi-market intelligence, MoveIQ conversational analytics, and EstateMind auto-dashboards to investors globally.",
  keywords: ["about SmartMove", "real estate data warehouse", "property market intelligence company", "Egypt Dubai England real estate data", "EstateMind platform"],
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
