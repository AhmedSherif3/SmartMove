"use client";
/* eslint-disable react-hooks/set-state-in-effect */

/**
 * GuestHome.tsx — SmartMove Landing Page
 * All colors, fonts, and shadows use globals.css variables.
 */

import type { CSSProperties } from "react";
import { useEffect, useState, useRef } from "react";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { getAuthSession } from "@/lib/auth/session";
import { normalizeRole } from "@/components/layout/DashboardLayoutParts";
import { FeaturesShowcase } from "./FeaturesShowcase";
import { ScrollReveal, TiltCard, SpotlightCard, ScrambleText } from "./GuestAnimations";
import { motion, useInView } from "framer-motion";


const MARKETS = [
  {
    flag: "UK",
    country: "England",
    accent: "var(--ui-brand-primary)",
    desc: "From London prime to regional gems — track the entire UK market with granular detail.",
    stats: [
      { label: "Avg Price", value: "GBP 482K" },
      { label: "Listings", value: "18.4K" },
      { label: "YoY Growth", value: "+3.2%" },
      { label: "ROI Index", value: "6.8%" },
    ],
  },
  {
    flag: "UAE",
    country: "Dubai / UAE",
    accent: "var(--ui-brand-secondary)",
    desc: "The fastest-growing luxury market globally. Every district tracked in real time.",
    stats: [
      { label: "Avg Price", value: "AED 1.2M" },
      { label: "Listings", value: "22.1K" },
      { label: "YoY Growth", value: "+5.7%" },
      { label: "ROI Index", value: "9.2%" },
    ],
  },
  {
    flag: "EGY",
    country: "Egypt",
    accent: "var(--ui-brand-accent)",
    desc: "Egypt's emerging market is growing faster than any other. Early movers win here.",
    stats: [
      { label: "Avg Price", value: "EGP 4.8M" },
      { label: "Listings", value: "7.7K" },
      { label: "YoY Growth", value: "+14.2%" },
      { label: "ROI Index", value: "11.4%" },
    ],
  },
];


const FAQS = [
  {
    q: "What markets does SmartMove cover?",
    a: "SmartMove covers three major real estate markets: England (UK), Dubai (UAE), and Egypt. Each has dedicated dashboards with live data, investment scoring, and cross-market comparison tools.",
  },
  {
    q: "What is MoveIQ?",
    a: "MoveIQ is SmartMove's built-in AI assistant. Ask it anything in plain English — it retrieves live data, generates charts, and delivers investment-ready answers connected directly to the data warehouse.",
  },
  {
    q: "Can I upload my own datasets?",
    a: "Yes. The Cloud Workspace lets you upload CSV files, organize them in folders, and run them through the Analytics Pro Engine. It validates, cleans, and transforms your data, then auto-generates dashboards.",
  },
  {
    q: "What's the difference between User and Analyst roles?",
    a: "User accounts access the core dashboard and basic MoveIQ. The Analyst Upgrade unlocks the full Analyst portal, advanced AI queries, deeper data history, and the Agentic Analytics engine.",
  },
  {
    q: "Can I subscribe to upgrades individually?",
    a: "Yes. Buy the Analyst Upgrade, Storage Boost, or AutoReport individually.",
  },
  {
    q: "How do automated reports work?",
    a: "AutoReport generates weekly or monthly PDF market reports and sends them to your registered email. Reports include KPI summaries, price trends, investment highlights, and cross-market comparisons.",
  },
  {
    q: "Is my data secure?",
    a: "All data is stored in Microsoft Azure with encryption at rest and in transit. Uploaded datasets are in isolated workspaces, never shared between users. We are GDPR-compliant.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. All upgrades are monthly subscriptions with no lock-in. Cancel or change your plan any time from account settings.",
  },
];

export function GuestHome({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [portalPath, setPortalPath] = useState("/dashboard");

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setPortalPath(`/${normalizeRole(session.role)}`);
    }
  }, [isAuthenticated]);

  return (
    <GuestLayout isAuthenticated={isAuthenticated}>
      <HomeCSS />
      <HeroSection auth={isAuthenticated} portalPath={portalPath} />
      <ScrollReveal><StatsBand /></ScrollReveal>
      <DataRiver />
      <ScrollReveal><FeaturesShowcase /></ScrollReveal>
      <ScrollReveal><HowItWorks /></ScrollReveal>
      <ScrollReveal><MarketsSection /></ScrollReveal>
      <ScrollReveal><FAQSection /></ScrollReveal>
      <ScrollReveal><CTASection auth={isAuthenticated} portalPath={portalPath} /></ScrollReveal>
    </GuestLayout>
  );
}

