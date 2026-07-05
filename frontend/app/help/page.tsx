"use client";

import React, { useState } from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { 
  Bot, 
  TrendingUp, 
  FileText, 
  LineChart, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  ArrowRight
} from "lucide-react";

interface FeatureGuide {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  steps: string[];
  tips: string[];
  techOverview: string;
}

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: "ai-chat",
    title: "1. Interactive AI Chat (MoveIQ)",
    shortDesc: "Ask questions in plain English to get instant answers and charts about property markets.",
    icon: Bot,
    steps: [
      "Type your question in the search/chat bar (e.g., 'What is the average rent in Dubai Marina?').",
      "Use the toggle at the top of the screen to switch markets (England, Dubai, or Egypt).",
      "Press Enter or click the send icon.",
      "Read the AI response and view the auto-generated data charts."
    ],
    tips: [
      "Ask specific questions like 'Compare prices between Westminster and Dubai Marina' for better comparison tables.",
      "You can ask MoveIQ to explain any chart by typing 'Explain this chart'."
    ],
    techOverview: "Translates natural language into database queries to search live property transaction tables."
  },
  {
    id: "dashboards",
    title: "2. Real-Time Dashboards",
    shortDesc: "Interactive visual charts and maps showing pricing trends and sales volumes.",
    icon: TrendingUp,
    steps: [
      "Select 'Market Trends', 'Investment Insights', or 'Geographic Insights' from the sidebar.",
      "Use the filters at the top to filter by date range, property type, or price range.",
      "Hover over the heatmap areas to view local average prices."
    ],
    tips: [
      "Zoom in on the map and click on a specific district to view detailed local metrics.",
      "Compare different areas side-by-side to spot high-yield properties."
    ],
    techOverview: "Renders responsive SVG charts and interactive heatmaps driven by live market sales databases."
  },
  {
    id: "reports",
    title: "3. PDF Reports (AutoReport)",
    shortDesc: "Generate and download official PDF reports summarizing market performance.",
    icon: FileText,
    steps: [
      "Navigate to the 'Reports' page in the sidebar.",
      "Select a target country (England, Dubai, or Egypt) and template type.",
      "Choose your desired report.",
      "Read the PDF directly in the built-in viewer or click 'Download PDF' to save it."
    ],
    tips: [
      "You can configure automated reports to be emailed to you weekly or monthly.",
      "Use PDF previews to copy quick summary bullet points for client presentations."
    ],
    techOverview: "Compiles live database records into professional PDF documents."
  },
  {
    id: "predictions",
    title: "4. AI Predictions",
    shortDesc: "Predict property values and market trends up to 3 years into the future.",
    icon: LineChart,
    steps: [
      "Go to the 'Predictions' page in the sidebar.",
      "Select the specific area, neighborhood, and property type you want to forecast.",
      "Set your forecasting range (up to 36 months)."
    ],
    tips: [
      "Pay attention to the 'Confidence Level' indicator—higher numbers mean more stable historical data.",
      "Compare past trends against predicted lines to see growth direction."
    ],
    techOverview: "Uses machine learning models trained on historical sales registries to forecast pricing trends."
  },
  {
    id: "pro-engine",
    title: "5. Analytics Pro Engine",
    shortDesc: "Upload your own datasets and generate custom calculations and dashboards.",
    icon: Sparkles,
    steps: [
      "Go to the 'SmartMove Cloud' page and upload your property CSV or Excel dataset.",
      "Navigate to the 'Analytics Pro Engine' page.",
      "Choose your uploaded file from the 'Select Dataset' dropdown menu.",
      "Click 'Run Analysis' to process your file and automatically build custom charts and metrics."
    ],
    tips: [
      "Ensure your CSV file contains columns for 'Price', 'Size', and 'Location' for accurate mapping.",
      "Save your custom analysis settings so they run automatically when you upload new data."
    ],
    techOverview: "Runs isolated datasets in a secure container sandbox to clean, process, and map uploaded user files."
  }
];

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>("ai-chat");

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <GuestLayout>
      <HelpCSS />
      <div className="hp-wrapper">
        <header className="hp-hero">
          <div className="g-tag">Knowledge &amp; Support</div>
          <h1 className="hp-hero-h1">Help Center</h1>
          <p className="hp-hero-sub">
            Learn step-by-step how to utilize the five core features of SmartMove to analyze real estate like a seasoned analyst.
          </p>
        </header>

        <div className="hp-container">
          {/* Sidebar links */}
          <aside className="hp-sidebar">
            <div className="hp-sidebar-card">
              <h3>Need Live Support?</h3>
              <p>Can&apos;t find what you are looking for? Our developers and data analysts are online to assist.</p>
              <a href="/contact" className="hp-contact-btn">
                Contact SmartMove <ArrowRight size={16} />
              </a>
            </div>
          </aside>

          {/* Detailed features */}
          <main className="hp-main">
            <h2 className="hp-section-title">Step-by-Step Feature Guides</h2>
            <div className="hp-accordion">
              {FEATURE_GUIDES.map((fg) => {
                const IconComponent = fg.icon;
                const isOpen = openSection === fg.id;

                return (
                  <div key={fg.id} className={`hp-card ${isOpen ? "hp-card--open" : ""}`}>
                    <button 
                      onClick={() => toggleSection(fg.id)}
                      className="hp-card-trigger"
                    >
                      <div className="hp-card-title-row">
                        <div className="hp-card-icon-wrapper">
                          <IconComponent size={20} />
                        </div>
                        <div className="hp-card-info text-left">
                          <h4>{fg.title}</h4>
                          <p>{fg.shortDesc}</p>
                        </div>
                      </div>
                      <div className="hp-card-arrow">
                        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="hp-card-body">
                        <div className="hp-divider" />
                        
                        <div className="hp-grid">
                          <div>
                            <h5>How to Use:</h5>
                            <ol className="hp-steps-list">
                              {fg.steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h5>Pro Tips:</h5>
                            <ul className="hp-tips-list">
                              {fg.tips.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>

                            <div className="hp-tech-callout">
                              <h6>Data Pipeline &amp; Tech:</h6>
                              <p>{fg.techOverview}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </GuestLayout>
  );
}

function HelpCSS() {
  return (
    <style>{`
      .hp-wrapper {
        background: var(--ui-surface-page);
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        line-height: 1.8;
        padding-bottom: 100px;
      }
      .hp-hero {
        max-width: 1200px;
        margin: 0 auto;
        padding: 100px 40px 48px;
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .hp-hero-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(32px, 5vw, 52px);
        font-weight: 700;
        color: var(--ui-content-strong);
        margin: 16px 0 8px;
        line-height: 1.1;
      }
      .hp-hero-sub {
        font-size: 16px;
        color: var(--ui-content-secondary);
        max-width: 700px;
      }

      .hp-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 48px 40px;
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 48px;
        align-items: start;
      }

      .hp-sidebar-card {
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 32px;
        box-shadow: var(--ui-shadow-card);
      }
      .hp-sidebar-card h3 {
        font-family: var(--ui-font-logo);
        font-size: 18px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 12px;
      }
      .hp-sidebar-card p {
        font-size: 14px;
        color: var(--ui-content-secondary);
        margin-bottom: 24px;
      }
      .hp-contact-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--ui-brand-primary);
        color: var(--ui-content-on-brand);
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .hp-contact-btn:hover {
        transform: translateY(-2px);
        opacity: 0.95;
      }

      .hp-main {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .hp-section-title {
        font-family: var(--ui-font-logo);
        font-size: 24px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 8px;
      }

      .hp-accordion {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .hp-card {
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: var(--ui-shadow-card);
      }
      .hp-card--open {
        border-color: var(--ui-brand-primary);
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.08);
      }
      .hp-card-trigger {
        background: none;
        border: none;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px;
        cursor: pointer;
        font-family: inherit;
      }
      .hp-card-title-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .hp-card-icon-wrapper {
        background: var(--ui-surface-muted);
        color: var(--ui-brand-primary);
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }
      .hp-card--open .hp-card-icon-wrapper {
        background: var(--ui-brand-primary);
        color: var(--ui-content-on-brand);
      }
      .hp-card-info h4 {
        font-family: var(--ui-font-logo);
        font-size: 17px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 4px;
      }
      .hp-card-info p {
        font-size: 13.5px;
        color: var(--ui-content-muted);
        margin: 0;
      }
      .hp-card-arrow {
        color: var(--ui-content-muted);
      }

      .hp-divider {
        height: 1px;
        background: var(--ui-border-subtle);
        margin: 0 24px;
      }

      .hp-card-body {
        padding: 24px;
      }
      .hp-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
      }
      @media (max-width: 900px) {
        .hp-grid {
          grid-template-columns: 1fr;
          gap: 24px;
        }
      }

      .hp-card-body h5 {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin-bottom: 16px;
      }

      .hp-steps-list {
        padding-left: 20px;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .hp-steps-list li {
        font-size: 14px;
        color: var(--ui-content-secondary);
      }

      .hp-tips-list {
        list-style: none;
        padding-left: 0;
        margin: 0 0 24px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .hp-tips-list li {
        font-size: 14px;
        color: var(--ui-content-secondary);
        position: relative;
        padding-left: 18px;
      }
      .hp-tips-list li::before {
        content: "⚡";
        position: absolute;
        left: 0;
        top: 0;
      }

      .hp-tech-callout {
        background: var(--ui-surface-muted);
        border-left: 3px solid var(--ui-brand-primary);
        padding: 16px;
        border-radius: 0 8px 8px 0;
      }
      .hp-tech-callout h6 {
        font-size: 12px;
        font-weight: 700;
        color: var(--ui-content-strong);
        margin: 0 0 4px 0;
        text-transform: uppercase;
      }
      .hp-tech-callout p {
        font-size: 12px;
        color: var(--ui-content-muted);
        margin: 0;
        line-height: 1.6;
      }

      @media (max-width: 900px) {
        .hp-container {
          grid-template-columns: 1fr;
          gap: 32px;
          padding: 32px 24px;
        }
        .hp-hero {
          padding: 100px 24px 32px;
        }
      }
    `}</style>
  );
}
