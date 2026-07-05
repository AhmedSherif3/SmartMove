import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact SmartMove — Real Estate Analytics Support",
  description: "Contact SmartMove Analytics for enterprise real estate data support. Serving clients across our Cairo, Dubai, and London hubs.",
  keywords: ["SmartMove contact", "real estate data provider contact", "property analytics support", "real estate data API support"],
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
