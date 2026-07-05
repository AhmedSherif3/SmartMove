import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import { Toaster } from "react-hot-toast";
import ThemeToggleLoader from "@/components/theme-toggle-loader";
import NeuralReactorGate from "@/components/NeuralReactorGate";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://smartmoveanalytics.me"),
  title: {
    template: "%s | SmartMove Analytics",
    default: "SmartMove Analytics — AI-Powered Real Estate Intelligence for Dubai, Egypt & England",
  },
  description: "AI-powered real estate analytics platform. Ask MoveIQ questions, auto-generate dashboards with EstateMind, and compare property investments across Dubai, Egypt, and England.",
  keywords: [
    "SmartMove", "SmartMove Analytics", "MoveIQ AI assistant", "agentic chart making", 
    "EstateMind", "analytics pro engine", "AI property predictions", "real estate cloud workspace",
    "Dubai real estate analytics", "Egypt property data", "England real estate data",
    "real estate ROI comparison", "cross-market property intelligence", "real estate analytics platform",
    "property market intelligence", "AI real estate tool"
  ],
  openGraph: {
    title: "SmartMove Analytics — AI-Powered Real Estate Intelligence",
    description: "Compare property investments across Dubai, Egypt, and England. Features MoveIQ AI, Agentic Analytics, and Predictive ROI Forecasting.",
    url: "https://smartmoveanalytics.me",
    siteName: "SmartMove Analytics",
    images: [{ url: "/smartmove.png", width: 800, height: 800, alt: "SmartMove Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartMove Analytics",
    description: "AI-Powered Real Estate Intelligence for Dubai, Egypt & England",
    images: ["/smartmove.png"],
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/smartmove.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SmartMove Analytics",
    "url": "https://smartmoveanalytics.me",
    "logo": "https://smartmoveanalytics.me/smartmove.png",
    "description": "AI-powered real estate analytics platform for Dubai, Egypt, and England.",
    "areaServed": ["England", "Dubai", "Egypt"],
    "sameAs": [
      "https://www.facebook.com/profile.php?id=61589139209261",
      "https://www.instagram.com/smartmove3711"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SmartMove Analytics",
    "url": "https://smartmoveanalytics.me",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://smartmoveanalytics.me/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SmartMove Analytics",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "featureList": [
      "MoveIQ AI Assistant",
      "Agentic Analytics Dashboard Builder (EstateMind)",
      "Analytics Pro Engine",
      "Multi-Market Intelligence (Dubai, Egypt, England)",
      "AI Property Price Forecasting"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${orbitron.variable} antialiased`}
      >
        <NeuralReactorGate />
        <div className="reactor-content w-full h-full min-h-screen">
          <Toaster position="top-center" reverseOrder={false} />
          <ThemeToggleLoader />
          {children}
        </div>
        
        {/* Global JSON-LD SEO Schemas */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      </body>
    </html>
  );
}