function HeroSection({ auth, portalPath }: { auth: boolean; portalPath: string }) {
  return (
    <section className="hero">
      <div className="hero-mesh" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>

      <div className="hero-grid" aria-hidden="true" />

      {/* CSS City Silhouette Ring */}
      <div className="hero-city-ring" aria-hidden="true">
        <div className="city-landmark-wrapper" style={{ "--start-deg": "0deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">London Eye</span>
            <svg width="44" height="54" viewBox="0 0 44 54" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-primary)" strokeLinecap="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite" }}
            >
              <defs>
                <filter id="lm-glow-blue">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-blue)">
                {/* Main wheel rim */}
                <circle cx="22" cy="22" r="20" strokeWidth="1.8" />
                {/* Central hub */}
                <circle cx="22" cy="22" r="3.5" strokeWidth="1.2" />
                {/* spokes */}
                <line x1="22" y1="18.5" x2="22" y2="2" strokeWidth="0.9" />
                <line x1="24.5" y1="19.5" x2="36" y2="8" strokeWidth="0.9" />
                <line x1="25.5" y1="22" x2="42" y2="22" strokeWidth="0.9" />
                <line x1="24.5" y1="24.5" x2="36" y2="36" strokeWidth="0.9" />
                <line x1="22" y1="25.5" x2="22" y2="42" strokeWidth="0.9" />
                <line x1="19.5" y1="24.5" x2="8" y2="36" strokeWidth="0.9" />
                <line x1="18.5" y1="22" x2="2" y2="22" strokeWidth="0.9" />
                <line x1="19.5" y1="19.5" x2="8" y2="8" strokeWidth="0.9" />
                {/* Small capsule dots at rim */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                  const r = 20, cx = 22, cy = 22;
                  const rad = (deg - 90) * Math.PI / 180;
                  return <circle key={i} cx={cx + r * Math.cos(rad)} cy={cy + r * Math.sin(rad)} r="2.2" strokeWidth="1" />;
                })}
                {/* A-frame support legs */}
                <line x1="22" y1="42" x2="22" y2="46" strokeWidth="1.4" />
                <line x1="22" y1="46" x2="10" y2="54" strokeWidth="1.5" />
                <line x1="22" y1="46" x2="34" y2="54" strokeWidth="1.5" />
                {/* Ground line */}
                <line x1="4" y1="54" x2="40" y2="54" strokeWidth="1" />
              </g>
            </svg>
          </div>
        </div>
        <div className="city-landmark-wrapper" style={{ "--start-deg": "60deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">Big Ben</span>
            <svg width="24" height="60" viewBox="0 0 24 60" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-primary)" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite", animationDelay: "0.5s" }}
            >
              <defs>
                <filter id="lm-glow-blue-ben">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-blue-ben)">
                {/* Ground line */}
                <line x1="0" y1="59" x2="24" y2="59" strokeWidth="1" />
                {/* Main tower body */}
                <path d="M 4,59 V 38 H 2 V 26 H 4 V 20 H 20 V 26 H 22 V 38 H 20 V 59" strokeWidth="1.6" />
                {/* Clock face circle */}
                <circle cx="12" cy="23" r="4.5" strokeWidth="1.2" />
                {/* Clock hands */}
                <line x1="12" y1="23" x2="12" y2="19.5" strokeWidth="0.9" />
                <line x1="12" y1="23" x2="15" y2="23" strokeWidth="0.9" />
                {/* Belfry windows */}
                <path d="M 6,32 V 28 Q 7,26 8,28 V 32" strokeWidth="0.9" opacity="0.7" />
                <path d="M 16,32 V 28 Q 17,26 18,28 V 32" strokeWidth="0.9" opacity="0.7" />
                {/* Gothic spire */}
                <path d="M 4,20 L 12,2 L 20,20" strokeWidth="1.5" />
                {/* Horizontal decorative band */}
                <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1" />
                {/* Flag at top */}
                <line x1="12" y1="2" x2="12" y2="0" strokeWidth="1" />
                <path d="M 12,0 L 18,1.5 L 12,3" strokeWidth="0.7" opacity="0.8" />
              </g>
            </svg>
          </div>
        </div>
        <div className="city-landmark-wrapper" style={{ "--start-deg": "120deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">Burj Khalifa</span>
            <svg width="40" height="64" viewBox="0 0 40 64" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-secondary)" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite", animationDelay: "1s" }}
            >
              <defs>
                <filter id="lm-glow-teal">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-teal)">
                {/* Ground line */}
                <line x1="0" y1="63" x2="40" y2="63" strokeWidth="1" />
                {/* Full stepped silhouette outline */}
                <path d="M 20,0 L 20,6 L 22,6 L 22,16 L 25,16 L 25,28 L 28,28 L 28,42 L 31,42 L 31,63 L 9,63 L 9,42 L 12,42 L 12,28 L 15,28 L 15,16 L 18,16 L 18,6 Z" strokeWidth="1.8" />
                {/* Setback ledge emphasis lines */}
                <line x1="18" y1="6"  x2="22" y2="6"  strokeWidth="1.2" />
                <line x1="15" y1="16" x2="25" y2="16" strokeWidth="1.2" />
                <line x1="12" y1="28" x2="28" y2="28" strokeWidth="1.2" />
                <line x1="9"  y1="42" x2="31" y2="42" strokeWidth="1.2" />
                {/* Thin antenna above step */}
                <line x1="20" y1="0" x2="20" y2="-4" strokeWidth="1" />
                {/* Subtle vertical texture lines */}
                <line x1="20" y1="6" x2="20" y2="63" strokeWidth="0.6" opacity="0.3" />
              </g>
            </svg>
          </div>
        </div>
        <div className="city-landmark-wrapper" style={{ "--start-deg": "180deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">Burj Al Arab</span>
            <svg width="40" height="60" viewBox="0 0 40 60" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-secondary)" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite", animationDelay: "1.5s" }}
            >
              <defs>
                <filter id="lm-glow-teal-arab">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-teal-arab)">
                {/* Ground line */}
                <line x1="0" y1="59" x2="40" y2="59" strokeWidth="1" />
                {/* Outer curved sail face */}
                <path d="M 8,59 C 4,50 2,38 4,24 C 6,10 14,3 20,2" strokeWidth="1.8" />
                {/* Inner vertical face */}
                <path d="M 20,2 L 28,2 L 28,59" strokeWidth="1.8" />
                {/* Helipad extending right */}
                <line x1="28" y1="6" x2="38" y2="6" strokeWidth="1.8" />
                <line x1="38" y1="4" x2="38" y2="8" strokeWidth="1.2" />
                {/* X-bracing cross */}
                <line x1="8" y1="59" x2="20" y2="22" strokeWidth="0.9" opacity="0.6" />
                <line x1="4" y1="28" x2="26" y2="59" strokeWidth="0.9" opacity="0.6" />
                {/* Base support column */}
                <line x1="8" y1="59" x2="28" y2="59" strokeWidth="1.5" />
                <line x1="14" y1="50" x2="14" y2="59" strokeWidth="1.2" />
                <line x1="22" y1="50" x2="22" y2="59" strokeWidth="1.2" />
              </g>
            </svg>
          </div>
        </div>
        <div className="city-landmark-wrapper" style={{ "--start-deg": "240deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">Pyramids of Giza</span>
            <svg width="52" height="44" viewBox="0 0 52 44" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-accent)" strokeLinecap="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite", animationDelay: "2s" }}
            >
              <defs>
                <filter id="lm-glow-purple">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-purple)">
                {/* Ground + sand dune base */}
                <line x1="0" y1="43" x2="52" y2="43" strokeWidth="1" />
                <path d="M 0,43 Q 13,40 26,43 Q 39,46 52,43" strokeWidth="0.8" opacity="0.5" />
                {/* Main triangle outline */}
                <path d="M 0,43 L 26,1 L 52,43 Z" strokeWidth="1.8" />
                {/* Internal horizontal course lines */}
                {[0.22, 0.40, 0.56, 0.70, 0.83].map((t, i) => {
                  const y = 1 + t * 42;
                  const halfW = t * 26;
                  return <line key={i} x1={26 - halfW} y1={y} x2={26 + halfW} y2={y} strokeWidth="0.9" opacity={0.55 - i * 0.06} />;
                })}
                {/* Capstone bright dot */}
                <circle cx="26" cy="1" r="2.5" stroke="var(--ui-brand-accent)" strokeWidth="1.5" fill="var(--ui-brand-accent)" opacity="0.9" />
                {/* Small second pyramid suggestion */}
                <path d="M 36,43 L 48,28 L 60,43" strokeWidth="0.8" opacity="0.25" />
              </g>
            </svg>
          </div>
        </div>
        <div className="city-landmark-wrapper" style={{ "--start-deg": "300deg" } as CSSProperties}>
          <div className="landmark-container">
            <span className="landmark-name">Global Markets</span>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none"
              overflow="visible" display="block"
              stroke="var(--ui-brand-accent)" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: "lm-breathe 3.5s ease-in-out infinite", animationDelay: "2.5s" }}
            >
              <defs>
                <filter id="lm-glow-purple-earth">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g filter="url(#lm-glow-purple-earth)">
                {/* Ground line */}
                <line x1="0" y1="43" x2="44" y2="43" strokeWidth="1" />
                {/* Outer circle of the Earth */}
                <circle cx="22" cy="22" r="18" strokeWidth="1.8" />
                {/* Latitude horizontal lines */}
                <path d="M 5.5,16 H 38.5" strokeWidth="1" opacity="0.6" />
                <path d="M 5.5,28 H 38.5" strokeWidth="1" opacity="0.6" />
                <path d="M 4,22 H 40" strokeWidth="1.2" />
                {/* Longitude vertical curved lines (grid) */}
                <path d="M 22,4 A 18 18 0 0 0 22,40" strokeWidth="1.2" />
                <path d="M 22,4 A 32 32 0 0 0 22,40" strokeWidth="0.8" opacity="0.5" />
                <path d="M 22,4 A 32 32 0 0 1 22,40" strokeWidth="0.8" opacity="0.5" />
                {/* Suggestion of continents / map outlines inside the globe */}
                <path d="M 10,12 Q 13,10 16,13 T 13,20 Q 9,18 10,12 Z" strokeWidth="0.8" opacity="0.4" fill="var(--ui-brand-accent)" fillOpacity="0.1" />
                <path d="M 28,18 Q 32,15 35,20 T 31,28 Q 28,24 28,18 Z" strokeWidth="0.8" opacity="0.4" fill="var(--ui-brand-accent)" fillOpacity="0.1" />
                <path d="M 18,30 Q 22,29 20,33 T 16,35 Z" strokeWidth="0.8" opacity="0.4" fill="var(--ui-brand-accent)" fillOpacity="0.1" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* 5 Orbit Rings Fix */}
      <div className="hero-orbit-container" aria-hidden="true">
        <div className="orbit-wrapper orbit-wrapper-1 orbit-odd">
          <div className="hero-orbit orbit-1" />
          <div className="orbit-dot dot-1 dot-a" />
          <div className="orbit-dot dot-1 dot-b" />
          <div className="orbit-dot dot-1 dot-c" />
        </div>
        <div className="orbit-wrapper orbit-wrapper-2 orbit-even">
          <div className="hero-orbit orbit-2" />
          <div className="orbit-dot dot-2 dot-a" />
          <div className="orbit-dot dot-2 dot-b" />
          <div className="orbit-dot dot-2 dot-c" />
        </div>
        <div className="orbit-wrapper orbit-wrapper-3 orbit-odd">
          <div className="hero-orbit orbit-3" />
          <div className="orbit-dot dot-3 dot-a" />
          <div className="orbit-dot dot-3 dot-b" />
          <div className="orbit-dot dot-3 dot-c" />
        </div>
        <div className="orbit-wrapper orbit-wrapper-4 orbit-even">
          <div className="hero-orbit orbit-4" />
          <div className="orbit-dot dot-4 dot-a" />
          <div className="orbit-dot dot-4 dot-b" />
          <div className="orbit-dot dot-4 dot-c" />
        </div>
        <div className="orbit-wrapper orbit-wrapper-5 orbit-odd">
          <div className="hero-orbit orbit-5" />
          <div className="orbit-dot dot-5 dot-a" />
          <div className="orbit-dot dot-5 dot-b" />
          <div className="orbit-dot dot-5 dot-c" />
        </div>
      </div>
      <div className="hero-sheen" aria-hidden="true" />

      <div className="hero-cards" aria-hidden="true">
        <StatCard
          cls="sc1"
          label="Dubai ROI"
          value="9.2%"
          delta="Up 1.1% vs Q3"
          color="var(--ui-brand-secondary)"
        />
        <StatCard
          cls="sc2"
          label="London Avg"
          value="GBP 482K"
          delta="Up 3.2% YoY"
          color="var(--ui-brand-primary)"
        />
        <StatCard
          cls="sc3"
          label="Cairo Growth"
          value="+14.2%"
          delta="Fastest market"
          color="var(--ui-brand-accent)"
        />
        <StatCard
          cls="sc4"
          label="Total Listings"
          value="48.2K"
          delta="3 markets live"
          color="var(--ui-status-warning)"
        />
      </div>

      <div className="hero-content">
        <div className="hero-pill">
          <span className="hero-dot" />
          Powered by MoveIQ AI · Azure · SSAS
          <motion.span
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.6, duration: 0.3 }}
            className="hero-badge"
          >
            ✓ COMPILED
          </motion.span>
        </div>

        <h1 className="hero-h1">
          <ScrambleText text="Real Estate Intelligence" speed={65} scrambleStep={0.85} />
          <br />
          <span className="hero-gradient">
            <ScrambleText text="Across Three Markets" speed={65} scrambleStep={0.85} />
          </span>
        </h1>

        <p className="hero-p">
          SmartMove combines AI-powered analytics, cloud workspaces, and live property data for
          England, Dubai, and Egypt — in one platform.
        </p>

        <div className="hero-markets">
          <span>England</span>
          <span className="hero-sep">·</span>
          <span>Dubai</span>
          <span className="hero-sep">·</span>
          <span>Egypt</span>
        </div>

        <div className="hero-ctas">
          {auth ? (
            <a href={portalPath} className="g-btn g-btn-primary g-btn-lg">
              Back to Portal →
            </a>
          ) : (
            <>
              <a href="/authentication/register" className="g-btn g-btn-primary g-btn-lg">
                Start for Free
              </a>
              <a href="#features" className="g-btn g-btn-outline g-btn-lg">
                See How It Works
              </a>
            </>
          )}
        </div>
        <p className="hero-note">No credit card required · Free to get started</p>
      </div>
    </section>
  );
}

