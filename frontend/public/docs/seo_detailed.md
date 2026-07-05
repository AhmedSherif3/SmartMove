# SmartMove Analytics - Detailed SEO Documentation

This document provides a detailed overview of the Search Engine Optimization (SEO) setup, structured data schemas, and technical crawlability configurations implemented for the SmartMove Analytics guest portal.

---

## 1. Directory Structure of SEO Additions

To enhance indexing and search presence without affecting user interface components, we added dynamic technical files and route-specific layouts.

```text
frontend/
├── app/
│   ├── layout.tsx             # Global SEO configuration & JSON-LD schemas
│   ├── robots.ts              # Crawler rule generator (robots.txt)
│   ├── sitemap.ts             # XML Sitemap generator (sitemap.xml)
│   ├── about/
│   │   └── layout.tsx         # Metadata wrapper for /about
│   ├── pricing/
│   │   └── layout.tsx         # Metadata wrapper for /pricing
│   ├── contact/
│   │   └── layout.tsx         # Metadata wrapper for /contact
│   ├── help/
│   │   └── layout.tsx         # Metadata wrapper for /help
│   ├── privacy/
│   │   └── layout.tsx         # Metadata wrapper for /privacy
│   ├── terms/
│   │   └── layout.tsx         # Metadata wrapper for /terms
│   └── cookies/
│       └── layout.tsx         # Metadata wrapper for /cookies
```

---

## 2. Technical SEO & Crawlability

### Robots Rules (`app/robots.ts`)
Generates dynamic instructions for web crawlers.
*   **Production Host**: `https://smartmoveanalytics.me`
*   **Allowed Routes**: All public pages (`/`, `/about`, `/pricing`, `/contact`, `/help`, and legal pages).
*   **Disallowed Routes**: Completely blocks crawling of dashboard/authentication areas to prevent indexing of internal interfaces or user-specific data:
    *   `/admin/*`
    *   `/analyst/*`
    *   `/user/*`
    *   `/authentication/*`

### Sitemap (`app/sitemap.ts`)
Dynamically generates `sitemap.xml` listing all crawlable URLs with priority weights:
*   `/` (Home): Priority `1.0` (Weekly change frequency)
*   `/pricing`: Priority `0.9` (Weekly)
*   `/about`: Priority `0.8` (Monthly)
*   `/contact`: Priority `0.7` (Monthly)
*   `/help`: Priority `0.6` (Weekly)
*   `/privacy`, `/terms`, `/cookies` (Legal): Priority `0.3` (Monthly)

---

## 3. Global Metadata (`app/layout.tsx`)

A rich SEO metadata configuration is declared globally. Custom settings include:
*   **Metadata Base URL**: `https://smartmoveanalytics.me`
*   **Title Template**: `%s | SmartMove Analytics` (automatically appends the brand name to page-specific titles).
*   **Primary Keywords**:
    *   *Brand*: `SmartMove Analytics`, `SmartMove`, `SmartMove Real Estate`
    *   *Core Features*: `MoveIQ`, `EstateMind`, `Agentic Analytics`, `AI forecasting`
    *   *Markets & Geographies*: `Dubai property insights`, `Egypt real estate analytics`, `England housing market data`
*   **Social Graphs**: Open Graph (OG) and Twitter Card tags configured using `/public/smartmove.png` to render visually appealing previews on Slack, LinkedIn, Twitter, and Facebook.

---

## 4. Route-Specific Metadata Wrappers

Each public page uses a dedicated `layout.tsx` wrapper to inject unique title and description tags:

| Route | Page Title | Primary SEO Description Target |
| :--- | :--- | :--- |
| `/` | `SmartMove Analytics | AI Real Estate Insights` | Primary overview of AI forecasting, Multi-market tools, and Agentic analytical features. |
| `/about` | `About Us` | Compelling company mission, team details, and the vision behind real estate data science. |
| `/pricing` | `Pricing Plans` | Transparent overview of subscription packages (Basic, Professional, Enterprise) and free trials. |
| `/contact` | `Contact Us` | Easy access to sales, customer support, and inquiry forms. |
| `/help` | `Help & Support Centre` | Customer service guides, product documentation, and FAQs. |
| `/privacy` | `Privacy Policy` | User data security, GDPR compliance, and privacy policies. |
| `/terms` | `Terms of Service` | Standard platform terms of use, guidelines, and user agreements. |
| `/cookies` | `Cookie Policy` | Transparent policy detailing cookie usage and analytical tracking consent. |

---

## 5. Structured Data (JSON-LD Rich Snippets)

To trigger enhanced rich listings on Google Search (such as search boxes and feature callouts), we injected three JSON-LD scripts inside the root layout body:

### A. Organization Schema
Identifies the corporate brand entity:
*   **Name**: `SmartMove Analytics`
*   **Official Logo**: `https://smartmoveanalytics.me/smartmove.png`
*   **Target Markets**: `["England", "Dubai", "Egypt"]`
*   **Social Accounts**: Connected directly to official profiles (Facebook, Instagram).

### B. WebSite Schema
Enables Google Sitelinks Searchbox capabilities:
*   **Search Query URL**: `https://smartmoveanalytics.me/search?q={search_term_string}`

### C. SoftwareApplication Schema
Flags SmartMove as a business intelligence platform:
*   **Application Category**: `BusinessApplication`
*   **Operating System**: `All (Cloud-Based / Web)`
*   **Feature List**:
    1.  *MoveIQ* (Natural language AI real estate assistant)
    2.  *EstateMind* (Agentic dashboard builder)
    3.  *Analytics Pro Engine* (Shared cloud workspace and visualization)
    4.  *Multi-Market Intelligence* (Localized market data for Dubai, Egypt, and England)
    5.  *Predictive Forecasting Engine* (Machine learning projections up to 36 months)

---

## 6. Post-Deployment SEO Verification Checklist

After deploying the project to the live domain `smartmoveanalytics.me`, execute the following actions to ensure indexing:

1.  **Submit Sitemap to Google Search Console**:
    *   Log in to [Google Search Console](https://search.google.com/search-console).
    *   Add the domain `smartmoveanalytics.me`.
    *   Navigate to **Sitemaps** and submit `https://smartmoveanalytics.me/sitemap.xml`.
2.  **Submit Sitemap to Bing Webmaster Tools**:
    *   Log in to [Bing Webmaster Tools](https://www.bing.com/webmasters).
    *   Verify the domain and import the sitemap.
3.  **Inspect Rendering**:
    *   Inspect `https://smartmoveanalytics.me/robots.txt` in a browser to confirm dashboard routes are blocked.
    *   Inspect `https://smartmoveanalytics.me/sitemap.xml` to verify the generated layout list.
