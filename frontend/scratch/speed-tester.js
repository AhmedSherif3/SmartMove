/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function runPerformanceAudits() {
  console.log("=========================================");
  console.log("SMARTMOVE WEBSITE PERFORMANCE SPEED AUDIT");
  console.log("=========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Audit Public Pages First
  const publicRoutes = [
    { name: "Home Page", path: "/" },
    { name: "About Us Page", path: "/about" },
    { name: "Privacy Policy Page", path: "/privacy" },
    { name: "Contact Us Page", path: "/contact" },
  ];

  console.log("=== PUBLIC PAGES AUDIT ===");
  for (const route of publicRoutes) {
    console.log(`Auditing ${route.name} (${route.path})...`);
    const startTime = Date.now();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "load" });
    const loadTime = Date.now() - startTime;

    const timings = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType("navigation");
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find(e => e.name === "first-contentful-paint")?.startTime || 0;
      return nav ? { ttfb: nav.responseStart - nav.requestStart, dom: nav.domContentLoadedEventEnd - nav.requestStart, fcp } : null;
    });

    console.log(`  - Page Load Time: ${loadTime} ms`);
    if (timings) {
      console.log(`  - TTFB: ${timings.ttfb.toFixed(1)} ms`);
      console.log(`  - DOM Content Loaded: ${timings.dom.toFixed(1)} ms`);
      console.log(`  - FCP: ${timings.fcp.toFixed(1)} ms`);
    }
    console.log("-----------------------------------------");
  }

  // 2. Perform Login with Analyst Credentials
  console.log("\n=== AUTHENTICATION FLOW ===");
  console.log("Logging in as Analyst (analyst@smartmove.com)...");
  
  await page.goto(`${BASE_URL}/authentication/login`);
  await page.waitForSelector("input[type='email']");
  
  const submitStart = Date.now();
  await page.fill("input[type='email']", "analyst@smartmove.com");
  await page.fill("input[type='password']", "Password123!");
  await page.click("button[type='submit']");

  // Wait for redirect to /analyst route
  try {
    await page.waitForURL(`${BASE_URL}/analyst`, { timeout: 30000 });
    const loginTime = Date.now() - submitStart;
    console.log(`  - Login Success Processing & Redirect Time: ${loginTime} ms`);
  } catch {
    console.log("  - Login failed or timed out. Make sure backend and database are running and credentials are correct.");
    await browser.close();
    return;
  }

  // 3. Audit Authenticated Analyst Pages
  const analystRoutes = [
    { name: "Analyst Dashboard", path: "/analyst" },
    { name: "Analyst Agentic", path: "/analyst/agentic" },
    { name: "Analyst AI Engine", path: "/analyst/analytics-engine-ai" },
    { name: "Analyst Cloud", path: "/analyst/cloud" },
    { name: "Analyst Data Import", path: "/analyst/data-import" },
    { name: "Analyst Geo Insights", path: "/analyst/geographic-insights" },
    { name: "Analyst Investment Insights", path: "/analyst/investment-insights" },
    { name: "Analyst Market Trends", path: "/analyst/market-trends" },
    { name: "Analyst Notifications", path: "/analyst/notifications" },
    { name: "Analyst Predictions", path: "/analyst/predictions" },
    { name: "Analyst Reports", path: "/analyst/reports" },
    { name: "Analyst Settings", path: "/analyst/settings" },
  ];

  console.log("\n=== AUTHENTICATED PAGES AUDIT ===");
  for (const route of analystRoutes) {
    console.log(`Auditing ${route.name} (${route.path})...`);
    const startTime = Date.now();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "load" });
    const loadTime = Date.now() - startTime;

    const timings = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType("navigation");
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find(e => e.name === "first-contentful-paint")?.startTime || 0;
      return nav ? { ttfb: nav.responseStart - nav.requestStart, dom: nav.domContentLoadedEventEnd - nav.requestStart, fcp } : null;
    });

    console.log(`  - Page Load Time: ${loadTime} ms`);
    if (timings) {
      console.log(`  - TTFB: ${timings.ttfb.toFixed(1)} ms`);
      console.log(`  - DOM Content Loaded: ${timings.dom.toFixed(1)} ms`);
      console.log(`  - FCP: ${timings.fcp.toFixed(1)} ms`);
    }
    console.log("-----------------------------------------");
  }

  await browser.close();
  console.log("\n=========================================");
  console.log("FULL ANALYST AUDIT COMPLETED");
  console.log("=========================================");
}

runPerformanceAudits().catch(console.error);
