import * as Sentry from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
};

export default Sentry.withSentryConfig(nextConfig, {
  org: "ahmed-i1",
  project: "smartmove-frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});