"use client";

/**
 * FeaturesShowcase.tsx — SmartMove
 *
 * Replaces the grid card features section with four full-width spotlight
 * sections — one per platform feature. Each has:
 *   • Alternating text / visual layout (L–R, R–L, L–R, R–L)
 *   • Animated CSS mockup (chat UI, chart, workspace, market cards)
 *   • Scroll-reveal via IntersectionObserver (fires once, no loop)
 *   • Background oversized section number for depth
 *   • Zero canvas · zero RAF · pure CSS compositor animations
 *
 * Usage — drop in place of the old <FeaturesSection /> in GuestHome.tsx:
 *   import { FeaturesShowcase } from "./FeaturesShowcase";
 *   <FeaturesShowcase />
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "./GuestAnimations";

// ─── Feature definitions ──────────────────────────────────────────────────────

const FEATURES = [
  {
    n: "01",
    icon: "🤖",
    tag: "AI Assistant",
    title: "Ask anything.\nGet answers that matter.",
    titleGrad: "MoveIQ",
    accent: "var(--ui-brand-primary)",
    accentRaw: "#3b82f6",
    desc: "MoveIQ is SmartMove's built-in AI analyst. Ask market questions in plain English — it pulls live warehouse data, generates charts on demand, and returns investment-ready answers in seconds.",
    bullets: [
      { icon: "💬", text: "Natural language queries — no dashboards needed" },
      { icon: "💡", text: "Can explain the data" },
      { icon: "🔗", text: "Connected directly to the live Azure data warehouse" },
      { icon: "💡", text: "Investment-oriented insights, not just raw numbers" },
    ],
    cta: "Try MoveIQ free",
    visual: "chat",
  },
  {
    n: "02",
    icon: "⚡",
    tag: "Auto-Dashboards",
    title: "Describe it.\nWatch it build itself.",
    titleGrad: "Agentic Analytics",
    accent: "var(--ui-brand-secondary)",
    accentRaw: "#2dd4bf",
    desc: "The Agentic Analytics engine turns a plain-English request into a fully rendered, interactive dashboard. No drag-and-drop. No field mapping. Just describe what you need and the engine handles the rest.",
    bullets: [
      { icon: "🧠", text: "Intent detection → metric selection → auto-render" },
      { icon: "📈", text: "Line, bar, pie, trend, and KPI card generation" },
      { icon: "🔄", text: "Comparative visualisations across markets and time ranges" },
      { icon: "🗄️", text: "Self-service BI for non-technical users" },
    ],
    cta: "See it in action",
    visual: "chart",
  },
  {
    n: "03",
    icon: "☁️",
    tag: "Cloud Workspace",
    title: "Upload your data.\nUnlock instant intelligence.",
    titleGrad: "Analytics Pro Engine",
    accent: "var(--ui-brand-accent)",
    accentRaw: "#8b5cf6",
    desc: "Bring your own CSV datasets. The Cloud Workspace validates, cleans, and transforms your files — then feeds them straight into the Analytics Pro Engine for auto-generated dashboards and exportable reports.",
    bullets: [
      { icon: "📂", text: "Folder organisation, rename, delete — full file management" },
      { icon: "✅", text: "Auto-validation, preprocessing, and transformation" },
      { icon: "⚙️", text: "Analytics Pro Engine: process → dashboard → PDF export" },
      { icon: "📅", text: "Full import history and dataset versioning" },
    ],
    cta: "Explore workspace",
    visual: "workspace",
  },
  {
    n: "04",
    icon: "🌍",
    tag: "Live Markets",
    title: "Three markets.\nOne clear picture.",
    titleGrad: "Multi-Market Intelligence",
    accent: "var(--ui-status-warning)",
    accentRaw: "#f59e0b",
    desc: "SmartMove simultaneously tracks England, Dubai, and Egypt — giving you cross-market investment scoring, regional price trends, and transaction distribution in a single view. Switch markets in one click.",
    bullets: [
      { icon: "🇬🇧", text: "England — £482K avg · +3.2% YoY · ROI 6.8%" },
      { icon: "🇦🇪", text: "Dubai/UAE — AED 1.2M avg · +5.7% YoY · ROI 9.2%" },
      { icon: "🇪🇬", text: "Egypt — EGP 4.8M avg · +14.2% YoY · ROI 11.4%" },
      { icon: "🔀", text: "One-click cross-market comparison and investment scoring" },
    ],
    cta: "Explore all markets",
    visual: "markets",
  },
  {
    n: "05",
    icon: "🔮",
    tag: "Predictions",
    title: "AI Forecasting.\nSee the future.",
    titleGrad: "Predictive Engine",
    accent: "var(--ui-status-success)",
    accentRaw: "#10b981",
    desc: "SmartMove's predictive engine forecasts property appreciation and ROI up to 36 months ahead. It leverages historical transaction data, yield indices, and macro-economic variables to build reliable confidence margins.",
    bullets: [
      { icon: "🎯", text: "Predictive ROI and appreciation scoring" },
      { icon: "📊", text: "Statistically sound confidence margins" },
      { icon: "🌍", text: "Macro-economic indicator integration" },
      { icon: "📅", text: "Up to 36-month future outlook" },
    ],
    cta: "View forecasts",
    visual: "predictions", // We'll add a simple mockup component below or fallback to 'chart' if not defined
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function FeaturesShowcase() {
  // Single IntersectionObserver — fires once per element, then disconnects it
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("fs-on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".fs-watch").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="features" style={{ background: "var(--ui-surface-page)" }}>
      <FeaturesCSS />

      {/* Section header */}
      <div className="fsh-head fs-watch">
        <div className="g-tag" style={{ display: "inline-block" }}>Platform Features</div>
        <h2 className="g-h2" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          Five systems.<br />One platform.
        </h2>
        <p className="g-sub" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          From conversational AI to automated dashboards to cloud analytics and forecasting —
          SmartMove covers the entire intelligence workflow.
        </p>
      </div>

      {/* One full-width section per feature */}
      {FEATURES.map((f, i) => (
        <FeatureBlock key={f.n} feature={f} flip={i % 2 !== 0} />
      ))}
    </section>
  );
}

// ─── Single feature section ───────────────────────────────────────────────────

