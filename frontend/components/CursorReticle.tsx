"use client";

/**
 * CursorReticle.tsx — PropSphere
 *
 * Elite HUD reticle. Three culturally-grounded geometries, one per country.
 * Smooth lerp follow. RAF-driven, zero React re-renders during motion.
 *
 * London → Rangefinder / optical sight (diagonal corner brackets, crosshair)
 * Dubai  → Rub el Hizb (Islamic 8-pointed geometry, two overlapping squares)
 * Cairo  → Eye of Horus (almond eye shape as targeting reticle)
 *
 * Country label appears for 2s on country change only — never permanently.
 *
 * Setup: mount once inside PortalWarpProvider, anywhere in tree.
 *   <CursorReticle />
 */

import { useEffect, useRef, useState } from "react";
import { usePortalWarp } from "./PortalWarpTransition";

// ─── Config ───────────────────────────────────────────────────────────────────

const PALETTE = {
  london: "#3b82f6",
  dubai: "#2dd4bf",
  cairo: "#8b5cf6",
} as const;
type Country = keyof typeof PALETTE;

const LABELS: Record<Country, string> = {
  london: "ENGLAND",
  dubai: "DUBAI",
  cairo: "EGYPT",
};

const SIZE = 52; // reticle bounding box (px)
const HALF = SIZE / 2; // 26 — used to center on cursor
const LERP = 0.185; // follow speed — 0.185 ≈ ~70ms natural lag at 60fps
const SCALE_HOT = 1.28; // scale on interactive hover
const SCALE_DEF = 1.0;

// ─── Component ────────────────────────────────────────────────────────────────

