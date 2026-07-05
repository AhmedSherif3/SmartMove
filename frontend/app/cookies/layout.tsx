import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — SmartMove Analytics",
  description: "Cookie policy detailing how SmartMove Analytics uses cookies to improve your experience.",
};

export default function CookiesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