function StatCard({
  cls,
  label,
  value,
  delta,
  color,
}: {
  cls: string;
  label: string;
  value: string;
  delta: string;
  color: string;
}) {
  return (
    <TiltCard className={`sc ${cls}`}>
      <div className="sc-label">{label}</div>
      <div className="sc-value" style={{ color }}>
        {value}
      </div>
      <div className="sc-delta">{delta}</div>
    </TiltCard>
  );
}

const STATS = [
  { label: "Properties Tracked", value: "48.2K" },
  { label: "Markets Covered", value: "3" },
  { label: "AI Queries Daily", value: "1,200+" },
  { label: "Avg ROI Identified", value: "9.1%" },
  { label: "Data Points", value: "1.2M+" },
];

function StatsBand() {
  return (
    <div className="stats-band">
      <div className="blueprint-bg" aria-hidden="true" />
      {STATS.map((s, i) => (
        <div key={i} className="stats-item">
          <div className="stats-value">
            <ScrambleText text={s.value} characters="0123456789%K+M" speed={40} />
          </div>
          <div className="stats-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}


const STEPS = [
  {
    n: "01",
    icon: "Data",
    title: "Connect Your Data",
    desc: "Upload CSV files or connect directly to SmartMove's pre-built Azure warehouse covering three live markets.",
  },
  {
    n: "02",
    icon: "Ask",
    title: "Ask or Explore",
    desc: "Use MoveIQ to ask questions in plain English, or let the Agentic engine auto-generate a full dashboard.",
  },
  {
    n: "03",
    icon: "Decide",
    title: "Decide with Confidence",
    desc: "Investment scores, trend forecasts, and comparative KPIs give you everything you need to act — not just observe.",
  },
];

function HowItWorks() {
  return (
    <section className="g-section hiw" id="how" style={{ position: "relative", overflow: "hidden" }}>
      {/* Animated illuminated background connecting path */}
      <div
        className="hiw-line-wrap"
        style={{
          position: "absolute",
          top: "60%",
          left: "15%",
          right: "15%",
          height: "2px",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <svg width="100%" height="20" fill="none" style={{ overflow: "visible" }}>
          <path
            d="M 0 10 Q 300 0, 600 10 T 1200 10"
            stroke="var(--ui-brand-primary)"
            strokeWidth="3"
            strokeDasharray="8 8"
            style={{
              opacity: 0.25,
              animation: "hiw-line-flow 8s linear infinite",
            }}
          />
        </svg>
      </div>

      <div className="g-section-inner" style={{ position: "relative", zIndex: 1 }}>
        <div className="g-section-header">
          <div className="g-tag">How It Works</div>
          <h2 className="g-h2">From data to decision in minutes</h2>
        </div>
        <div className="hiw-grid">
          {STEPS.map((s, i) => (
            <SpotlightCard
              key={i}
              className="hiw-step-card-wrapper"
              spotlightColor="rgba(45, 212, 191, 0.12)"
              size={300}
            >
              <div className="hiw-step">
                <div className="hiw-num">{s.n}</div>
                <div className="hiw-icon">{s.icon}</div>
                <h3 className="hiw-title">{s.title}</h3>
                <p className="hiw-desc">{s.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketsSection() {
  return (
    <section className="g-section" id="markets">
      <div className="g-section-inner">
        <div className="g-section-header">
          <div className="g-tag">Live Markets</div>
          <h2 className="g-h2">Three markets. One platform.</h2>
          <p className="g-sub">Real-time property intelligence with cross-market comparison built in.</p>
        </div>
        <div className="mkt-grid">
          {MARKETS.map((m, i) => (
            <div key={i} className="mkt-card" style={{ "--ma": m.accent } as CSSProperties}>
              <div className="mkt-header">
                <span className="mkt-flag">{m.flag}</span>
                <div>
                  <div className="mkt-country">{m.country}</div>
                  <div className="mkt-live">
                    <span className="mkt-dot" style={{ background: m.accent }} />
                    Live data
                  </div>
                </div>
              </div>
              <p className="mkt-desc">{m.desc}</p>
              <div className="mkt-stats">
                {m.stats.map((s, j) => (
                  <div key={j} className="mkt-stat">
                    <div className="mkt-val" style={{ color: m.accent }}>
                      {s.value}
                    </div>
                    <div className="mkt-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="feat-bar" style={{ background: "color-mix(in srgb, var(--ui-content-primary) 8%, transparent)" }}>
                <div
                  className="feat-bar-pulse"
                  style={{
                    background: `linear-gradient(to right, transparent, ${m.accent} 80%, #ffffff 100%)`,
                    boxShadow: `0 0 16px 3px ${m.accent}`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="g-section" id="faq">
      <div className="g-section-inner" style={{ maxWidth: 800, alignSelf: "center", width: "100%" }}>
        <div className="g-section-header">
          <div className="g-tag">FAQ</div>
          <h2 className="g-h2">Common questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((item, i) => (
            <div key={i} className={`faq-item${open === i ? " faq-open" : ""}`}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  {open === i ? "-" : "+"}
                </span>
              </button>
              <div className="faq-a-wrapper">
                <div className="faq-a-inner">
                  <div className="faq-a">{item.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function CTASection({ auth, portalPath }: { auth: boolean; portalPath: string }) {
  return (
    <section className="cta-section">
      <div className="cta-blob cb1" aria-hidden="true" />
      <div className="cta-blob cb2" aria-hidden="true" />
      <div className="cta-inner">
        <h2 className="cta-h2">Ready to see your markets clearly?</h2>
        <p className="cta-p">Join SmartMove. Start free. Upgrade when you are ready.</p>
        <div className="cta-btns">
          {auth ? (
            <a href={portalPath} className="g-btn g-btn-primary g-btn-lg">
              Back to Portal →
            </a>
          ) : (
            <>
              <a href="/authentication/register" className="g-btn g-btn-primary g-btn-lg">
                Create Free Account
              </a>
              <a href="/contact" className="g-btn g-btn-outline g-btn-lg">
                Talk to Us
              </a>
            </>
          )}
        </div>
        <div className="cta-flags">England · UAE · Egypt</div>
      </div>
    </section>
  );
}

function HomeCSS() {
  return (
    <style>{`
      .hero {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 120px 40px 80px;
      }
      @media (max-width: 768px) {
        .hero {
          padding: 100px 20px 60px;
        }
      }
      .hero-mesh {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(36px);
        animation: blob-pulse 14s ease-in-out infinite alternate;
        will-change: transform, opacity;
      }
      @keyframes blob-pulse {
        0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
        50% { transform: scale(1.05) translate(15px, -15px); opacity: 1; }
        100% { transform: scale(0.95) translate(-15px, 15px); opacity: 0.8; }
      }
      .b1 {
        width: 640px;
        height: 640px;
        top: -180px;
        left: -80px;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-brand-primary) 26%, transparent) 0%,
          transparent 68%
        );
      }
      .b2 {
        width: 520px;
        height: 520px;
        top: 80px;
        right: -60px;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-brand-secondary) 20%, transparent) 0%,
          transparent 68%
        );
      }
      .b3 {
        width: 480px;
        height: 480px;
        bottom: -80px;
        left: 28%;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-brand-accent) 18%, transparent) 0%,
          transparent 68%
        );
      }
      .b4 {
        width: 360px;
        height: 360px;
        top: 48%;
        right: 22%;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-status-warning) 14%, transparent) 0%,
          transparent 68%
        );
      }

      .hero-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(
            color-mix(in srgb, var(--ui-brand-primary) 6%, transparent) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            color-mix(in srgb, var(--ui-brand-primary) 6%, transparent) 1px,
            transparent 1px
          );
        background-size: 60px 60px;
        opacity: 0.6;
      }

      .hero-sheen {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(
            600px 420px at 20% 20%,
            color-mix(in srgb, var(--ui-brand-primary) 18%, transparent),
            transparent 60%
          ),
          radial-gradient(
            520px 360px at 80% 30%,
            color-mix(in srgb, var(--ui-brand-secondary) 16%, transparent),
            transparent 62%
          ),
          radial-gradient(
            460px 380px at 50% 80%,
            color-mix(in srgb, var(--ui-brand-accent) 12%, transparent),
            transparent 70%
          );
        opacity: 0.75;
      }

      /* ── Orbit ring container ──────────────────────────────────────── */
      .hero-orbit-container {
        position: absolute;
        left: 50%;
        top: 50%;
        /* The container has zero dimensions — all rings offset from this point */
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 1;
      }

      /* ── Shared ring base (static within rotating wrapper) ────────── */
      .orbit-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform: translate3d(0, 0, 0);
      }
      .orbit-wrapper-1 { --ring-dur: 36s; --ring-r: 76px;  --ring-size: 152px; --ring-offset: -76px; }
      .orbit-wrapper-2 { --ring-dur: 29s; --ring-r: 132px; --ring-size: 264px; --ring-offset: -132px; }
      .orbit-wrapper-3 { --ring-dur: 46s; --ring-r: 187px; --ring-size: 374px; --ring-offset: -187px; }
      .orbit-wrapper-4 { --ring-dur: 33s; --ring-r: 242px; --ring-size: 484px; --ring-offset: -242px; }
      .orbit-wrapper-5 { --ring-dur: 54s; --ring-r: 298px; --ring-size: 596px; --ring-offset: -298px; }

      @media (max-width: 768px) {
        .orbit-wrapper-1 { --ring-r: 30px;  --ring-size: 60px;  --ring-offset: -30px; }
        .orbit-wrapper-2 { --ring-r: 54px;  --ring-size: 108px; --ring-offset: -54px; }
        .orbit-wrapper-3 { --ring-r: 78px;  --ring-size: 156px; --ring-offset: -78px; }
        .orbit-wrapper-4 { --ring-r: 102px; --ring-size: 204px; --ring-offset: -102px; }
        .orbit-wrapper-5 { --ring-r: 126px; --ring-size: 252px; --ring-offset: -126px; }
      }

      /* ── ODD wrapper rotation ─────────────────────────────────────── */
      .orbit-odd {
        animation: orbit-cw var(--ring-dur, 40s) linear infinite;
      }

      /* ── EVEN wrapper rotation ────────────────────────────────────── */
      .orbit-even {
        animation: orbit-ccw var(--ring-dur, 40s) linear infinite;
      }

      .hero-orbit {
        position: absolute;
        border-radius: 50%;
        opacity: 0.35;
        width: var(--ring-size);
        height: var(--ring-size);
        top: var(--ring-offset);
        left: var(--ring-offset);
      }

      /* Odd ring conic gradient + shadow */
      .orbit-1, .orbit-3, .orbit-5 {
        background: conic-gradient(
          from 0deg,
          var(--ui-brand-primary)                                    0%,
          var(--ui-brand-accent)                                    38%,
          color-mix(in srgb, var(--ui-brand-primary) 70%, var(--ui-brand-accent)) 62%,
          var(--ui-brand-accent)                                    80%,
          var(--ui-brand-primary)                                  100%
        );
        filter: drop-shadow(0 0 5px color-mix(in srgb, var(--ui-brand-primary) 25%, transparent));
      }

      /* Even ring conic gradient + shadow */
      .orbit-2, .orbit-4 {
        background: conic-gradient(
          from 180deg,
          var(--ui-brand-secondary)                                   0%,
          var(--ui-status-warning)                                   40%,
          color-mix(in srgb, var(--ui-brand-secondary) 70%, var(--ui-status-warning)) 68%,
          var(--ui-status-warning)                                   84%,
          var(--ui-brand-secondary)                                 100%
        );
        filter: drop-shadow(0 0 5px color-mix(in srgb, var(--ui-brand-secondary) 25%, transparent));
      }

      /* ── Orbit Dot (satellites riding the rings) ──────────────────── */
      .orbit-dot {
        position: absolute;
        top: 0;
        left: 0;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        z-index: 2;
        will-change: transform;
      }

      /* Odd ring dots: high-intensity primary/accent glow */
      .dot-1, .dot-3, .dot-5 {
        background: #ffffff;
        box-shadow: 
          0 0 6px #ffffff,
          0 0 12px var(--ui-brand-primary),
          0 0 18px var(--ui-brand-accent);
      }

      /* Even ring dots: high-intensity secondary/warning glow */
      .dot-2, .dot-4 {
        background: #ffffff;
        box-shadow: 
          0 0 6px #ffffff,
          0 0 12px var(--ui-brand-secondary),
          0 0 18px var(--ui-status-warning);
      }

      /* ── Angle offsets for 3 distributed dots ─────────────────────── */
      .dot-a { transform: translate(-50%, -50%) rotate(0deg) translateY(calc(-1 * var(--ring-r))); }
      .dot-b { transform: translate(-50%, -50%) rotate(120deg) translateY(calc(-1 * var(--ring-r))); }
      .dot-c { transform: translate(-50%, -50%) rotate(240deg) translateY(calc(-1 * var(--ring-r))); }

      /* ── Individual ring sizes + mask ──────────────────────────────── */
      /* Ring 1  —  Ø 180px  —  R = 90  */
      .orbit-1 {
        mask-image: radial-gradient(circle closest-side,
          transparent 87.7%,   /* transparent up to ~79px */
          black       91.1%,   /* opaque from ~82px to 90px */
          black       100%
        );
        -webkit-mask-image: radial-gradient(circle closest-side,
          transparent 87.7%, black 91.1%, black 100%
        );
      }

      /* Ring 2  —  Ø 310px  —  R = 155  */
      .orbit-2 {
        mask-image: radial-gradient(circle closest-side,
          transparent 92.9%,   /* transparent up to 144px */
          black       94.8%,   /* opaque from 147px to 155px */
          black       100%
        );
        -webkit-mask-image: radial-gradient(circle closest-side,
          transparent 92.9%, black 94.8%, black 100%
        );
      }

      /* Ring 3  —  Ø 440px  —  R = 220  */
      .orbit-3 {
        mask-image: radial-gradient(circle closest-side,
          transparent 95.0%,   /* transparent up to 209px */
          black       96.3%,   /* opaque from 212px to 220px */
          black       100%
        );
        -webkit-mask-image: radial-gradient(circle closest-side,
          transparent 95.0%, black 96.3%, black 100%
        );
      }

      /* Ring 4  —  Ø 570px  —  R = 285  */
      .orbit-4 {
        mask-image: radial-gradient(circle closest-side,
          transparent 96.1%,   /* transparent up to 274px */
          black       97.2%,   /* opaque from 277px to 285px */
          black       100%
        );
        -webkit-mask-image: radial-gradient(circle closest-side,
          transparent 96.1%, black 97.2%, black 100%
        );
      }

      /* Ring 5  —  Ø 700px  —  R = 350  */
      .orbit-5 {
        mask-image: radial-gradient(circle closest-side,
          transparent 96.8%,   /* transparent up to 339px */
          black       97.7%,   /* opaque from 342px to 350px */
          black       100%
        );
        -webkit-mask-image: radial-gradient(circle closest-side,
          transparent 96.8%, black 97.7%, black 100%
        );
      }

      /* ── Keyframes ─────────────────────────────────────────────────── */
      @keyframes orbit-cw  {
        from { transform: translate3d(0, 0, 0) rotate(0deg); }
        to   { transform: translate3d(0, 0, 0) rotate(360deg); }
      }
      @keyframes orbit-ccw {
        from { transform: translate3d(0, 0, 0) rotate(0deg); }
        to   { transform: translate3d(0, 0, 0) rotate(-360deg); }
      }

      .hero-cards {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      @media (max-width: 768px) {
        .hero-cards {
          display: none;
        }
      }
      .sc {
        position: absolute;
        background: var(--ui-surface-card);
        border: 1px solid color-mix(in srgb, var(--ui-brand-primary) 18%, transparent);
        border-radius: 14px;
        padding: 14px 18px;
        min-width: 148px;
        box-shadow: none;
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--ui-surface-card) 88%, transparent),
          color-mix(in srgb, var(--ui-surface-muted) 65%, transparent)
        );
        will-change: transform;
      }
      .sc-label {
        font-size: 11px;
        color: var(--ui-content-muted);
        margin-bottom: 6px;
        font-family: var(--ui-font-base);
      }
      .sc-value {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        line-height: 1;
      }
      .sc-delta {
        font-size: 11px;
        color: var(--ui-status-success);
        margin-top: 4px;
        font-family: var(--ui-font-base);
      }
      .sc1 {
        top: 18%;
        left: 6%;
        animation: float-sc1 10s ease-in-out infinite alternate;
      }
      .sc2 {
        top: 14%;
        right: 7%;
        animation: float-sc2 11s ease-in-out infinite alternate;
      }
      .sc3 {
        bottom: 22%;
        left: 4%;
        animation: float-sc3 9s ease-in-out infinite alternate;
      }
      .sc4 {
        bottom: 20%;
        right: 5%;
        animation: float-sc4 12s ease-in-out infinite alternate;
      }

      @keyframes float-sc1 {
        0% { transform: translate(0px, 0px) rotate(0.5deg); }
        100% { transform: translate(-45px, -55px) rotate(-4deg); }
      }
      @keyframes float-sc2 {
        0% { transform: translate(0px, 0px) rotate(-0.5deg); }
        100% { transform: translate(50px, -40px) rotate(4deg); }
      }
      @keyframes float-sc3 {
        0% { transform: translate(0px, 0px) rotate(-1deg); }
        100% { transform: translate(-55px, 45px) rotate(3.5deg); }
      }
      @keyframes float-sc4 {
        0% { transform: translate(0px, 0px) rotate(0.5deg); }
        100% { transform: translate(45px, 55px) rotate(-5deg); }
      }

      .hero-content {
        position: relative;
        z-index: 2;
        text-align: center;
        max-width: 760px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .hero-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: color-mix(in srgb, var(--ui-brand-primary) 10%, transparent);
        border: 1px solid color-mix(in srgb, var(--ui-brand-primary) 22%, transparent);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        color: var(--ui-brand-primary);
        letter-spacing: 0.06em;
        font-family: var(--ui-font-base);
      }
      .hero-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ui-status-success);
        animation: dp 2s ease infinite;
      }
      @keyframes dp {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.28;
        }
      }
      .hero-h1 {
        font-family: var(--ui-font-logo);
        font-size: clamp(36px, 6vw, 68px);
        font-weight: 700;
        line-height: 1.1;
        color: var(--ui-content-strong);
        letter-spacing: -0.02em;
      }
      .hero-gradient {
        background: linear-gradient(
          135deg,
          var(--ui-brand-primary) 0%,
          var(--ui-brand-secondary) 50%,
          var(--ui-brand-accent) 100%
        );
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: gs 6s ease infinite;
      }
      @keyframes gs {
        0%,
        100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }
      .hero-p {
        font-size: clamp(15px, 2vw, 19px);
        color: var(--ui-content-secondary);
        line-height: 1.75;
        max-width: 580px;
        font-family: var(--ui-font-base);
      }
      .hero-markets {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
        font-weight: 500;
      }
      .hero-sep {
        color: var(--ui-border-subtle);
      }
      .hero-ctas {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .hero-note {
        font-size: 12px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }
      
      .hero-badge {
        display: inline-flex;
        align-items: center;
        background: color-mix(in srgb, var(--ui-status-success) 15%, transparent);
        border: 1px solid var(--ui-status-success);
        color: var(--ui-status-success);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-left: 8px;
        font-family: var(--ui-font-logo);
      }

      .hero-city-ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(85vw, 720px);
        height: min(85vw, 720px);
        transform: translate(-50%, -50%);
        border-radius: 50%;
        border: 1px dashed color-mix(in srgb, var(--ui-content-muted) 15%, transparent);
        pointer-events: none;
        z-index: 1;
      }
      @media (max-width: 768px) {
        .hero-city-ring {
          width: min(90vw, 310px);
          height: min(90vw, 310px);
        }
      }
      .city-landmark-wrapper {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 40px;
        transform: translateX(-50%) rotate(var(--start-deg, 0deg));
        transform-origin: center center;
        animation: spin-landmark-wrapper 50s linear infinite;
        pointer-events: none;
        z-index: 1;
        transition: z-index 0.2s;
      }
      .city-landmark-wrapper:has(.landmark-container:hover) {
        animation-play-state: paused;
        z-index: 20;
      }
      /* Re-size .landmark-container to fit the largest SVG (Sphinx is 56x36) */
      .landmark-container {
        position: absolute;
        top: -15px;
        left: 50%;
        transform: translateX(-50%) rotate(calc(-1 * var(--start-deg, 0deg)));
        transform-origin: bottom center;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        height: auto;
        animation: spin-landmark-container 50s linear infinite;
        pointer-events: auto;
        cursor: pointer;
      }
      .landmark-container:hover {
        animation-play-state: paused;
      }
      .landmark-container svg {
        transform: scale(1.05);
        transform-origin: bottom center;
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .landmark-container:hover svg {
        transform: scale(1.32);
      }
      .landmark-name {
        position: absolute;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%) translateY(8px) scale(0.85);
        background: var(--ui-surface-card);
        border: 1px solid color-mix(in srgb, var(--ui-brand-primary) 30%, transparent);
        color: var(--ui-content-primary);
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: var(--ui-font-base);
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        z-index: 30;
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .landmark-container:hover .landmark-name {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }

      @keyframes spin-landmark-wrapper {
        from { transform: translateX(-50%) rotate(var(--start-deg, 0deg)); }
        to   { transform: translateX(-50%) rotate(calc(var(--start-deg, 0deg) + 360deg)); }
      }
      @keyframes spin-landmark-container {
        from { transform: translateX(-50%) rotate(calc(-1 * var(--start-deg, 0deg))); }
        to   { transform: translateX(-50%) rotate(calc(-1 * var(--start-deg, 0deg) - 360deg)); }
      }

      /* Shared landmark glow filter definitions are inline per SVG.
         Only the breathe animation is shared here: */
      @keyframes lm-breathe {
        0%,100% { opacity: 0.55; }
        50%      { opacity: 0.90; }
      }

      .stats-band {
        position: relative;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        background: var(--ui-surface-card);
        border-top: 1px solid var(--ui-border-subtle);
        border-bottom: 1px solid var(--ui-border-subtle);
        padding: 32px 40px;
        overflow: hidden;
      }
      .blueprint-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-color: color-mix(in srgb, var(--ui-brand-primary) 2%, transparent);
        background-image: 
          linear-gradient(color-mix(in srgb, var(--ui-brand-primary) 15%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--ui-brand-primary) 15%, transparent) 1px, transparent 1px);
        background-size: 24px 24px;
        opacity: 0.5;
        z-index: 0;
      }
      .stats-item {
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 140px;
        text-align: center;
        padding: 0 24px;
        border-right: 1px solid var(--ui-border-subtle);
      }
      .stats-item:last-child {
        border-right: none;
      }
      .stats-value {
        font-family: var(--ui-font-logo);
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--ui-brand-primary), var(--ui-brand-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .stats-label {
        font-size: 11px;
        color: var(--ui-content-muted);
        margin-top: 4px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-family: var(--ui-font-base);
      }

      .feat-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }
      @media (max-width: 768px) {
        .feat-grid {
          grid-template-columns: 1fr;
        }
      }

      .feat-card {
        position: relative;
        overflow: hidden;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 36px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: var(--ui-shadow-card);
        transition: border-color 0.3s, transform 0.3s;
      }
      .feat-card:hover {
        border-color: var(--fa, var(--ui-brand-primary));
        transform: translateY(-4px);
      }
      .feat-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .feat-icon {
        font-size: 22px;
        font-weight: 600;
      }
      .feat-tag {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-family: var(--ui-font-base);
      }
      .feat-title {
        font-family: var(--ui-font-logo);
        font-size: 22px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .feat-desc {
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
        font-family: var(--ui-font-base);
      }
      .feat-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .feat-item {
        display: flex;
        gap: 10px;
        font-size: 13px;
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
      }
      .feat-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        border-radius: 16px 16px 0 0;
        overflow: hidden;
      }
      .feat-bar-pulse {
        width: 100px; height: 100%;
        border-radius: 2px;
        transform: translateX(-100px);
        opacity: 0;
        transition: opacity 0.3s;
        will-change: transform;
      }
      .mkt-card:hover .feat-bar-pulse {
        opacity: 1;
        animation: pulse-travel-h 1.8s infinite linear;
      }
      @keyframes pulse-travel-h {
        0% { transform: translateX(-100px); }
        100% { transform: translateX(450px); }
      }

      .hiw {
        background: var(--ui-surface-muted);
      }
      .hiw-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      @media (max-width: 768px) {
        .hiw-grid {
          grid-template-columns: 1fr;
        }
      }
      .hiw-step-card-wrapper {
        border-radius: 16px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        box-shadow: var(--ui-shadow-card);
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .hiw-step-card-wrapper:hover {
        transform: translateY(-6px);
      }
      .hiw-step {
        position: relative;
        text-align: center;
        padding: 40px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .hiw-num {
        position: absolute;
        top: 20px;
        right: 24px;
        font-family: var(--ui-font-logo);
        font-size: 48px;
        font-weight: 800;
        background: linear-gradient(135deg, var(--ui-brand-primary), var(--ui-brand-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        opacity: 0.25;
        line-height: 1;
        transition: transform 0.4s ease, opacity 0.4s ease;
      }
      .hiw-step-card-wrapper:hover .hiw-num {
        transform: scale(1.18) translate(-4px, 4px);
        opacity: 0.45;
      }
      .hiw-icon {
        font-size: 26px;
        font-weight: 600;
      }
      .hiw-title {
        font-family: var(--ui-font-logo);
        font-size: 20px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .hiw-desc {
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.7;
        font-family: var(--ui-font-base);
      }
      @keyframes hiw-line-flow {
        0% { stroke-dashoffset: 160; }
        100% { stroke-dashoffset: 0; }
      }
      @media (max-width: 900px) {
        .hiw-line-wrap { display: none !important; }
      }

      .mkt-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      @media (max-width: 900px) {
        .mkt-grid {
          grid-template-columns: 1fr;
        }
      }
      .mkt-card {
        position: relative;
        overflow: hidden;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: var(--ui-shadow-card);
        transition: border-color 0.3s, transform 0.3s;
      }
      .mkt-card:hover {
        border-color: var(--ma, var(--ui-brand-primary));
        transform: translateY(-4px);
      }
      .mkt-header {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .mkt-flag {
        font-size: 12px;
        letter-spacing: 0.2em;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }
      .mkt-country {
        font-family: var(--ui-font-logo);
        font-size: 20px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .mkt-live {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
        margin-top: 2px;
      }
      .mkt-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        animation: dp 2s infinite;
      }
      .mkt-desc {
        font-size: 13px;
        color: var(--ui-content-secondary);
        line-height: 1.65;
        font-family: var(--ui-font-base);
      }
      .mkt-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .mkt-stat {
        background: var(--ui-surface-muted);
        border-radius: 10px;
        padding: 12px;
      }
      .mkt-val {
        font-family: var(--ui-font-logo);
        font-size: 18px;
        font-weight: 700;
      }
      .mkt-lbl {
        font-size: 11px;
        color: var(--ui-content-muted);
        margin-top: 3px;
        font-family: var(--ui-font-base);
      }

      .pricing-bg {
        background: var(--ui-surface-muted);
      }
      .price-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 1100px) {
        .price-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 600px) {
        .price-grid {
          grid-template-columns: 1fr;
        }
      }

      .price-card {
        position: relative;
        overflow: hidden;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        padding: 32px 26px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: var(--ui-shadow-card);
        transition: transform 0.3s;
      }
      .price-card:hover {
        transform: translateY(-4px);
      }
      .price-card--pop {
        border-color: color-mix(in srgb, var(--ui-status-warning) 40%, transparent);
        box-shadow: 0 0 40px color-mix(in srgb, var(--ui-status-warning) 14%, transparent),
          var(--ui-shadow-card);
        transform: scale(1.02);
      }
      .price-card--pop:hover {
        transform: scale(1.02) translateY(-4px);
      }

      .price-badge {
        position: absolute;
        top: -13px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--ui-status-warning), #b45309);
        color: #000;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 14px;
        border-radius: 20px;
        white-space: nowrap;
        letter-spacing: 0.06em;
        font-family: var(--ui-font-base);
      }
      .price-saving {
        position: absolute;
        top: 14px;
        right: 14px;
        background: color-mix(in srgb, var(--ui-status-warning) 12%, transparent);
        border: 1px solid color-mix(in srgb, var(--ui-status-warning) 28%, transparent);
        color: var(--ui-status-warning);
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 6px;
        font-family: var(--ui-font-base);
      }
      .price-icon {
        font-size: 20px;
        font-weight: 600;
      }
      .price-tag {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-family: var(--ui-font-base);
      }
      .price-name {
        font-family: var(--ui-font-logo);
        font-size: 20px;
        font-weight: 700;
        color: var(--ui-content-strong);
      }
      .price-desc {
        font-size: 13px;
        color: var(--ui-content-secondary);
        line-height: 1.65;
        font-family: var(--ui-font-base);
      }
      .price-amount {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .price-num {
        font-family: var(--ui-font-logo);
        font-size: 32px;
        font-weight: 800;
        color: var(--ui-content-strong);
      }
      .price-period {
        font-size: 14px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }
      .price-features {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }
      .price-feat {
        display: flex;
        gap: 10px;
        font-size: 13px;
        color: var(--ui-content-primary);
        font-family: var(--ui-font-base);
      }
      .price-note {
        text-align: center;
        font-size: 12px;
        color: var(--ui-content-muted);
        font-family: var(--ui-font-base);
      }

      .faq-list {
        display: flex;
        flex-direction: column;
      }
      .faq-item {
        border-bottom: 1px solid var(--ui-border-subtle);
      }
      .faq-item:first-child {
        border-top: 1px solid var(--ui-border-subtle);
      }
      .faq-q {
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 22px 4px;
        gap: 16px;
        font-size: 16px;
        font-weight: 500;
        color: var(--ui-content-primary);
        text-align: left;
        font-family: var(--ui-font-base);
        transition: color 0.2s;
      }
      .faq-q:hover {
        color: var(--ui-content-strong);
      }
      .faq-open .faq-q {
        color: var(--ui-brand-primary);
      }
      .faq-icon {
        flex-shrink: 0;
        font-size: 22px;
        color: var(--ui-brand-primary);
        font-weight: 300;
      }
      .faq-a-wrapper {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .faq-open .faq-a-wrapper {
        grid-template-rows: 1fr;
      }
      .faq-a-inner {
        overflow: hidden;
      }
      .faq-a {
        padding: 0 4px 22px;
        font-size: 14px;
        color: var(--ui-content-secondary);
        line-height: 1.8;
        font-family: var(--ui-font-base);
      }

      .cta-section {
        position: relative;
        overflow: hidden;
        padding: 120px 40px;
        text-align: center;
        background: radial-gradient(
          ellipse 80% 60% at 50% 50%,
          color-mix(in srgb, var(--ui-brand-primary) 8%, transparent) 0%,
          transparent 70%
        );
        border-top: 1px solid var(--ui-border-subtle);
      }
      .cta-blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        pointer-events: none;
      }
      .cb1 {
        width: 500px;
        height: 500px;
        top: -100px;
        left: -100px;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-brand-primary) 16%, transparent) 0%,
          transparent 70%
        );
      }
      .cb2 {
        width: 400px;
        height: 400px;
        bottom: -100px;
        right: -80px;
        background: radial-gradient(
          circle,
          color-mix(in srgb, var(--ui-brand-secondary) 12%, transparent) 0%,
          transparent 70%
        );
      }
      .cta-inner {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .cta-h2 {
        font-family: var(--ui-font-logo);
        font-size: clamp(28px, 4vw, 48px);
        font-weight: 700;
        color: var(--ui-content-strong);
        max-width: 600px;
        line-height: 1.2;
      }
      .cta-p {
        font-size: 17px;
        color: var(--ui-content-secondary);
        font-family: var(--ui-font-base);
      }
      .cta-btns {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .cta-flags {
        font-size: 14px;
        color: var(--ui-content-muted);
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

    `}</style>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE › SECTION DIVIDER  (between Stats Band and Features Showcase)
// DataRiver
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A full-width PCB circuit-board trace divider with animated data particles
 * flowing along branching paths. Acts as a living transition between the
 * stats band and the features section — gives the page a "data is moving
 * through this system" feeling.
 *
 * Placement:
 *   <DataRiver />
 *   between <StatsBand /> and <FeaturesShowcase /> in GuestHome.tsx
 *
 * Performance: pure SVG SMIL animateMotion (GPU, no JS per frame).
 * All glows via SVG <filter> — no CSS filter on animated elements.
 */
export function DataRiver() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  // Each trace is a right-angle PCB-style path.
  // Particles travel along these using SVG animateMotion.
  const TRACES = [
    // Main trunk — full width, slight vertical jog in the middle
    {
      d: "M 0,40 H 280 V 20 H 520 V 60 H 720 V 40 H 1200",
      color: "#3b82f6",
      width: 1.5,
      opacity: 0.55,
    },
    // Upper branch — forks off, loops, rejoins
    {
      d: "M 160,40 V 10 H 400 V 40",
      color: "#2dd4bf",
      width: 1,
      opacity: 0.4,
    },
    // Lower branch
    {
      d: "M 320,60 V 72 H 560 V 60",
      color: "#8b5cf6",
      width: 1,
      opacity: 0.4,
    },
    // Right-side branch
    {
      d: "M 800,40 V 18 H 980 V 40",
      color: "#2dd4bf",
      width: 1,
      opacity: 0.4,
    },
    // Far-right branch
    {
      d: "M 1000,40 V 62 H 1150 V 40",
      color: "#f59e0b",
      width: 1,
      opacity: 0.35,
    },
  ];

  // Particles — each travels one trace, at different speeds and delays
  const PARTICLES = [
    // Main trunk — 3 particles at different offsets
    { trace: 0, color: "#3b82f6", dur: "4s", begin: "0s", r: 3 },
    { trace: 0, color: "#60a5fa", dur: "4s", begin: "-1.8s", r: 2.5 },
    { trace: 0, color: "#3b82f6", dur: "4s", begin: "-3.2s", r: 2 },
    // Upper branch
    { trace: 1, color: "#2dd4bf", dur: "2.2s", begin: "0.4s", r: 2.5 },
    { trace: 1, color: "#2dd4bf", dur: "2.2s", begin: "-1.1s", r: 2 },
    // Lower branch
    { trace: 2, color: "#8b5cf6", dur: "2.6s", begin: "0.8s", r: 2.5 },
    { trace: 2, color: "#a78bfa", dur: "2.6s", begin: "-1.4s", r: 2 },
    // Right branch
    { trace: 3, color: "#2dd4bf", dur: "2s", begin: "1s", r: 2.5 },
    // Far-right branch
    { trace: 4, color: "#f59e0b", dur: "1.8s", begin: "0.6s", r: 2.5 },
  ];

  // Junction nodes — glowing dots where traces branch or meet
  const NODES = [
    { x: 160, y: 40, color: "#3b82f6" },
    { x: 280, y: 40, color: "#3b82f6" },
    { x: 320, y: 60, color: "#8b5cf6" },
    { x: 400, y: 40, color: "#2dd4bf" },
    { x: 520, y: 20, color: "#3b82f6" },
    { x: 560, y: 60, color: "#8b5cf6" },
    { x: 720, y: 40, color: "#3b82f6" },
    { x: 800, y: 40, color: "#2dd4bf" },
    { x: 980, y: 40, color: "#2dd4bf" },
    { x: 1000, y: 40, color: "#f59e0b" },
    { x: 1150, y: 40, color: "#f59e0b" },
  ];

  // Data labels that flash briefly at random nodes
  const LABELS = [
    { x: 280, y: 10, text: "48.2K", color: "#3b82f6", delay: "0s" },
    { x: 520, y: 8, text: "+9.2%", color: "#2dd4bf", delay: "1.2s" },
    { x: 720, y: 56, text: "1.2M+", color: "#8b5cf6", delay: "2.4s" },
    { x: 980, y: 10, text: "LIVE", color: "#f59e0b", delay: "0.6s" },
  ];

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "0",
        lineHeight: 0,
        position: "relative",
      }}
    >
      <style>{`
        @keyframes dr-node-pulse {
          0%,100% { r: 3.5; opacity: .7 }
          50%      { r: 5.5; opacity: 1  }
        }
        @keyframes dr-node-ring {
          0%,100% { r: 7;  opacity: .25 }
          50%      { r: 11; opacity: .08 }
        }
        @keyframes dr-label-flash {
          0%,100% { opacity: 0 }
          10%,80% { opacity: .65 }
        }
        @keyframes dr-trace-draw {
          from { stroke-dashoffset: 1400 }
          to   { stroke-dashoffset: 0    }
        }
      `}</style>

      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        style={{ width: "100%", height: 80, display: "block" }}
      >
        <defs>
          {/* Glow filter for particles — applied only to small elements */}
          <filter id="dr-particle-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle node glow */}
          <filter id="dr-node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Top/bottom fade mask so traces dissolve at edges */}
          <linearGradient id="dr-fade-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="4%" stopColor="white" stopOpacity="1" />
            <stop offset="96%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="dr-edge-mask">
            <rect x="0" y="0" width="1200" height="80" fill="url(#dr-fade-h)" />
          </mask>
        </defs>

        <g mask="url(#dr-edge-mask)">

          {/* ── Static traces (dim baseline) ── */}
          {TRACES.map((t, i) => (
            <path
              key={`static-${i}`}
              d={t.d}
              fill="none"
              stroke={t.color}
              strokeWidth={t.width}
              opacity={t.opacity * 0.5}
              strokeLinejoin="round"
            />
          ))}

          {/* ── Animated draw-on traces (on viewport entry) ── */}
          {inView && TRACES.map((t, i) => (
            <path
              key={`draw-${i}`}
              d={t.d}
              fill="none"
              stroke={t.color}
              strokeWidth={t.width + 0.5}
              opacity={t.opacity}
              strokeLinejoin="round"
              strokeDasharray="1400"
              strokeDashoffset="1400"
              filter="url(#dr-particle-glow)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="1400"
                to="0"
                dur={`${1.4 + i * 0.3}s`}
                begin={`${i * 0.15}s`}
                fill="freeze"
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.4 0 0.2 1"
              />
            </path>
          ))}

          {/* ── Junction node rings (outer halo) ── */}
          {NODES.map((n, i) => (
            <circle
              key={`ring-${i}`}
              cx={n.x} cy={n.y} r={7}
              fill={n.color}
              style={{
                animation: `dr-node-ring ${2.5 + (i % 3) * 0.6}s ease-in-out infinite`,
                animationDelay: `${(i * 0.28) % 2}s`,
              }}
            />
          ))}

          {/* ── Junction node cores ── */}
          {NODES.map((n, i) => (
            <circle
              key={`node-${i}`}
              cx={n.x} cy={n.y} r={3.5}
              fill={n.color}
              filter="url(#dr-node-glow)"
              style={{
                animation: `dr-node-pulse ${2 + (i % 4) * 0.5}s ease-in-out infinite`,
                animationDelay: `${(i * 0.22) % 1.8}s`,
              }}
            />
          ))}

          {/* ── Traveling data particles (SVG SMIL animateMotion) ── */}
          {inView && PARTICLES.map((p, i) => {
            const trace = TRACES[p.trace];
            return (
              <circle
                key={`particle-${i}`}
                r={p.r}
                fill={p.color}
                filter="url(#dr-particle-glow)"
                opacity="0"
              >
                <animateMotion
                  dur={p.dur}
                  repeatCount="indefinite"
                  begin={p.begin}
                  path={trace.d}
                  calcMode="linear"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.06;0.9;1"
                  dur={p.dur}
                  repeatCount="indefinite"
                  begin={p.begin}
                />
              </circle>
            );
          })}

          {/* ── Flashing data labels at nodes ── */}
          {LABELS.map((lbl, i) => (
            <text
              key={i}
              x={lbl.x} y={lbl.y}
              textAnchor="middle"
              fill={lbl.color}
              fontSize="8"
              fontWeight="700"
              fontFamily="var(--ui-font-base)"
              letterSpacing="0.1em"
              style={{
                animation: `dr-label-flash ${4 + i * 0.8}s ease-in-out infinite`,
                animationDelay: lbl.delay,
              }}
            >
              {lbl.text}
            </text>
          ))}

        </g>
      </svg>
    </div>
  );
}