function FeatureBlock({
  feature: f,
  flip,
}: {
  feature: (typeof FEATURES)[number];
  flip: boolean;
}) {
  return (
    <div className={`fsb fs-watch${flip ? " fsb-flip" : ""}`}>
      {/* Blueprint Grid */}
      <div className="fsb-blueprint" aria-hidden="true" />

      {/* Oversized background number */}
      <div className="fsb-bg-num" style={{ color: f.accentRaw }}>{f.n}</div>

      {/* Accent vertical rule with neon pulse */}
      <div className="fsb-rule">
        <div
          className="fsb-rule-pulse"
          style={{
            background: `linear-gradient(to bottom, transparent, ${f.accentRaw} 80%, #ffffff 100%)`,
            boxShadow: `0 0 20px 4px ${f.accentRaw}`
          }}
        />
      </div>

      <div className="fsb-inner">

        {/* ── Text column ── */}
        <div className="fsb-text">
          <div className="fsb-tag" style={{ color: f.accent, borderColor: `${f.accentRaw}30`, display: "inline-flex", alignItems: "center", gap: "8px" }}>
            {f.n === "01" ? (
              <div style={{ width: "32px", height: "32px", transform: "translateY(-2px)" }}>
                <RobotHead mode="idle" />
              </div>
            ) : (
              <span>{f.icon}</span>
            )}
            <span>{f.tag}</span>
          </div>

          <h2 className="fsb-title">
            {f.title.split("\n").map((line, i) =>
              i === 0 ? (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ) : (
                <span key={i} className="fsb-title-grad"
                  style={{ backgroundImage: `linear-gradient(135deg, ${f.accentRaw}, var(--ui-brand-secondary))` }}>
                  {line}
                </span>
              )
            )}
          </h2>

          <p className="fsb-desc">{f.desc}</p>

          <ul className="fsb-bullets">
            {f.bullets.map((b, j) => (
              <li key={j} className="fsb-bullet">
                <span className="fsb-bullet-icon">{b.icon}</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>

          <a href="/authentication/register" className="fsb-cta g-btn"
            style={{
              background: f.accent,
              color: f.n === "04" ? "#000" : "var(--ui-content-on-brand)",
              boxShadow: `0 0 22px ${f.accentRaw}44`,
              width: "fit-content",
              padding: "12px 26px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "14px",
            }}>
            {f.cta} →
          </a>
        </div>

        {/* ── Visual column with SpotlightCard wrapper ── */}
        <div className="fsb-visual">
          <SpotlightCard className="mock-spotlight-wrapper" spotlightColor={`color-mix(in srgb, ${f.accentRaw} 15%, transparent)`} size={420}>
            {f.visual === "chat" && <ChatMockup accent={f.accentRaw} />}
            {f.visual === "chart" && <ChartMockup accent={f.accentRaw} />}
            {f.visual === "workspace" && <WorkspaceMockup accent={f.accentRaw} />}
            {f.visual === "markets" && <MarketsMockup accent={f.accentRaw} />}
            {f.visual === "predictions" && <PredictionsMockup accent={f.accentRaw} />}
          </SpotlightCard>
        </div>

      </div>
    </div>
  );
}

// ── RobotHead component extracted & optimized for mockups ──────────────────
type RobotMode = "idle" | "loading" | "success" | "error";

function RobotHead({ mode }: { mode: RobotMode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyeColor = mode === "success" ? "#10b981" : mode === "error" ? "#ef4444" : "#00e5ff";

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const leftEye = svg.getElementById("fs-left-eye") as SVGEllipseElement | null;
    const rightEye = svg.getElementById("fs-right-eye") as SVGEllipseElement | null;
    if (!leftEye || !rightEye) return;

    const handleMove = (e: MouseEvent) => {
      if (mode === "loading") return;

      const rect = svg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const dist = Math.min(6, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 30);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      leftEye.setAttribute("cx", String(155 + dx));
      leftEye.setAttribute("cy", String(100 + dy));
      rightEye.setAttribute("cx", String(245 + dx));
      rightEye.setAttribute("cy", String(100 + dy));
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mode]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const leftEye = svg.getElementById("fs-left-eye") as SVGEllipseElement | null;
    const rightEye = svg.getElementById("fs-right-eye") as SVGEllipseElement | null;
    if (!leftEye || !rightEye) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const blink = () => {
      if (!alive || mode === "loading") {
        if (alive) timer = setTimeout(blink, 3000 + Math.random() * 2000);
        return;
      }
      leftEye.style.transition = "ry 0.08s";
      rightEye.style.transition = "ry 0.08s";
      leftEye.setAttribute("ry", "1");
      rightEye.setAttribute("ry", "1");
      setTimeout(() => {
        if (!alive) return;
        leftEye.setAttribute("ry", "16");
        rightEye.setAttribute("ry", "16");
        timer = setTimeout(blink, 3000 + Math.random() * 2000);
      }, 120);
    };

    timer = setTimeout(blink, 1500 + Math.random() * 1000);
    return () => { alive = false; clearTimeout(timer); };
  }, [mode]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 210"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="fs-white-body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d6dfea" />
          <stop offset="100%" stopColor="#7a8799" />
        </radialGradient>
        <radialGradient id="fs-blue-accent" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8bc6ff" />
          <stop offset="45%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#15337a" />
        </radialGradient>
        <linearGradient id="fs-screen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#151d2e" />
          <stop offset="100%" stopColor="#02040a" />
        </linearGradient>
        <filter id="fs-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="fs-inner-shadow">
          <feOffset dx="0" dy="5" />
          <feGaussianBlur stdDeviation="5" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#000000" floodOpacity="0.85" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
        <filter id="fs-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="200" cy="105" r="100" fill="none" stroke="url(#fs-blue-accent)" strokeWidth="1.5" opacity="0.35" className="fs-aura-ring ring-1" style={{ display: mode === "loading" || mode === "success" ? "block" : "none" }} />
      <circle cx="200" cy="105" r="100" fill="none" stroke="url(#fs-blue-accent)" strokeWidth="1" opacity="0.2" className="fs-aura-ring ring-2" style={{ display: mode === "loading" || mode === "success" ? "block" : "none" }} />
      <path d="M 120 75 C 80 65, 70 105, 80 125 C 90 135, 110 125, 120 105 Z" fill="url(#fs-blue-accent)" filter="url(#fs-shadow)" />
      <path d="M 280 75 C 320 65, 330 105, 320 125 C 310 135, 290 125, 280 105 Z" fill="url(#fs-blue-accent)" filter="url(#fs-shadow)" />
      <g filter="url(#fs-shadow)">
        <rect x="90" y="35" width="220" height="140" rx="55" fill="url(#fs-white-body)" />
        <rect x="110" y="55" width="180" height="100" rx="35" fill="url(#fs-screen-grad)" filter="url(#fs-inner-shadow)" />
        <ellipse
          id="fs-left-eye"
          cx="155" cy="100" rx="16" ry="16"
          fill={eyeColor}
          filter="url(#fs-glow)"
          style={{
            transition: "cx 0.08s ease-out, cy 0.08s ease-out, fill 0.4s",
          }}
        />
        <ellipse
          id="fs-right-eye"
          cx="245" cy="100" rx="16" ry="16"
          fill={eyeColor}
          filter="url(#fs-glow)"
          style={{
            transition: "cx 0.08s ease-out, cy 0.08s ease-out, fill 0.4s",
          }}
        />
        <path d="M 130 80 L 130 120 L 140 120" stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
        <path d="M 270 130 L 270 90 L 260 90" stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
      </g>
    </svg>
  );
}

// ── 1. MoveIQ chat ────────────────────────────────────────────────────────────

function ChatMockup({ accent }: { accent: string }) {
  const [robotMode, setRobotMode] = useState<RobotMode>("loading");

  useEffect(() => {
    // Sequence mode from loading to success after messages roll in
    const successTimer = setTimeout(() => setRobotMode("success"), 2500);
    return () => clearTimeout(successTimer);
  }, []);

  return (
    <div
      className="mock mock-chat"
      onMouseEnter={() => setRobotMode("success")}
      onMouseLeave={() => setRobotMode("idle")}
    >
      {/* Header with interactive RobotHead preview */}
      <div className="mock-header" style={{ padding: "8px 14px", height: "64px" }}>
        <div style={{ width: "60px", height: "60px" }}>
          <RobotHead mode={robotMode} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span className="mock-title" style={{ fontSize: "14px", margin: 0 }}>MoveIQ AI</span>
          <span className="mock-live-dot-wrap" style={{ fontSize: "11px", color: "var(--ui-content-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
            <span className="mock-live-dot" style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            Active tracking
          </span>
        </div>
      </div>

      <div className="mock-body">
        {/* User message */}
        <div className="chat-msg chat-user cm1">
          <div className="chat-bubble chat-bubble-user">
            Best areas to invest in Cairo right now?
          </div>
        </div>

        {/* Typing indicator */}
        <div className="chat-msg chat-ai cm2">
          <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
            <RobotHead mode={robotMode} />
          </div>
          <div className="chat-typing">
            <span /><span /><span />
          </div>
        </div>

        {/* AI response */}
        <div className="chat-msg chat-ai cm3">
          <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
            <RobotHead mode={robotMode} />
          </div>
          <div className="chat-bubble chat-bubble-ai">
            <div className="chat-response-title">Based on current analytics:</div>
            {[
              { area: "New Cairo", roi: "11.4%", bar: 88 },
              { area: "October City", roi: "9.8%", bar: 76 },
              { area: "Heliopolis", roi: "8.2%", bar: 64 },
            ].map((r, i) => (
              <div key={i} className="chat-row" style={{ animationDelay: `${3.2 + i * 0.2}s` }}>
                <span className="chat-area">{r.area}</span>
                <div className="chat-bar-track">
                  <div className="chat-bar" style={{ width: `${r.bar}%`, background: accent }} />
                </div>
                <span className="chat-roi" style={{ color: accent }}>{r.roi}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart card */}
        <div className="chat-msg chat-ai cm4">
          <span className="chat-avatar">📊</span>
          <div className="chat-card">
            <div className="chat-card-title">ROI Comparison Chart generated</div>
            <div className="chat-mini-chart">
              {[88, 76, 64, 71, 82].map((h, i) => (
                <div key={i} className="chat-mini-bar"
                  style={{
                    height: `${h * 0.6}%`,
                    background: accent,
                    animationDelay: `${4.0 + i * 0.1}s`,
                  }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="mock-input-bar relative" style={{ '--ac': accent } as React.CSSProperties}>
        <div className="data-core-bubble" />
        <div className="mock-input" style={{ paddingLeft: "32px" }}>Ask a market question...</div>
        <button className="mock-send" style={{ background: accent }}>→</button>
      </div>
    </div>
  );
}

// ── 2. Agentic Analytics chart ────────────────────────────────────────────────

const CHART_BARS = [
  { label: "🇪🇬 EG Q1", h: 62, color: "#8b5cf6" },
  { label: "🇦🇪 AE Q1", h: 84, color: "#2dd4bf" },
  { label: "🇬🇧 UK Q1", h: 55, color: "#3b82f6" },
  { label: "🇪🇬 EG Q2", h: 71, color: "#8b5cf6" },
  { label: "🇦🇪 AE Q2", h: 92, color: "#2dd4bf" },
  { label: "🇬🇧 UK Q2", h: 60, color: "#3b82f6" },
  { label: "🇦🇪 AE Q3", h: 96, color: "#2dd4bf" },
];

function ChartMockup({ accent }: { accent: string }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState({ label: "", val: "" });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({ x, y });

    // Determine data based on relative position
    const relX = x / rect.width;
    if (relX < 0.3) {
      setTooltipData({ label: "Dubai Core ROI", val: "9.2%" });
    } else if (relX < 0.6) {
      setTooltipData({ label: "London Growth YoY", val: "+3.2%" });
    } else {
      setTooltipData({ label: "Egypt Mid-term Yield", val: "14.2%" });
    }
  };

  return (
    <div
      ref={containerRef}
      className="mock mock-chart relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="mock-header">
        <div className="mock-dot" style={{ background: accent }} />
        <span className="mock-title">Agentic Dashboard</span>
        <div className="mock-status">
          <span className="mock-live-dot" />
          {hovered ? "Live Recalculating" : "Active Data"}
        </div>
      </div>

      {/* KPI row */}
      <div className="chart-kpi-row">
        {[
          { flag: "🇦🇪", label: "Dubai ROI", value: hovered ? "10.4%" : "9.2%", delta: "↑ Live", color: "#2dd4bf" },
          { flag: "🇬🇧", label: "London Growth", value: hovered ? "+4.1%" : "+3.2%", delta: "↑ Live", color: "#3b82f6" },
          { flag: "🇪🇬", label: "Cairo Trend", value: hovered ? "+16.8%" : "+14.2%", delta: "↑ Live", color: "#8b5cf6" },
        ].map((k, i) => (
          <div key={i} className="chart-kpi ck" style={{ animationDelay: `0s`, transition: "all 0.3s ease" }}>
            <div style={{ fontSize: 18 }}>{k.flag}</div>
            <div className="chart-kpi-val" style={{ color: k.color }}>{k.value}</div>
            <div className="chart-kpi-lbl">{k.label}</div>
            <div className="chart-kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Bar chart with interactive scaling heights */}
      <div className="chart-area" style={{ position: "relative" }}>
        <div className="chart-radar-scan" style={{ borderRight: `1px solid ${accent}`, background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 15%, transparent) 50%, transparent)` }} />

        {hovered && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: "20px",
              left: tooltipPos.x,
              width: "1.5px",
              background: `linear-gradient(to bottom, transparent, ${accent} 50%, #ffffff 100%)`,
              boxShadow: `0 0 10px ${accent}`,
              pointerEvents: "none",
              zIndex: 15,
              transition: "left 0.05s ease-out",
            }}
          />
        )}

        <div className="chart-y-labels">
          {["100%", "75%", "50%", "25%", ""].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="chart-bars">
          {CHART_BARS.map((b, i) => {
            const dynamicHeight = hovered ? Math.min(100, Math.max(10, b.h + (i % 2 === 0 ? 10 : -15))) : b.h;
            return (
              <div key={i} className="chart-bar-col">
                <div className="chart-bar-wrap">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${dynamicHeight}%`,
                      background: b.color,
                      opacity: 1,
                      transition: "height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
                      '--bar-glow': b.color,
                    } as React.CSSProperties}
                  />
                </div>
                <div className="chart-bar-label">{b.label.split(" ")[1]}</div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Tooltip following mouse */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: "absolute",
                left: tooltipPos.x + 12,
                top: tooltipPos.y - 48,
                pointerEvents: "none",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                padding: "6px 10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
              }}
            >
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {tooltipData.label}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>
                ROI: <span style={{ color: accent }}>{tooltipData.val}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {[["🇬🇧 England", "#3b82f6"], ["🇦🇪 Dubai", "#2dd4bf"], ["🇪🇬 Egypt", "#8b5cf6"]].map(([l, c], i) => (
          <span key={i} className="chart-legend-item">
            <span style={{ background: c, width: 10, height: 10, borderRadius: 2, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 3. Cloud workspace ────────────────────────────────────────────────────────

function WorkspaceMockup({ accent }: { accent: string }) {
  const [hovered, setHovered] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(68);

  useEffect(() => {
    if (!hovered) return;
    const timer = setInterval(() => {
      setUploadPercent((prev) => (prev >= 100 ? 100 : prev + 8));
    }, 150);
    return () => clearInterval(timer);
  }, [hovered]);

  const handleMouseEnter = () => {
    setHovered(true);
    setUploadPercent(68);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setUploadPercent(68);
  };

  return (
    <div
      className="mock mock-workspace"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mock-header">
        <div className="mock-dot" style={{ background: accent }} />
        <span className="mock-title">Cloud Workspace</span>
        <span className="ws-storage">{hovered ? "Syncing..." : "3.8 / 5 GB"}</span>
      </div>

      {/* Storage bar */}
      <div className="ws-storage-bar">
        <div className="ws-storage-fill" style={{ background: accent, width: hovered ? "86%" : "76%", transition: "width 1.5s ease" }} />
      </div>

      {/* Floating file indicator */}
      <div style={{ padding: "8px 14px", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.03)",
            border: `1px dashed ${accent}66`,
            borderRadius: "10px",
            padding: "8px 12px",
            transform: hovered ? "translateY(6px) scale(0.95)" : "translateY(0) scale(1)",
            opacity: hovered ? 0.4 : 1,
            transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
          }}
        >
          <span style={{ fontSize: "18px" }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--ui-content-strong)" }}>cairo_investment_q4.csv</div>
            <div style={{ fontSize: "9px", color: "var(--ui-content-muted)" }}>1.4 MB · Ready to drop</div>
          </div>
          <span style={{ fontSize: "12px", color: accent, animation: "bounce-h 1s infinite alternate" }}>→</span>
        </div>
      </div>

      {/* Active upload zone */}
      <div className="ws-upload-section" style={{ background: hovered ? "rgba(139, 92, 246, 0.05)" : "transparent", transition: "background 0.3s" }}>
        <div className="ws-upload-label">
          <span>{uploadPercent >= 100 ? "✅ Upload Complete" : "🔄 Processing"}</span>
          <span style={{ color: accent }}>cairo_investment_q4.csv</span>
        </div>
        <div className="ws-progress-track">
          <div className="ws-progress-bar" style={{ background: accent, width: `${uploadPercent}%`, transition: "width 0.15s ease-out" }} />
        </div>
        <div className="ws-progress-meta">
          <span>{uploadPercent >= 100 ? "Indexing database nodes..." : "Validating dataset..."}</span>
          <span style={{ color: accent }}>{uploadPercent}%</span>
        </div>
      </div>

      {/* Completed file */}
      <div className="ws-done wdone" style={{ opacity: uploadPercent >= 100 ? 1 : 0.4, transition: "opacity 0.3s" }}>
        <div className="ws-done-row">
          <span>{uploadPercent >= 100 ? "⚡" : "✅"}</span>
          <span className="ws-done-name">{uploadPercent >= 100 ? "cairo_investment_q4.csv" : "dubai_prices_2024.csv"}</span>
        </div>
        <div className="ws-done-badges">
          <span className="ws-badge ws-badge-ok relative">
            Validated
            {uploadPercent >= 100 && <span className="badge-shockwave-ring" style={{ '--ac': accent } as React.CSSProperties} />}
          </span>
          <span className="ws-badge ws-badge-ok relative">
            Cleaned
            {uploadPercent >= 100 && <span className="badge-shockwave-ring" style={{ '--ac': accent, animationDelay: "0.3s" } as React.CSSProperties} />}
          </span>
          <span className="ws-badge" style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
            {uploadPercent >= 100 ? "AI Forecast Ready" : "Dashboard ready"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 3.5 Predictions Scrubber Mockup ──────────────────────────────────────────
function PredictionsMockup({ accent }: { accent: string }) {
  const [hovered, setHovered] = useState(false);
  const [scrubberX, setScrubberX] = useState(150);
  const [roiText, setRoiText] = useState("+18.4%");
  const [glitchText, setGlitchText] = useState("LOC_X: 142.8");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const texts = ["SYS_OK", "PRED_CONF: 94.2%", "LOC_Y: 60.4", "X_ABS: 15.2", "HORIZON: 36M", "ALGO_V5"];
      setGlitchText(texts[Math.floor(Math.random() * texts.length)]);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Clamp coordinates relative to chart SVG area boundaries
    const padding = 16;
    const x = Math.min(rect.width - padding, Math.max(padding, e.clientX - rect.left));
    setScrubberX(x);

    // Dynamic ROI calculations relative to horizontal position
    const ratio = x / rect.width;
    const baseRoi = 6.8 + ratio * 15;
    setRoiText(`+${baseRoi.toFixed(1)}%`);
  };

  return (
    <div
      ref={containerRef}
      className="mock mock-chart"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setScrubberX(150);
        setRoiText("+18.4%");
      }}
      onMouseMove={handleMouseMove}
    >
      <div className="mock-header">
        <div className="mock-dot" style={{ background: accent }} />
        <span className="mock-title">AI Forecasting</span>
        <div className="mock-status">
          <span className="mock-live-dot" />
          {hovered ? "Live Scrubber Active" : "Interactive View"}
        </div>
      </div>

      <div className="pred-chart" style={{ position: "relative", minHeight: "180px" }}>
        {/* CRT overlay */}
        <div className="crt-scanline" aria-hidden="true" />

        <svg viewBox="0 0 400 200" fill="none" style={{ width: "100%", height: "100%", display: "block" }}>
          {/* Grid lines */}
          <line x1="0" y1="50" x2="400" y2="50" stroke="var(--ui-border-subtle)" strokeDasharray="4" />
          <line x1="0" y1="100" x2="400" y2="100" stroke="var(--ui-border-subtle)" strokeDasharray="4" />
          <line x1="0" y1="150" x2="400" y2="150" stroke="var(--ui-border-subtle)" strokeDasharray="4" />

          {/* Confidence Area */}
          <path d="M 50 150 L 150 120 L 250 80 L 350 40 L 350 110 L 250 130 L 150 160 Z" fill={`color-mix(in srgb, ${accent} 12%, transparent)`} />

          {/* Pulsating Prediction Horizon underlay path */}
          <path
            d="M 150 120 Q 250 80 350 60"
            stroke={accent}
            strokeWidth="8"
            opacity="0.3"
            fill="none"
            style={{ animation: "pulse-glow 2s ease-in-out infinite alternate" }}
          />

          {/* Historical Path Line */}
          <path d="M 50 150 Q 100 135 150 120" stroke="var(--ui-brand-secondary)" strokeWidth="3" fill="none" />

          {/* Forecast Path Line */}
          <path d="M 150 120 Q 250 80 350 60" stroke={accent} strokeWidth="3" strokeDasharray="4" fill="none" />

          {/* Glitch text indicator */}
          <text x="380" y="25" fill={accent} fontSize="7" fontFamily="monospace" textAnchor="end" opacity="0.6">
            {glitchText}
          </text>

          {/* Scrubber vertical line */}
          {hovered && (
            <line
              x1={scrubberX}
              y1="0"
              x2={scrubberX}
              y2="200"
              stroke="#ffffff"
              strokeWidth="2"
              style={{
                transition: "x 0.05s ease-out",
                filter: "drop-shadow(0 0 4px var(--ui-brand-primary))"
              }}
            />
          )}

          {/* Interactive node indicator */}
          <circle cx="150" cy="120" r="5" fill="var(--ui-brand-secondary)" />
          <circle cx="350" cy="60" r="6" fill={accent} />

          {/* Text markers */}
          <text x="50" y="190" fill="var(--ui-content-muted)" fontSize="9">2024</text>
          <text x="150" y="190" fill="var(--ui-content-muted)" fontSize="9">Now</text>
          <text x="310" y="190" fill={accent} fontSize="9">2028 (Forecast)</text>
        </svg>
      </div>

      <div className="pred-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px" }}>
        <div className="pred-stat" style={{ background: "var(--ui-surface-muted)", padding: "10px", borderRadius: "8px" }}>
          <span className="pred-stat-lbl" style={{ fontSize: "9px", color: "var(--ui-content-muted)" }}>Appreciation Trend</span>
          <span className="pred-stat-val" style={{ display: "block", fontSize: "16px", fontWeight: 700, color: accent }}>{roiText}</span>
        </div>
        <div className="pred-stat" style={{ background: "var(--ui-surface-muted)", padding: "10px", borderRadius: "8px" }}>
          <span className="pred-stat-lbl" style={{ fontSize: "9px", color: "var(--ui-content-muted)" }}>Confidence Margin</span>
          <span className="pred-stat-val" style={{ display: "block", fontSize: "16px", fontWeight: 700, color: "var(--ui-content-strong)" }}>94.2%</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. Multi-market cards ─────────────────────────────────────────────────────

const MKT_DATA = [
  {
    flag: "🇬🇧", name: "England", color: "#3b82f6",
    price: "£482K", growth: "+3.2%", roi: "6.8%", bar: 58,
  },
  {
    flag: "🇦🇪", name: "Dubai", color: "#2dd4bf",
    price: "AED 1.2M", growth: "+5.7%", roi: "9.2%", bar: 76,
  },
  {
    flag: "🇪🇬", name: "Egypt", color: "#8b5cf6",
    price: "EGP 4.8M", growth: "+14.2%", roi: "11.4%", bar: 94,
  },
];

function MarketsMockup({ accent }: { accent: string }) {
  const [activeRadar, setActiveRadar] = useState<number | null>(null);

  return (
    <div className="mock mock-markets" style={{ position: "relative" }}>
      {/* Dynamic Dotted Radar Map Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, var(--ui-content-primary) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          zIndex: 0,
        }}
      />

      {/* Dynamic globemark with rotating rings */}
      <div className="globemark-container" style={{ position: "absolute", top: "12px", right: "20px", width: "40px", height: "40px", zIndex: 10 }}>
        <svg viewBox="0 0 40 40" style={{ width: "100%", height: "100%" }}>
          <circle cx="20" cy="20" r="16" stroke="var(--ui-border-subtle)" strokeWidth="1" fill="none" opacity="0.3" />
          <ellipse cx="20" cy="20" rx="16" ry="6" stroke={activeRadar !== null ? MKT_DATA[activeRadar].color : "var(--ui-brand-primary)"} strokeWidth="1" fill="none" className="globe-ring ring-1" style={{ transition: "stroke 0.3s" }} />
          <ellipse cx="20" cy="20" rx="6" ry="16" stroke={activeRadar !== null ? MKT_DATA[activeRadar].color : "var(--ui-brand-secondary)"} strokeWidth="1" fill="none" className="globe-ring ring-2" style={{ transition: "stroke 0.3s" }} />
          <circle cx="20" cy="20" r="3" fill={activeRadar !== null ? MKT_DATA[activeRadar].color : "var(--ui-brand-primary)"} className="globe-core" style={{ transition: "fill 0.3s" }} />
        </svg>
      </div>

      {/* Connecting laser beam line */}
      {activeRadar !== null && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <line
            x1={activeRadar === 0 ? "20%" : activeRadar === 1 ? "60%" : "80%"}
            y1={activeRadar === 0 ? "35%" : activeRadar === 1 ? "55%" : "70%"}
            x2={activeRadar === 0 ? "16.6%" : activeRadar === 1 ? "50%" : "83.3%"}
            y2="58%"
            stroke={MKT_DATA[activeRadar].color}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="mkt-laser-beam"
            style={{
              filter: `drop-shadow(0 0 3px ${MKT_DATA[activeRadar].color})`
            }}
          />
        </svg>
      )}

      {/* Radar pulse indicators mapping geographical coordinates */}
      {activeRadar !== null && (
        <div
          style={{
            position: "absolute",
            left: activeRadar === 0 ? "20%" : activeRadar === 1 ? "60%" : "80%",
            top: activeRadar === 0 ? "35%" : activeRadar === 1 ? "55%" : "70%",
            width: "30px",
            height: "30px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: MKT_DATA[activeRadar].color,
              animation: "radar-ping 1.2s infinite ease-out",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "11px",
              left: "11px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: MKT_DATA[activeRadar].color,
              boxShadow: `0 0 8px ${MKT_DATA[activeRadar].color}`,
            }}
          />
        </div>
      )}

      <div className="mock-header" style={{ position: "relative", zIndex: 2 }}>
        <div className="mock-dot" style={{ background: accent }} />
        <span className="mock-title">Market Intelligence</span>
        <div className="mock-status"><span className="mock-live-dot" /> {activeRadar !== null ? "Mapping Nodes" : "3 Live"}</div>
      </div>

      <div className="mkt-cards-row" style={{ position: "relative", zIndex: 2 }}>
        {MKT_DATA.map((m, i) => (
          <div
            key={i}
            className="mkt-mock-card mmc"
            onMouseEnter={() => setActiveRadar(i)}
            onMouseLeave={() => setActiveRadar(null)}
            style={{
              animationDelay: `0s`,
              "--mmc": m.color,
              borderColor: activeRadar === i ? m.color : "var(--ui-border-subtle)",
              transform: activeRadar === i ? "translateY(-4px)" : "translateY(0)",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
            } as React.CSSProperties}
          >
            <div className="mmc-flag">{m.flag}</div>
            <div className="mmc-name" style={{ color: m.color }}>{m.name}</div>
            <div className="mmc-stat">
              <div className="mmc-val">{m.price}</div>
              <div className="mmc-lbl">Avg. Price</div>
            </div>
            <div className="mmc-stat">
              <div className="mmc-val" style={{ color: m.color }}>{m.growth}</div>
              <div className="mmc-lbl">YoY Growth</div>
            </div>
            <div className="mmc-stat">
              <div className="mmc-val" style={{ color: m.color }}>{m.roi}</div>
              <div className="mmc-lbl">ROI Index</div>
            </div>
            <div className="mmc-bar-track">
              <div className="mmc-bar-fill" style={{ width: `${m.bar}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Comparison row */}
      <div className="mkt-compare" style={{ position: "relative", zIndex: 2 }}>
        <div className="mkt-compare-label">Investment Score Comparison</div>
        {MKT_DATA.map((m, i) => (
          <div
            key={i}
            className="mkt-cmp-row"
            style={{
              opacity: activeRadar === null || activeRadar === i ? 1 : 0.4,
              transition: "opacity 0.3s",
            }}
          >
            <span className="mkt-cmp-flag">{m.flag}</span>
            <div className="mkt-cmp-track">
              <div className="mkt-cmp-fill mcf" style={{ width: `${m.bar}%`, background: m.color }} />
            </div>
            <span className="mkt-cmp-roi" style={{ color: m.color }}>{m.roi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── All styles ───────────────────────────────────────────────────────────────

function FeaturesCSS() {
  return (
    <style>{`
      @keyframes radar-ping {
        0% { transform: scale(0.6); opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes bounce-h {
        0% { transform: translateX(0); }
        100% { transform: translateX(4px); }
      }

      /* ══ SECTION HEADER ════════════════════════════════════════════ */
      .fsh-head {
        padding: 100px 40px 64px;
        text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      }

      /* ══ SCROLL REVEAL ═════════════════════════════════════════════ */
      .fs-watch {
        opacity: 0;
        transform: translateY(36px);
        transition: opacity .75s ease, transform .75s ease;
      }
      .fs-watch.fs-on {
        opacity: 1; transform: translateY(0);
      }

      /* ══ FEATURE BLOCK ═════════════════════════════════════════════ */
      .fsb {
        position: relative; overflow: hidden;
        padding: 100px 40px;
        border-top: 1px solid var(--ui-border-subtle);
      }
      .fsb:nth-child(even) { background: var(--ui-surface-muted); }

      /* Blueprint grid background */
      .fsb-blueprint {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: 
          linear-gradient(color-mix(in srgb, var(--ui-brand-primary) 15%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--ui-brand-primary) 15%, transparent) 1px, transparent 1px);
        background-size: 24px 24px;
        opacity: 0.15;
        z-index: 0;
      }

      /* Background oversized number */
      .fsb-bg-num {
        position: absolute;
        font-family: var(--ui-font-logo);
        font-size: clamp(160px, 22vw, 280px);
        font-weight: 900; line-height: 1;
        opacity: .04; pointer-events: none;
        top: 50%; right: -20px; transform: translateY(-50%);
        letter-spacing: -.05em;
        user-select: none;
      }
      .fsb-flip .fsb-bg-num { right: auto; left: -20px; }

      /* Accent left rule - Comet effect */
      .fsb-rule {
        position: absolute; left: 45px; top: 0; bottom: 0;
        width: 4px; overflow: hidden;
        background: color-mix(in srgb, var(--ui-content-primary) 8%, transparent);
        z-index: 2;
      }
      @media (max-width: 900px) {
        .fsb-rule {
          left: 15px;
        }
      }
      .fsb-rule-pulse {
        width: 100%; height: 120px;
        border-radius: 4px;
        transform: translateY(-100%);
        opacity: 0;
        transition: opacity 0.3s;
        will-change: transform;
      }
      .fsb:hover .fsb-rule-pulse {
        opacity: 1;
        animation: pulse-travel-v 2s infinite linear;
      }
      @keyframes pulse-travel-v {
        0% { transform: translateY(-120px); }
        100% { transform: translateY(600px); }
      }


      /* Inner layout */
      .fsb-inner {
        max-width: 1200px; margin: 0 auto;
        display: grid; grid-template-columns: 1fr 1.2fr;
        gap: 80px; align-items: center;
        position: relative; z-index: 1;
      }
      .fsb-flip .fsb-inner { direction: rtl; }
      .fsb-flip .fsb-inner > * { direction: ltr; }

      @media (max-width: 900px) {
        .fsb-inner { grid-template-columns: 1fr; gap: 48px; }
        .fsb-flip .fsb-inner { direction: ltr; }
        .fsb { padding: 72px 24px; }
        .fsh-head { padding: 72px 24px 48px; }
      }

      /* ── Text side ── */
      .fsb-text {
        display: flex; flex-direction: column; gap: 24px;
      }
      .fsb-tag {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 5px 14px; border-radius: 20px;
        border: 1px solid; font-size: 11px; font-weight: 600;
        letter-spacing: .12em; text-transform: uppercase;
        width: fit-content; font-family: var(--ui-font-base);
        background: rgba(255,255,255,.04);
      }
      .fsb-title {
        font-family: var(--ui-font-logo);
        font-size: clamp(30px, 3.5vw, 46px);
        font-weight: 700; line-height: 1.15;
        color: var(--ui-content-strong);
        letter-spacing: -.015em;
      }
      .fsb-title-grad {
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .fsb-desc {
        font-size: 16px; color: var(--ui-content-secondary);
        line-height: 1.8; font-family: var(--ui-font-base);
        max-width: 480px;
      }
      .fsb-bullets {
        list-style: none; display: flex; flex-direction: column; gap: 14px;
      }
      .fsb-bullet {
        display: flex; align-items: flex-start; gap: 12px;
        font-size: 14px; color: var(--ui-content-primary);
        font-family: var(--ui-font-base); line-height: 1.5;
      }
      .fsb-bullet-icon { flex-shrink: 0; font-size: 16px; margin-top: 1px; }

      /* ── Visual side ── */
      .fsb-visual {
        display: flex; justify-content: center; align-items: center;
        width: 100%;
      }

      /* ══ SHARED MOCK SHELL ══════════════════════════════════════════ */
      .mock-spotlight-wrapper {
        width: 100%;
        border-radius: 16px;
      }
      .mock {
        width: 100%;
        min-height: 440px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 16px;
        box-shadow: var(--ui-shadow-card);
        overflow: hidden;
        font-family: var(--ui-font-base);
      }
      .dark .mock {
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
      }
      .mock-header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--ui-border-subtle);
        background: var(--ui-surface-muted);
      }
      .mock-dot    { width: 9px; height: 9px; border-radius: 50%; }
      .mock-title  { font-size: 13px; font-weight: 600; color: var(--ui-content-strong); flex: 1; font-family: var(--ui-font-logo); }
      .mock-status {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; color: var(--ui-content-muted);
      }
      .mock-live-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--ui-status-success);
        animation: dp 2s ease infinite;
      }
      @keyframes dp { 0%,100%{opacity:1} 50%{opacity:.25} }

      /* ══ CHAT MOCK ══════════════════════════════════════════════════ */
      .mock-body {
        padding: 16px 14px;
        display: flex; flex-direction: column; gap: 12px;
        max-height: 380px; overflow: hidden;
      }
      .chat-msg {
        display: flex; align-items: flex-start; gap: 8px;
        opacity: 0; animation: chat-in .4s ease forwards;
      }
      .chat-user { justify-content: flex-end; }
      .chat-avatar { font-size: 18px; flex-shrink: 0; }
      .chat-bubble {
        padding: 10px 14px; border-radius: 12px; max-width: 82%;
        font-size: 13px; line-height: 1.5;
      }
      .chat-bubble-user {
        background: var(--ui-brand-primary);
        color: var(--ui-content-on-brand);
        border-bottom-right-radius: 3px;
      }
      .chat-bubble-ai {
        background: var(--ui-surface-muted);
        color: var(--ui-content-primary);
        border-bottom-left-radius: 3px;
      }
      .chat-response-title {
        font-size: 11px; color: var(--ui-content-muted);
        margin-bottom: 8px; text-transform: uppercase; letter-spacing: .08em;
      }
      .chat-row {
        display: flex; align-items: center; gap: 8px;
        padding: 5px 0; opacity: 0;
        animation: chat-in .3s ease forwards;
      }
      .chat-area  { font-size: 12px; color: var(--ui-content-strong); width: 96px; flex-shrink: 0; }
      .chat-bar-track { flex: 1; height: 5px; background: var(--ui-border-subtle); border-radius: 3px; overflow: hidden; }
      .chat-bar   { height: 100%; border-radius: 3px; animation: bar-grow .6s ease forwards; transform-origin: left; }
      .chat-roi   { font-size: 12px; font-weight: 700; width: 40px; text-align: right; flex-shrink: 0; }

      .chat-card {
        background: var(--ui-surface-muted);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 10px; padding: 12px 14px; flex: 1;
      }
      .chat-card-title { font-size: 11px; color: var(--ui-content-muted); margin-bottom: 8px; }
      .chat-mini-chart { display: flex; align-items: flex-end; gap: 4px; height: 44px; }
      .chat-mini-bar   {
        flex: 1; border-radius: 3px 3px 0 0;
        opacity: 0; animation: bar-up .5s ease forwards;
      }

      .chat-typing {
        display: flex; align-items: center; gap: 5px;
        background: var(--ui-surface-muted);
        padding: 10px 16px; border-radius: 12px; border-bottom-left-radius: 3px;
      }
      .chat-typing span {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--ui-content-muted);
        animation: typing-dot .9s ease infinite;
      }
      .chat-typing span:nth-child(2) { animation-delay: .15s; }
      .chat-typing span:nth-child(3) { animation-delay: .30s; }
      @keyframes typing-dot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

      .mock-input-bar {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 14px;
        border-top: 1px solid var(--ui-border-subtle);
        background: var(--ui-surface-muted);
      }
      .mock-input {
        flex: 1; padding: 8px 12px;
        background: var(--ui-surface-card);
        border: 1px solid var(--ui-border-subtle);
        border-radius: 8px; font-size: 12px;
        color: var(--ui-content-muted);
      }
      .mock-send {
        width: 32px; height: 32px; border-radius: 8px;
        border: none; cursor: pointer;
        color: #fff; font-size: 14px;
      }

      /* Staggered chat message animations */
      .cm1 { animation-delay: 0.4s; }
      .cm2 { animation-delay: 1.2s; }
      .cm3 { animation-delay: 2.4s; }
      .cm4 { animation-delay: 4.8s; }
      @keyframes chat-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes bar-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
      @keyframes bar-up   { from{opacity:0;transform:scaleY(0)} to{opacity:1;transform:scaleY(1)} }

      /* ══ CHART MOCK ═════════════════════════════════════════════════ */
      .mock-chart .mock-body { max-height: none; overflow: visible; }
      .chart-kpi-row {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 0; border-bottom: 1px solid var(--ui-border-subtle);
      }
      .chart-kpi {
        padding: 14px 16px;
        border-right: 1px solid var(--ui-border-subtle);
        opacity: 0; animation: chat-in .4s ease forwards;
      }
      .chart-kpi:last-child { border-right: none; }
      .chart-kpi-val  { font-family: var(--ui-font-logo); font-size: 20px; font-weight: 700; margin-top: 4px; }
      .chart-kpi-lbl  { font-size: 10px; color: var(--ui-content-muted); margin-top: 2px; text-transform: uppercase; letter-spacing: .06em; }
      .chart-kpi-delta{ font-size: 11px; color: var(--ui-status-success); margin-top: 2px; }

      .chart-area {
        padding: 20px 16px 8px;
        display: flex; gap: 8px;
        height: 180px;
      }
      .chart-y-labels {
        display: flex; flex-direction: column; justify-content: space-between;
        font-size: 9px; color: var(--ui-content-muted);
        text-align: right; padding-bottom: 20px;
        min-width: 28px;
      }
      .chart-bars {
        display: flex; align-items: flex-end; gap: 6px; flex: 1;
        border-left: 1px solid var(--ui-border-subtle);
        border-bottom: 1px solid var(--ui-border-subtle);
        padding: 0 4px 0 8px;
      }
      .chart-bar-col   { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; height: 100%; justify-content: flex-end; }
      .chart-bar-wrap  { flex: 1; display: flex; align-items: flex-end; width: 100%; }
      .chart-bar       { width: 100%; border-radius: 4px 4px 0 0; transform-origin: bottom; opacity: 0; }
      .cb-anim         { animation: bar-up .6s ease forwards; }
      .chart-bar-label { font-size: 9px; color: var(--ui-content-muted); white-space: nowrap; }
      .chart-legend {
        display: flex; gap: 16px; justify-content: center;
        padding: 10px 16px 14px;
        border-top: 1px solid var(--ui-border-subtle);
      }
      .chart-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ui-content-secondary); }

      /* ══ WORKSPACE MOCK ════════════════════════════════════════════ */
      .mock-workspace .mock-body { flex-direction: column; gap: 4px; max-height: none; padding: 14px; }
      .ws-storage    { font-size: 11px; color: var(--ui-content-muted); }
      .ws-storage-bar {
        height: 4px; background: var(--ui-surface-muted); margin: 0;
        border-radius: 0;
      }
      .ws-storage-fill {
        height: 100%; width: 76%; border-radius: 2px;
        animation: bar-grow .8s ease .3s both;
        transform-origin: left;
      }
      .ws-folders { display: flex; flex-direction: column; gap: 2px; padding: 12px 0 8px; }
      .ws-folder {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 12px; border-radius: 8px;
        background: var(--ui-surface-muted);
        border: 1px solid var(--ui-border-subtle);
        opacity: 0; animation: chat-in .35s ease forwards;
        cursor: pointer; transition: background .2s;
      }
      .ws-folder:hover { background: var(--ui-surface-card); }
      .ws-folder-name { font-size: 13px; font-weight: 500; color: var(--ui-content-strong); }
      .ws-folder-meta { display: flex; gap: 12px; font-size: 11px; color: var(--ui-content-muted); }
      .ws-upload-section { padding: 12px 0 4px; border-top: 1px solid var(--ui-border-subtle); }
      .ws-upload-label { display: flex; gap: 8px; font-size: 12px; color: var(--ui-content-secondary); margin-bottom: 8px; }
      .ws-progress-track { height: 6px; background: var(--ui-surface-muted); border-radius: 4px; overflow: hidden; }
      .ws-progress-bar   { height: 100%; width: 68%; border-radius: 4px; animation: bar-grow 1s ease .6s both; transform-origin: left; }
      .ws-progress-meta  { display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; color: var(--ui-content-muted); }
      .ws-done { padding: 10px 12px; margin-top: 8px; border-radius: 10px; background: rgba(16,216,121,.06); border: 1px solid rgba(16,216,121,.18); opacity: 0; animation: chat-in .4s ease 1.4s forwards; }
      .ws-done-row   { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ui-content-strong); font-weight: 500; margin-bottom: 8px; }
      .ws-done-name  { color: var(--ui-content-primary); font-size: 12px; }
      .ws-done-badges { display: flex; gap: 6px; flex-wrap: wrap; }
      .ws-badge {
        font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600;
        letter-spacing: .06em;
      }
      .ws-badge-ok { background: rgba(16,216,121,.12); color: var(--ui-status-success); border: 1px solid rgba(16,216,121,.25); }

      /* ══ MARKETS MOCK ══════════════════════════════════════════════ */
      .mock-markets .mock-body { max-height: none; flex-direction: column; gap: 16px; padding: 16px; }
      .mkt-cards-row { display: flex; gap: 10px; }
      .mkt-mock-card {
        flex: 1; border-radius: 12px; padding: 14px 12px;
        background: color-mix(in srgb, var(--mmc) 6%, var(--ui-surface-card));
        border: 1px solid color-mix(in srgb, var(--mmc) 15%, var(--ui-border-subtle));
        display: flex; flex-direction: column; gap: 8px;
        opacity: 0; animation: chat-in .45s ease forwards;
        transition: border-color .25s, background .25s, transform .25s;
        border-top: 2px solid var(--mmc, var(--ui-brand-primary));
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .dark .mkt-mock-card {
        background: color-mix(in srgb, var(--mmc) 10%, #0f172a) !important;
        border: 1px solid color-mix(in srgb, var(--mmc) 25%, rgba(255, 255, 255, 0.05)) !important;
      }
      .mmc-flag { font-size: 22px; }
      .mmc-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
      .mmc-stat { }
      .mmc-val  { font-family: var(--ui-font-logo); font-size: 14px; font-weight: 700; color: var(--ui-content-strong); }
      .mmc-lbl  { font-size: 10px; color: var(--ui-content-muted); }
      .mmc-bar-track { height: 4px; background: var(--ui-border-subtle); border-radius: 2px; overflow: hidden; margin-top: 4px; }
      .mmc-bar-fill  { height: 100%; border-radius: 2px; animation: bar-grow .7s ease forwards; transform-origin: left; }

      .mkt-compare { padding: 12px; background: var(--ui-surface-muted); border-radius: 10px; }
      .mkt-compare-label { font-size: 10px; color: var(--ui-content-muted); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 10px; }
      .mkt-cmp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .mkt-cmp-row:last-child { margin-bottom: 0; }
      .mkt-cmp-flag  { font-size: 14px; flex-shrink: 0; }
      .mkt-cmp-track { flex: 1; height: 6px; background: var(--ui-border-subtle); border-radius: 3px; overflow: hidden; }
      .mkt-cmp-fill  { height: 100%; border-radius: 3px; opacity: 0; animation: bar-grow .7s ease forwards; transform-origin: left; }
      .mkt-cmp-roi   { font-size: 12px; font-weight: 700; min-width: 38px; text-align: right; font-family: var(--ui-font-logo); }

      @media (max-width: 640px) {
        .mkt-cards-row { flex-direction: column; }
      }

      /* ── MoveIQ Aura & Core ── */
      @keyframes fs-aura-ripple {
        0% { transform: scale(0.95); opacity: 0.8; }
        100% { transform: scale(1.35); opacity: 0; }
      }
      .fs-aura-ring {
        transform-origin: 200px 105px;
        animation: fs-aura-ripple 2.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
      }
      .ring-2 { animation-delay: 1.25s; }

      .data-core-bubble {
        width: 14px; height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffffff 30%, var(--ac, var(--ui-brand-primary)));
        box-shadow: 0 0 12px var(--ac, var(--ui-brand-primary));
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        animation: core-float 3s ease-in-out infinite alternate;
        transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        pointer-events: none;
        z-index: 10;
      }
      .mock-input-bar:hover .data-core-bubble {
        left: calc(100% - 48px);
        transform: translateY(-50%) scale(0.2);
        opacity: 0;
      }
      @keyframes core-float {
        0% { transform: translateY(-50%) translateY(-2px) scale(1); }
        100% { transform: translateY(-50%) translateY(2px) scale(1.05); }
      }

      /* ── Dashboard Radar Scan & 3D Bars ── */
      @keyframes radar-scan {
        0% { left: 0%; opacity: 0; }
        10% { opacity: 0.8; }
        90% { opacity: 0.8; }
        100% { left: 100%; opacity: 0; }
      }
      .chart-radar-scan {
        position: absolute;
        top: 0; bottom: 20px;
        width: 30px;
        pointer-events: none;
        z-index: 4;
        animation: radar-scan 4s linear infinite;
      }
      .chart-bar {
        position: relative;
        transition: height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.3s, box-shadow 0.3s;
      }
      .mock-chart:hover .chart-bar {
        transform: translateY(-2px);
        filter: brightness(1.15) drop-shadow(0 0 8px var(--bar-glow, var(--ui-brand-primary)));
      }

      /* ── Workspace shockwave ── */
      @keyframes badge-shockwave {
        0% { transform: scale(0.95); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .badge-shockwave-ring {
        position: absolute;
        inset: -1px;
        border-radius: 4px;
        border: 1.5px solid var(--ac, var(--ui-brand-accent));
        box-shadow: 0 0 10px var(--ac, var(--ui-brand-accent));
        animation: badge-shockwave 1.2s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
        pointer-events: none;
      }

      /* ── Globemark & Laser Beam ── */
      @keyframes globe-spin-1 {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes globe-spin-2 {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      .globe-ring {
        transform-origin: 20px 20px;
      }
      .globe-ring.ring-1 {
        animation: globe-spin-1 6s linear infinite;
      }
      .globe-ring.ring-2 {
        animation: globe-spin-2 8s linear infinite;
      }
      @keyframes laser-flow {
        from { stroke-dashoffset: 20; }
        to { stroke-dashoffset: 0; }
      }
      .mkt-laser-beam {
        animation: laser-flow 0.5s linear infinite;
      }

      /* ── Predictions ── */
      @keyframes pulse-glow {
        0% { opacity: 0.15; stroke-width: 6px; }
        100% { opacity: 0.45; stroke-width: 10px; }
      }
    `}</style>
  );
}
