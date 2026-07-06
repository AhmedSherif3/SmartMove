import * as Sentry from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*/",
        destination: `${backendUrl}/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*/`,
      },
    ];
  },
};

export default Sentry.withSentryConfig(nextConfig, {
  org: "ahmed-i1",
  project: "smartmove-frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});