export function CursorReticle() {
  const { currentCountry } = usePortalWarp();

  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  // RAF state — all refs, zero re-renders during motion
  const posRef = useRef({ x: -200, y: -200 });
  const targetRef = useRef({ x: -200, y: -200 });
  const scaleRef = useRef(SCALE_DEF);
  const scaleTarget = useRef(SCALE_DEF);
  const visRef = useRef(false);

  // Country label (brief flash on change)
  const [labelState, setLabelState] = useState<{
    text: string;
    col: string;
    visible: boolean;
  }>({
    text: "",
    col: PALETTE.london,
    visible: false,
  });
  const prevCountry = useRef<string>(currentCountry);

  // ── Country change → flash label ─────────────────────────────────────────
  useEffect(() => {
    if (currentCountry === prevCountry.current) return;
    prevCountry.current = currentCountry;

    const col = PALETTE[currentCountry as Country] ?? PALETTE.london;
    const text = LABELS[currentCountry as Country] ?? "UNKNOWN";

    const showRaf = requestAnimationFrame(() => {
      setLabelState({ text, col, visible: true });
    });

    const t = setTimeout(
      () => setLabelState((s) => ({ ...s, visible: false })),
      2000,
    );
    return () => {
      cancelAnimationFrame(showRaf);
      clearTimeout(t);
    };
  }, [currentCountry]);

  // ── RAF-driven smooth follow ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    const label = labelRef.current;
    if (!el) return;

    const element = el;
    const labelEl = label;

    let raf: number;

    function tick() {
      // Lerp position
      const pos = posRef.current,
        tgt = targetRef.current;
      pos.x += (tgt.x - pos.x) * LERP;
      pos.y += (tgt.y - pos.y) * LERP;

      // Lerp scale
      scaleRef.current += (scaleTarget.current - scaleRef.current) * LERP;

      if (visRef.current) {
        // Centered: subtract HALF so the SVG centre lands on the cursor
        element.style.transform = `translate3d(${pos.x - HALF}px, ${pos.y - HALF}px, 0) scale(${scaleRef.current})`;
        element.style.opacity = "1";

        // Label floats slightly right of the reticle
        if (labelEl) {
          labelEl.style.transform = `translate3d(${pos.x + HALF + 10}px, ${pos.y - 10}px, 0)`;
        }
      } else {
        element.style.opacity = "0";
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    // Mouse events — refs only, no state
    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      visRef.current = true;

      const t = e.target as HTMLElement;
      const hot = !!t?.closest(
        "button, a, [role=button], input, select, textarea, [tabindex='0'], .cursor-hot",
      );
      scaleTarget.current = hot ? SCALE_HOT : SCALE_DEF;
    };

    const onLeave = () => {
      visRef.current = false;
    };
    const onEnter = () => {
      visRef.current = true;
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  const col = PALETTE[currentCountry as Country] ?? PALETTE.london;

  return (
    <>
      {/* ── Reticle ────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0,
          transition: "opacity 0.35s ease",
          willChange: "transform, opacity",
        }}
      >
        {currentCountry === "london" && <LondonReticle col={col} />}
        {currentCountry === "dubai" && <DubaiReticle col={col} />}
        {currentCountry === "cairo" && <CairoReticle col={col} />}
      </div>

      {/* ── Country label — floats next to reticle, 2s on change only ── */}
      <div
        ref={labelRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontFamily: '"DM Mono", "Courier New", monospace',
            color: labelState.col,
            background: `${labelState.col}14`,
            border: `1px solid ${labelState.col}38`,
            padding: "3px 9px",
            borderRadius: 3,
            opacity: labelState.visible ? 1 : 0,
            transform: labelState.visible ? "translateX(0)" : "translateX(-6px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
            whiteSpace: "nowrap",
          }}
        >
          {labelState.text}
        </span>
      </div>

      {/* ── CSS keyframes ─────────────────────────────────────────────── */}
      <style>{RETICLE_CSS}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LONDON — Rangefinder / Optical Sight
//  Diagonal corner brackets (like a camera viewfinder or rifle scope)
//  Crosshair lines, rotating outer ring, diamond centre
// ═══════════════════════════════════════════════════════════════════════════════

function LondonReticle({ col }: { col: string }) {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 52 52" fill="none" overflow="visible">
      <g stroke={col} strokeLinecap="round" strokeLinejoin="round">
        {/* Corner brackets — diagonal, like a rangefinder */}
        <path d="M 7 2 L 2 2 L 2 7" strokeWidth="2" />
        <path d="M 2 45 L 2 50 L 7 50" strokeWidth="2" />
        <path d="M 45 50 L 50 50 L 50 45" strokeWidth="2" />
        <path d="M 50 7 L 50 2 L 45 2" strokeWidth="2" />

        {/* Tick marks inside brackets */}
        <line x1="13" y1="2" x2="17" y2="2" strokeWidth="1" opacity="0.45" />
        <line x1="35" y1="2" x2="39" y2="2" strokeWidth="1" opacity="0.45" />
        <line x1="2" y1="13" x2="2" y2="17" strokeWidth="1" opacity="0.45" />
        <line x1="2" y1="35" x2="2" y2="39" strokeWidth="1" opacity="0.45" />
        <line x1="50" y1="13" x2="50" y2="17" strokeWidth="1" opacity="0.45" />
        <line x1="50" y1="35" x2="50" y2="39" strokeWidth="1" opacity="0.45" />
        <line x1="13" y1="50" x2="17" y2="50" strokeWidth="1" opacity="0.45" />
        <line x1="35" y1="50" x2="39" y2="50" strokeWidth="1" opacity="0.45" />

        {/* Crosshair lines (stop before centre) */}
        <line x1="0" y1="26" x2="18" y2="26" strokeWidth="0.9" opacity="0.55" />
        <line x1="34" y1="26" x2="52" y2="26" strokeWidth="0.9" opacity="0.55" />
        <line x1="26" y1="0" x2="26" y2="18" strokeWidth="0.9" opacity="0.55" />
        <line x1="26" y1="34" x2="26" y2="52" strokeWidth="0.9" opacity="0.55" />

        {/* Outer rotating dashed ring */}
        <circle
          cx="26"
          cy="26"
          r="21"
          strokeWidth="0.8"
          strokeDasharray="4 10"
          opacity="0.38"
          className="rc-spin-cw"
          style={{ transformOrigin: "26px 26px" }}
        />

        {/* Inner precision ring */}
        <circle
          cx="26"
          cy="26"
          r="12"
          strokeWidth="0.65"
          strokeDasharray="2 6"
          opacity="0.3"
          className="rc-spin-ccw"
          style={{ transformOrigin: "26px 26px" }}
        />

        {/* Centre diamond */}
        <rect
          x="22.5"
          y="22.5"
          width="7"
          height="7"
          strokeWidth="1.4"
          transform="rotate(45 26 26)"
        />

        {/* Inner pip */}
        <circle cx="26" cy="26" r="1.5" fill={col} stroke="none" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DUBAI — Rub el Hizb (Islamic geometric art)
//  Two squares overlapping at 45° = 8-pointed star
// ═══════════════════════════════════════════════════════════════════════════════

function DubaiReticle({ col }: { col: string }) {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 52 52" fill="none" overflow="visible">
      <g stroke={col} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer scanning ring */}
        <circle
          cx="26"
          cy="26"
          r="23"
          strokeWidth="0.7"
          strokeDasharray="3 9"
          opacity="0.35"
          className="rc-spin-ccw"
          style={{ transformOrigin: "26px 26px" }}
        />

        {/* Square 1 — axis aligned, slow counter-clockwise */}
        <rect
          x="10"
          y="10"
          width="32"
          height="32"
          strokeWidth="1.4"
          className="rc-spin-ccw-slow"
          style={{ transformOrigin: "26px 26px" }}
        />

        {/* Square 2 — rotated 45°, slow clockwise */}
        <rect
          x="10"
          y="10"
          width="32"
          height="32"
          strokeWidth="1.4"
          transform="rotate(45 26 26)"
          className="rc-spin-cw-slow"
          style={{ transformOrigin: "26px 26px" }}
        />

        {/* Inner circle — intersection of the two squares */}
        <circle cx="26" cy="26" r="9" strokeWidth="1" opacity="0.65" />

        {/* 8 radial tick marks at star points */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const r1 = 11,
            r2 = 14;
          return (
            <line
              key={i}
              x1={26 + Math.cos(a) * r1}
              y1={26 + Math.sin(a) * r1}
              x2={26 + Math.cos(a) * r2}
              y2={26 + Math.sin(a) * r2}
              strokeWidth="1.2"
              opacity="0.7"
            />
          );
        })}

        {/* Centre dot */}
        <circle cx="26" cy="26" r="2.8" fill={col} stroke="none" />

        {/* Inner pip ring */}
        <circle cx="26" cy="26" r="5" strokeWidth="0.8" opacity="0.5" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CAIRO — Eye of Horus as targeting reticle
// ═══════════════════════════════════════════════════════════════════════════════

function CairoReticle({ col }: { col: string }) {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 52 52" fill="none" overflow="visible">
      <g stroke={col} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer almond — the eye shape */}
        <path
          d="M 4 26 C 8 14 18 10 26 10 C 34 10 44 14 48 26 C 44 38 34 42 26 42 C 18 42 8 38 4 26 Z"
          strokeWidth="1.5"
        />

        {/* Iris */}
        <circle cx="26" cy="26" r="9" strokeWidth="1.2" />

        {/* Pupil — filled */}
        <circle cx="26" cy="26" r="3.5" fill={col} stroke="none" />

        {/* Pupil ring */}
        <circle cx="26" cy="26" r="5.5" strokeWidth="0.8" opacity="0.55" />

        {/* Left kohl line — extends beyond the eye corner */}
        <path d="M 4 26 L -4 21" strokeWidth="1.4" />

        {/* Right kohl lines — the characteristic Horus drop */}
        <path d="M 48 26 L 56 21" strokeWidth="1.4" />
        <path d="M 48 26 C 52 30 50 36 46 38" strokeWidth="1.2" />

        {/* Scanning arcs — pulse above and below the eye */}
        <path
          d="M 14 8 Q 26 0 38 8"
          strokeWidth="0.8"
          opacity="0.4"
          className="rc-pulse"
        />
        <path
          d="M 14 44 Q 26 52 38 44"
          strokeWidth="0.8"
          opacity="0.4"
          className="rc-pulse"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Side tick marks */}
        <line x1="4" y1="22" x2="4" y2="30" strokeWidth="0.8" opacity="0.4" />
        <line x1="48" y1="22" x2="48" y2="30" strokeWidth="0.8" opacity="0.4" />
        <line x1="22" y1="10" x2="30" y2="10" strokeWidth="0.8" opacity="0.4" />
        <line x1="22" y1="42" x2="30" y2="42" strokeWidth="0.8" opacity="0.4" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSS keyframes — all on compositor thread
// ═══════════════════════════════════════════════════════════════════════════════

const RETICLE_CSS = `
  @keyframes rc-cw        { to { transform: rotate(360deg);  } }
  @keyframes rc-ccw       { to { transform: rotate(-360deg); } }
  @keyframes rc-pulse-arc { 0%,100%{opacity:0.2} 50%{opacity:0.7} }

  .rc-spin-cw      { animation: rc-cw  7s  linear   infinite; }
  .rc-spin-ccw     { animation: rc-ccw 9s  linear   infinite; }
  .rc-spin-cw-slow { animation: rc-cw  18s linear   infinite; }
  .rc-spin-ccw-slow{ animation: rc-ccw 14s linear   infinite; }
  .rc-pulse        { animation: rc-pulse-arc 2.4s ease infinite; }
`;
