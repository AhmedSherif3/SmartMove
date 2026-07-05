"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePortalWarp } from "./PortalWarpTransition";

// ─── Ribbon ──────────────────────────────────────────────────────────────────

export function CountryRibbon() {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[2px] z-[60] transition-all duration-700"
      style={{ background: "var(--ui-country-ribbon)" }}
    />
  );
}

// ─── Animated Flag (Cloth Simulation) ────────────────────────────────────────

export function CountryFlagAnimated({ size = 32 }: { size?: number }) {
  const { currentCountry } = usePortalWarp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = size;
    const h = (size * 2) / 3;
    canvas.width  = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    let t = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.05;

      const cols = 20;
      const rows = 12;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const wave  = Math.sin(i * 0.45 - t) * 2.5;
          const x     = i * cellW;
          const y     = j * cellH + wave * (i / cols);
          const shade = Math.cos(i * 0.45 - t) * 0.12;

          ctx.fillStyle = getFlagColor(currentCountry, i / cols, j / rows);
          ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);

          if (shade > 0) {
            ctx.fillStyle = `rgba(0,0,0,${shade})`;
            ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
          } else {
            ctx.fillStyle = `rgba(255,255,255,${Math.abs(shade) * 0.4})`;
            ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
          }
        }
      }

      ctx.fillStyle = "rgba(180,190,200,0.6)";
      ctx.fillRect(0, 0, 2, h);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [currentCountry, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: (size * 2) / 3, borderRadius: 2 }}
      className="shadow-md"
    />
  );
}

function getFlagColor(country: string, px: number, py: number): string {
  if (country === "london") {
    const isV = px > 0.42 && px < 0.58;
    const isH = py > 0.38 && py < 0.62;
    return isV || isH ? "#CF142B" : "#FFFFFF";
  }
  if (country === "dubai") {
    if (px < 0.25) return "#FF0000";
    if (py < 0.33) return "#00732F";
    if (py < 0.66) return "#FFFFFF";
    return "#000000";
  }
  if (country === "cairo") {
    if (py < 0.33) return "#CE1126";
    if (py < 0.66) return "#FFFFFF";
    return "#000000";
  }
  return "#888";
}

// ─── Ambient Atmosphere Canvas (Landmarks Removed) ───────────────────────────

export function CountryAtmosphereCanvas() {
  const { currentCountry, isTransitioning } = usePortalWarp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transitionProgress, setTransitionProgress] = useState(0);

  useEffect(() => {
    if (isTransitioning) {
      queueMicrotask(() => setTransitionProgress(0));
      const start = Date.now();
      const id = setInterval(() => {
        const e = (Date.now() - start) / 1000;
        setTransitionProgress(Math.min(e, 1));
        if (e >= 1) clearInterval(id);
      }, 16);
      return () => clearInterval(id);
    }
  }, [isTransitioning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    interface Particle {
      x: number;
      y: number;
      s: number;
      v: number;
      o: number;
      phase: number;
    }

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      s: Math.random() * 2 + 0.5,
      v: Math.random() * 0.8 + 0.4,
      o: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf: number;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const prog = isTransitioning ? transitionProgress : 1;
      ctx.globalAlpha = prog;

      particles.forEach((p) => {
        p.phase += 0.015;

        if (currentCountry === "cairo") {
          p.x += p.v * 1.5;
          p.y += Math.sin(p.phase) * 0.3;
          ctx.fillStyle = `rgba(251, 191, 36, ${p.o * 0.8})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        } else if (currentCountry === "dubai") {
          p.y -= p.v * 2;
          p.x += Math.sin(p.phase) * 0.5;
          ctx.fillStyle = `rgba(255, 215, 0, ${p.o})`;
          ctx.beginPath(); ctx.rect(p.x, p.y, p.s, p.s); ctx.fill();
        } else {
          p.y += p.v * 5;
          p.x += p.v * 1;
          ctx.strokeStyle = `rgba(200, 220, 255, ${p.o * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y + 10); ctx.stroke();
        }

        if (p.x > w + 20)  p.x = -20;
        if (p.x < -20)     p.x = w + 20;
        if (p.y > h + 20)  p.y = -20;
        if (p.y < -20)     p.y = h + 20;
      });

      raf = requestAnimationFrame(render);
    };

    const onResize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
    };
    window.addEventListener("resize", onResize);
    render();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [currentCountry, isTransitioning, transitionProgress]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.8 }}
    />
  );
}
