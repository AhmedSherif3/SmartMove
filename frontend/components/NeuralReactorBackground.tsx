"use client";

import { useEffect, useRef } from "react";

// ─── Tuneable constants ─────────────────────────────────────────────────────

const PARTICLE_COUNT = 55; // lower = better perf, higher = denser mesh
const CONNECT_DIST = 330; // px — particles within this range draw a line
const CORE_RADIUS = 90; // base radius of the central energy core
const RING_COUNT = 4; // number of orbital rings
const STAR_COUNT = 110; // ambient background stars
const RIPPLE_INTERVAL = 4200; // ms between auto ripples

// Colors pulled from PropSphere CSS vars at runtime (see getRuntimeColors below)
// Fallbacks match your :root definitions exactly
const FALLBACK = {
  primary: "#3b82f6",
  accent: "#8b5cf6",
  secondary: "#2dd4bf",
};

export default function NeuralReactorBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Bail out for users who prefer reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── State shared across draw functions ──────────────────────────────────
    let W: number, H: number, cx: number, cy: number;
    let rafId: number | null = null;
    let running = true;
    let t = 0;
    let lastRipple = 0;
    const mouse = { x: 0, y: 0 };
    const ripples: Array<{ cx: number; cy: number; r: number; a: number; color: string }> = [];

    // ── Read live CSS variable colours ──────────────────────────────────────
    function getRuntimeColors() {
      const s = getComputedStyle(document.documentElement);
      return {
        primary: s.getPropertyValue("--ui-brand-primary").trim() || FALLBACK.primary,
        accent: s.getPropertyValue("--ui-brand-accent").trim() || FALLBACK.accent,
        secondary: s.getPropertyValue("--ui-brand-secondary").trim() || FALLBACK.secondary,
      };
    }

    // ── Detect dark mode (works with your .dark class strategy) ─────────────
    const isDark = () => document.documentElement.classList.contains("dark");

    // ── DPR-aware canvas resize ──────────────────────────────────────────────
    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× — 3× is wasteful
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
    }

    // ── Particle pool ────────────────────────────────────────────────────────
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const radius = 250 + Math.random() * 600;
      return {
        angle: Math.random() * Math.PI * 2,
        radius,
        speed: (Math.random() * 0.25 + 0.04) * (Math.random() > 0.5 ? 1 : -1) * 0.007,
        size: Math.random() * 3.0 + 1.0,
        alpha: Math.random() * 0.5 + 0.5,
        tilt: (Math.random() - 0.5) * 0.45,
        phase: Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * 3), // 0=primary 1=accent 2=secondary
      };
    });

    // ── Ring definitions ─────────────────────────────────────────────────────
    const rings = [
      { r: 285, speed: 0.0025, width: 2.0, alphaBase: 0.40, tilt: 0.30, dash: [] as number[] },
      { r: 444, speed: -0.0018, width: 1.5, alphaBase: 0.35, tilt: -0.20, dash: [8, 5] },
      { r: 585, speed: 0.0012, width: 1.8, alphaBase: 0.25, tilt: 0.14, dash: [4, 8] },
      { r: 714, speed: -0.0008, width: 1.5, alphaBase: 0.15, tilt: -0.09, dash: [] as number[] },
    ];
    const ringAngles = new Float32Array(RING_COUNT);

    // ── Static star positions (generated once) ───────────────────────────────
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      xf: Math.random(), // fractional so they rescale on resize
      yf: Math.random(),
      r: Math.random() * 0.7 + 0.2,
      alpha: Math.random() * 0.35 + 0.08,
      phase: Math.random() * Math.PI * 2,
    }));

    // ────────────────────────────────────────────────────────────────────────
    // DRAW HELPERS
    // ────────────────────────────────────────────────────────────────────────

    function drawBackground() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
    }

    function drawStars() {
      if (!ctx) return;
      const twinkleT = t * 0.8;
      stars.forEach((s) => {
        const a = s.alpha + Math.sin(twinkleT + s.phase) * 0.08;
        ctx.fillStyle = `rgba(200,220,255,${Math.max(0, a)})`;
        ctx.beginPath();
        ctx.arc(s.xf * W, s.yf * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawRipples() {
      if (!ctx) return;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 4.5;
        rp.a *= 0.955;
        if (rp.a < 0.008) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.cx, rp.cy, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color + hexAlpha(rp.a * 0.55);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    function drawRings(colors: { primary: string; accent: string; secondary: string }) {
      if (!ctx) return;
      rings.forEach((ring, i) => {
        ringAngles[i] += ring.speed;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ringAngles[i]);
        const scaleY = Math.sin(ring.tilt + ringAngles[i] * 0.28) * 0.38 + 0.62;
        ctx.scale(1, scaleY);
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = colors.primary + hexAlpha(ring.alphaBase);
        ctx.lineWidth = ring.width;
        if (ring.dash.length) ctx.setLineDash(ring.dash);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });
    }

    function drawParticlesAndMesh(colors: { primary: string; accent: string; secondary: string }) {
      if (!ctx) return;
      const colorArr = [colors.primary, colors.accent, colors.secondary];
      const mx = (mouse.x - cx) * 0.038;
      const my = (mouse.y - cy) * 0.038;
      const positions: Array<{ x: number; y: number; color: string; a: number; r: number }> = [];

      // Build positions
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = cx + p.radius * Math.cos(p.angle) + mx;
        const py = cy + p.radius * Math.sin(p.angle) * (0.5 + Math.abs(Math.sin(p.tilt))) + my;
        positions.push({ x: px, y: py, color: colorArr[p.colorIdx], a: p.alpha, r: p.size });
      });

      // Mesh lines (drawn first, under particles)
      ctx.lineWidth = 0.85;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const lineA = (1 - d / CONNECT_DIST) * 0.55;
            ctx.beginPath();
            ctx.moveTo(positions[i].x, positions[i].y);
            ctx.lineTo(positions[j].x, positions[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${Math.max(0, lineA)})`;
            ctx.stroke();
          }
        }
      }

      // Particle dots
      positions.forEach((p) => {
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color + hexAlpha(p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    function drawCore(colors: { primary: string; accent: string; secondary: string }) {
      if (!ctx) return;
      const pulse = Math.sin(t * 1.4) * 0.14 + 0.88;
      const r = CORE_RADIUS * pulse;

      // Outer ambient glow
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.5);
      g2.addColorStop(0, colors.primary + "28");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Core body
      ctx.shadowBlur = 45;
      ctx.shadowColor = colors.primary;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g1.addColorStop(0, "rgba(255,255,255,1)");
      g1.addColorStop(0.4, colors.primary + "ee");
      g1.addColorStop(1, "rgba(20,60,160,0)");
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawScanLine() {
      if (!ctx) return;
      // A very subtle horizontal scan sweep every ~5s
      const period = 5000;
      const phase = ((t * 1000) % period) / period;
      if (phase < 0.12) {
        const a = Math.sin((phase / 0.12) * Math.PI) * 0.05;
        const g = ctx.createLinearGradient(0, cy - 1, 0, cy + 1);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.5, `rgba(59,130,246,${Math.max(0, a)})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, cy - 50, W, 100);
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // MAIN LOOP
    // ────────────────────────────────────────────────────────────────────────

    let lastTime = 0;
    function frame(now: number) {
      if (!running) return;
      // Cap delta so a hidden-tab burst doesn't jump physics
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      t += dt * 0.001;

      const colors = getRuntimeColors();

      drawBackground();
      if (isDark()) drawStars(); // stars only in dark mode
      drawScanLine();
      drawRipples();
      drawRings(colors);
      drawParticlesAndMesh(colors);
      drawCore(colors);

      // Auto ripple
      if (now - lastRipple > RIPPLE_INTERVAL) {
        lastRipple = now;
        ripples.push({ cx, cy, r: 0, a: 0.8, color: colors.primary });
      }

      rafId = requestAnimationFrame(frame);
    }

    // ────────────────────────────────────────────────────────────────────────
    // SETUP & CLEANUP
    // ────────────────────────────────────────────────────────────────────────

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
      } else {
        running = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    rafId = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // ← never blocks clicks / scrolls
        zIndex: 0, // behind everything; your layout needs z-index ≥ 1
        display: "block",
        // Light mode: almost invisible (just a faint ambient depth)
        // Dark mode: full presence — controlled by `.dark` class on <html>
        // Note: Using CSS variable from globals.css inside style
        opacity: "var(--reactor-opacity, 0.18)",
      }}
    />
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Convert 0-1 float to 2-char hex for colour string concatenation */
function hexAlpha(a: number) {
  return Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
}
