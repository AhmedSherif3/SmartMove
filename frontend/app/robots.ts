import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/analyst",
        "/analyst/*",
        "/user",
        "/user/*",
        "/authentication",
        "/authentication/*",
        "/api",
        "/api/*",
        "/_next",
      ],
    },
    sitemap: "https://smartmoveanalytics.me/sitemap.xml",
  };
}
