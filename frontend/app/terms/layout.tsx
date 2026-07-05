import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SmartMove Analytics",
  description: "Terms of service and usage conditions for the SmartMove Analytics platform.",
};

export default function TermsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
