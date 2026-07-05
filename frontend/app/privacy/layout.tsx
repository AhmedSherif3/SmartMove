import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SmartMove Analytics",
  description: "Privacy policy and data protection guidelines for SmartMove Analytics users.",
};

export default function PrivacyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
