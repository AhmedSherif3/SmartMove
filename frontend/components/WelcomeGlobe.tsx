"use client";

/**
 * WelcomeGlobe.tsx
 * PropSphere — Welcome / Overview Page Hero
 *
 * A rotating holographic wireframe globe with three glowing city nodes.
 * Hover London, Dubai, or Cairo to expand a live KPI card.
 * Designed to sit on top of the NeuralReactorBackground.
 * 
 * Includes advanced visual effects: starfield dust, data arcs, multiple orbital rings,
 * atmospheric glow, and premium glassmorphism UI.
 */

import { useEffect, useRef, useState } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const GLOBE_R = 175;    // sphere radius in px
const FOCAL = 800;      // perspective focal length
const ROT_SPEED = 0.15; // radians/sec for auto-rotation
const TILT_BASE = 0.28; // base X-axis tilt (radians)

// ─── Types ───────────────────────────────────────────────────────────────

interface KPI {
  label: string;
  value: string;
  delta: string;
}

interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  color: string;
  kpis: KPI[];
}

interface Stat {
  label: string;
  value: string;
}

// ─── Data ───────────────────────────────────────────────────────────────

const CITIES: City[] = [
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    lat: 51.5,
    lon: -0.1,
    color: '#3b82f6', // Brand Primary
    kpis: [
      { label: 'Avg Price', value: '£482K', delta: '+3.2%' },
      { label: 'Listings', value: '18.4K', delta: '+8.1%' },
      { label: 'ROI Index', value: '6.8%', delta: '+0.4%' },
      { label: 'Demand', value: 'High', delta: '↑' },
    ],
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    lat: 25.2,
    lon: 55.3,
    color: '#2dd4bf', // Brand Secondary
    kpis: [
      { label: 'Avg Price', value: 'AED 1.2M', delta: '+5.7%' },
      { label: 'Listings', value: '22.1K', delta: '+11.3%' },
      { label: 'ROI Index', value: '9.2%', delta: '+1.1%' },
      { label: 'Demand', value: 'V. High', delta: '↑↑' },
    ],
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    lat: 30.0,
    lon: 31.2,
    color: '#8b5cf6', // Brand Accent
    kpis: [
      { label: 'Avg Price', value: 'EGP 4.8M', delta: '+14.2%' },
      { label: 'Listings', value: '7.7K', delta: '+6.5%' },
      { label: 'ROI Index', value: '11.4%', delta: '+2.3%' },
      { label: 'Demand', value: 'Growing', delta: '↑' },
    ],
  },
];

const BACKGROUND_CITIES = [
  { lat: 40.7, lon: -74.0 },  // NY
  { lat: 35.6, lon: 139.6 },  // Tokyo
  { lat: -33.8, lon: 151.2 }, // Sydney
  { lat: 1.3, lon: 103.8 },   // Singapore
  { lat: 48.8, lon: 2.3 },    // Paris
  { lat: -23.5, lon: -46.6 }, // Sao Paulo
];

const DATA_ARCS = [
  { from: 'london', to: 'dubai', color: '#2dd4bf' },
  { from: 'dubai', to: 'cairo', color: '#8b5cf6' },
  { from: 'london', to: 'cairo', color: '#3b82f6' },
];

const STATS: Stat[] = [
  { label: 'Total Listings', value: '48.2K' },
  { label: 'Avg Yield', value: '9.1%' },
  { label: 'Active Markets', value: '3' },
  { label: 'Data Points', value: '1.2M' },
];

// ─── Math Helpers ─────────────────────────────────────────────────────────────

const toRad = (d: number) => d * Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const a2h = (a: number) => Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');

function ll3d(lat: number, lon: number): [number, number, number] {
  const φ = toRad(lat), λ = toRad(lon);
  return [Math.cos(φ) * Math.sin(λ), Math.sin(φ), Math.cos(φ) * Math.cos(λ)];
}

function ry([x, y, z]: [number, number, number], θ: number): [number, number, number] {
  return [x * Math.cos(θ) + z * Math.sin(θ), y, -x * Math.sin(θ) + z * Math.cos(θ)];
}

function rx([x, y, z]: [number, number, number], φ: number): [number, number, number] {
  return [x, y * Math.cos(φ) - z * Math.sin(φ), y * Math.sin(φ) + z * Math.cos(φ)];
}

function project([x, y, z]: [number, number, number], cx: number, cy: number, r = GLOBE_R) {
  const scale = FOCAL / (FOCAL + z * r * 0.28);
  return { sx: cx + x * r * scale, sy: cy - y * r * scale, z, scale };
}

function transform(lat: number, lon: number, rotAngle: number, tiltX: number): [number, number, number] {
  return rx(ry(ll3d(lat, lon), rotAngle), tiltX);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WelcomeGlobeProps {
  userName?: string;
  onCityClick?: (cityId: string) => void;
}

export default function WelcomeGlobe({ userName = 'George', onCityClick }: WelcomeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const mouseRef = useRef({ normX: 0, normY: 0, rawX: 0, rawY: 0 });
  const hoverRef = useRef<string | null>(null);
  const cityPosRef = useRef<Record<string, { sx: number; sy: number; z: number }>>({});

  const [hovered, setHovered] = useState<string | null>(null);
  const [cardVisible, setVisible] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Sync theme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    updateTheme();
    
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Generate particles once
  const [particles] = useState(() => Array.from({ length: 150 }, () => ({
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 2,
    speed: Math.random() * 0.002 + 0.001,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.6 + 0.1
  })));

  useEffect(() => { hoverRef.current = hovered; }, [hovered]);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Mouse & Hit Testing ────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      mouseRef.current = {
        rawX, rawY,
        normX: (rawX / rect.width - 0.5) * 2,
        normY: (rawY / rect.height - 0.5) * 2,
      };

      const positions = cityPosRef.current;
      let hit: string | null = null;
      for (const city of CITIES) {
        const pos = positions[city.id];
        if (!pos || pos.z < -0.2) continue;
        if (Math.hypot(rawX - pos.sx, rawY - pos.sy) < 30) { hit = city.id; break; }
      }
      if (hit !== hoverRef.current) {
        hoverRef.current = hit;
        setHovered(hit);
        setVisible(!!hit);
      }
    };

    const onLeave = () => {
      hoverRef.current = null;
      setHovered(null);
      setVisible(false);
      mouseRef.current.normX = 0;
      mouseRef.current.normY = 0;
    };

    const onClick = () => {
      const hit = hoverRef.current;
      if (hit && onCityClick) onCityClick(hit);
    };

    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('click', onClick);
    };
  }, [onCityClick]);

  // ── Canvas Animation Loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W: number, H: number, cx: number, cy: number;
    let rafId: number, running = true, t = 0, lastTime = 0;

    function resize() {
      if (!wrapRef.current || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapRef.current.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H / 2;
    }

    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    resize();

    function drawParticles(rotAngle: number, tiltX: number) {
      if (!ctx) return;
      ctx.save();
      particles.forEach(p => {
        p.x += p.speed * 0.5;
        if (p.x > 1) p.x = -1;
        
        // Apply globe rotation to particles to make them feel part of the space
        let [px, py, pz] = [p.x, p.y, p.z];
        [px, py, pz] = rx(ry([px, py, pz], rotAngle * 0.2), tiltX * 0.5);
        
        const proj = project([px, py, pz], cx, cy, GLOBE_R * 2);
        
        // Fade out at edges
        const dist = Math.hypot(proj.sx - cx, proj.sy - cy) / (GLOBE_R * 2);
        const alpha = p.opacity * (1 - Math.pow(dist, 2)) * clamp(proj.z + 0.5, 0, 1);
        
        if (alpha > 0.01) {
          ctx.fillStyle = isDark 
            ? `rgba(180, 210, 255, ${alpha})`
            : `rgba(59, 130, 246, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, p.size * proj.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    function drawSphere() {
      if (!ctx) return;
      
      // Outer Atmospheric Glow
      const atmos = ctx.createRadialGradient(cx, cy, GLOBE_R * 0.9, cx, cy, GLOBE_R * 1.3);
      atmos.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
      atmos.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
      atmos.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = atmos;
      ctx.beginPath(); ctx.arc(cx, cy, GLOBE_R * 1.3, 0, Math.PI * 2); ctx.fill();

      // Inner Core Glow
      const g = ctx.createRadialGradient(cx - GLOBE_R * 0.3, cy - GLOBE_R * 0.3, 0, cx, cy, GLOBE_R);
      g.addColorStop(0, isDark ? 'rgba(12, 22, 45, 0.9)' : 'rgba(235, 244, 255, 0.9)');
      g.addColorStop(1, isDark ? 'rgba(4, 10, 26, 0.85)' : 'rgba(248, 250, 252, 0.6)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, GLOBE_R, 0, Math.PI * 2); ctx.fill();

      // Sharp Inner Rim Highlight
      const rim = ctx.createRadialGradient(cx, cy, GLOBE_R * 0.85, cx, cy, GLOBE_R);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(0.95, 'rgba(59,130,246,0.2)');
      rim.addColorStop(1, 'rgba(59,130,246,0.6)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, GLOBE_R, 0, Math.PI * 2); ctx.fill();
    }

    function drawGrid(rotAngle: number, tiltX: number) {
      if (!ctx) return;
      
      const FRONT_A = isDark ? 0.35 : 0.25;
      const BACK_A = isDark ? 0.04 : 0.06;
      const primaryColor = '59,130,246'; // #3b82f6 RGB

      function segmentedLine(points: { sx: number; sy: number; z: number }[], glow = false) {
        if (!ctx) return;
        for (let i = 0; i < points.length - 1; i++) {
          const z_avg = (points[i].z + points[i + 1].z) * 0.5;
          const isFront = z_avg > 0;
          const alpha = isFront ? FRONT_A : BACK_A;
          
          ctx.beginPath();
          ctx.moveTo(points[i].sx, points[i].sy);
          ctx.lineTo(points[i + 1].sx, points[i + 1].sy);
          
          if (glow && isFront) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = `rgba(${primaryColor}, 0.5)`;
            ctx.strokeStyle = `rgba(147,197,253, ${alpha + 0.2})`; // lighter blue for glow
            ctx.lineWidth = 1.2;
          } else {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${primaryColor},${alpha})`;
            ctx.lineWidth = 0.6;
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // Latitudes
      [-60, -30, 0, 30, 60].forEach(lat => {
        const pts = [];
        for (let lon = -180; lon <= 182; lon += 6) {
          pts.push(project(transform(lat, lon, rotAngle, tiltX), cx, cy));
        }
        segmentedLine(pts, lat === 0); // glow equator
      });

      // Longitudes
      for (let lon = -180; lon < 180; lon += 30) {
        const pts = [];
        for (let lat = -88; lat <= 90; lat += 6) {
          pts.push(project(transform(lat, lon, rotAngle, tiltX), cx, cy));
        }
        segmentedLine(pts);
      }
    }

    function drawRings(angle: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(cx, cy);

      const drawRing = (rx: number, ry: number, tilt: number, speed: number, dash: number[], color: string, width: number) => {
        ctx.save();
        ctx.rotate(tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, angle * speed, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.restore();
      };

      // Ring 1: Wide, fast, dashed
      drawRing(GLOBE_R * 1.6, GLOBE_R * 0.4, -0.28, 0.4, [4, 18], 'rgba(59,130,246,0.3)', 1);
      // Ring 2: Tighter, slow, solid glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#8b5cf6';
      drawRing(GLOBE_R * 1.35, GLOBE_R * 0.35, 0.15, -0.2, [60, 20], 'rgba(139,92,246,0.4)', 1.5);
      ctx.shadowBlur = 0;
      // Ring 3: Small, subtle tech ring
      drawRing(GLOBE_R * 1.15, GLOBE_R * 0.28, -0.1, 0.8, [2, 6], 'rgba(45,212,191,0.2)', 0.8);

      ctx.restore();
    }

    function drawArcs() {
      if (!ctx) return;
      const positions = cityPosRef.current;
      
      DATA_ARCS.forEach(arc => {
        const from = positions[arc.from];
        const to = positions[arc.to];
        if (!from || !to) return;
        
        // Only draw if mostly front-facing
        if (from.z < -0.5 && to.z < -0.5) return;
        
        const zAvg = (from.z + to.z) / 2;
        const alpha = clamp((zAvg + 0.8) * 1.2, 0.05, 0.8);
        
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        
        // Quadratic curve arching outwards based on distance
        const mx = (from.sx + to.sx) / 2;
        const my = (from.sy + to.sy) / 2;
        const dist = Math.hypot(to.sx - from.sx, to.sy - from.sy);
        // Push control point outwards from center
        const dx = mx - cx;
        const dy = my - cy;
        const len = Math.hypot(dx, dy) || 1;
        const push = dist * 0.4;
        
        const cpx = mx + (dx / len) * push;
        const cpy = my + (dy / len) * push;
        
        ctx.quadraticCurveTo(cpx, cpy, to.sx, to.sy);
        
        // Gradient stroke
        const grad = ctx.createLinearGradient(from.sx, from.sy, to.sx, to.sy);
        grad.addColorStop(0, `${arc.color}${a2h(alpha * 0.8)}`);
        grad.addColorStop(0.5, isDark ? `#ffffff${a2h(alpha)}` : `${arc.color}${a2h(alpha)}`);
        grad.addColorStop(1, `${arc.color}${a2h(alpha * 0.8)}`);
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        
        // Add animated dash for "data flow"
        const dashOffset = -t * 40;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = dashOffset;
        ctx.stroke();
        
        // Draw trailing glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = arc.color;
        ctx.lineWidth = 3;
        ctx.strokeStyle = `${arc.color}${a2h(alpha * 0.3)}`;
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      });
    }

    function drawCityNodes(rotAngle: number, tiltX: number) {
      if (!ctx) return;
      const newPos: Record<string, { sx: number; sy: number; z: number }> = {};
      const activeId = hoverRef.current;

      // Draw background cities first (smaller, no interactivity)
      BACKGROUND_CITIES.forEach(city => {
        const p3d = transform(city.lat, city.lon, rotAngle, tiltX);
        const proj = project(p3d, cx, cy);
        if (p3d[2] < 0) return; // Only show front face
        
        ctx.fillStyle = isDark ? `rgba(147, 197, 253, ${p3d[2] * 0.4})` : `rgba(59, 130, 246, ${p3d[2] * 0.5})`;
        ctx.beginPath(); ctx.arc(proj.sx, proj.sy, 1.5, 0, Math.PI * 2); ctx.fill();
      });

      // Draw main interactive cities
      CITIES.forEach((city, idx) => {
        const p3d = transform(city.lat, city.lon, rotAngle, tiltX);
        const proj = project(p3d, cx, cy);

        const vis = clamp((p3d[2] + 0.25) / 1.25, 0, 1); // Fade earlier near horizon
        const alpha = vis;

        newPos[city.id] = { sx: proj.sx, sy: proj.sy, z: p3d[2] };

        if (alpha < 0.02) return;

        const isActive = city.id === activeId;
        const pulse = Math.sin(t * 2.5 + idx * 3) * 0.5 + 0.5;
        const coreR = isActive ? 8 : 5;

        // ── Outer ripple ──
        if (isActive || pulse > 0.8) {
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, coreR + 10 + pulse * 15, 0, Math.PI * 2);
          ctx.strokeStyle = city.color + a2h(alpha * (isActive ? 0.3 : 0.1));
          ctx.lineWidth = 1; ctx.stroke();
        }

        // ── Inner ring ──
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, coreR + (isActive ? 6 : 4), 0, Math.PI * 2);
        ctx.strokeStyle = city.color + a2h(alpha * 0.6);
        ctx.lineWidth = 1.5; ctx.stroke();

        // ── Core dot ──
        ctx.shadowBlur = isActive ? 25 : 15;
        ctx.shadowColor = city.color;
        const cg = ctx.createRadialGradient(proj.sx, proj.sy, 0, proj.sx, proj.sy, coreR);
        cg.addColorStop(0, '#ffffff' + a2h(alpha));
        cg.addColorStop(0.5, city.color + a2h(alpha * 0.9));
        cg.addColorStop(1, city.color + a2h(alpha * 0.2));
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(proj.sx, proj.sy, coreR, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // ── Label ──
        if (alpha > 0.4 || isActive) {
          const side = proj.sx > cx ? 1 : -1;
          const lineEndX = proj.sx + side * (isActive ? 45 : 35);
          const lineEndY = proj.sy - (isActive ? 18 : 12);

          ctx.beginPath();
          ctx.moveTo(proj.sx + side * (coreR + 3), proj.sy - 3);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.strokeStyle = city.color + a2h(alpha * (isActive ? 0.8 : 0.4));
          ctx.lineWidth = isActive ? 1.2 : 0.8;
          ctx.stroke();

          ctx.font = `${isActive ? 'bold 11px' : '600 9px'} "Inter", sans-serif`;
          ctx.textAlign = side > 0 ? 'left' : 'right';
          ctx.fillStyle = isActive ? (isDark ? '#ffffff' : '#0f172a') : city.color + a2h(alpha * 0.9);
          ctx.fillText(city.name.toUpperCase(), lineEndX + side * 5, lineEndY + 3);
          
          if (isActive) {
            ctx.font = `400 9px "Inter", sans-serif`;
            ctx.fillStyle = isDark ? `rgba(255,255,255,0.6)` : `rgba(15,23,42,0.6)`;
            ctx.fillText("LIVE SYNC", lineEndX + side * 5, lineEndY + 14);
          }
          
          ctx.textAlign = 'left';
        }
      });

      cityPosRef.current = newPos;
    }

    // ── Main RAF loop ─────────────────────────────────────────────────────────
    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      t += dt * 0.001;

      ctx.clearRect(0, 0, W, H);

      const rotAngle = t * ROT_SPEED;
      // Add subtle mouse parallax to rotation
      const targetTilt = TILT_BASE + mouseRef.current.normY * 0.15;
      const targetPan = mouseRef.current.normX * 0.1;
      
      drawParticles(rotAngle, targetTilt);
      drawSphere();
      drawGrid(rotAngle + targetPan, targetTilt);
      drawRings(t);
      drawCityNodes(rotAngle + targetPan, targetTilt);
      drawArcs();

      rafId = requestAnimationFrame(frame);
    }

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else {
        running = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };

    document.addEventListener('visibilitychange', onVis);
    rafId = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [particles, isDark]);

  const activeCity = CITIES.find(c => c.id === hovered);

  function getCardStyle(city: City): React.CSSProperties {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 30,
      minWidth: 240,
      background: isDark 
        ? 'linear-gradient(145deg, rgba(8, 16, 36, 0.85) 0%, rgba(4, 8, 20, 0.95) 100%)'
        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 245, 250, 0.95) 100%)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: isDark ? `1px solid rgba(255,255,255,0.08)` : `1px solid rgba(0,0,0,0.05)`,
      borderTop: `1px solid ${city.color}50`,
      borderRadius: 16,
      padding: '20px',
      boxShadow: isDark 
        ? `0 20px 40px rgba(0,0,0,0.5), 0 0 60px ${city.color}15 inset`
        : `0 20px 40px rgba(0,0,0,0.1), 0 0 60px ${city.color}15 inset`,
      animation: 'ps-card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      transformOrigin: 'center center',
      cursor: onCityClick ? 'pointer' : 'default',
    };

    // Position adjustments with dynamic margins
    if (city.id === 'london') return { ...base, top: '15%', right: '8%' };
    if (city.id === 'dubai') return { ...base, top: '45%', right: '8%', transform: 'translateY(-50%)' };
    if (city.id === 'cairo') return { ...base, bottom: '15%', left: '8%' };
    return base;
  }

  return (
    <section
      ref={wrapRef}
      className="relative w-full overflow-hidden select-none mb-8 rounded-3xl border border-black/5 dark:border-white/5 bg-linear-to-br from-surface-page to-surface-muted"
      style={{
        height: 620,
        fontFamily: 'var(--font-inter)',
        cursor: hovered ? 'pointer' : 'default',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Holographic scanning line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen rounded-3xl">
        <div className="w-full h-0.5 bg-brand-primary/50 blur-[1px] animate-[ps-scan_8s_linear_infinite]" />
      </div>

      <div className="absolute z-20 pointer-events-none" style={{ top: 40, left: 48 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4 backdrop-blur-md">
           <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
           <span className="text-[10px] tracking-[0.2em] text-brand-primary uppercase font-bold">
             Global Intel Network
           </span>
        </div>
        <h1 className="font-logo text-[36px] font-extrabold text-content-strong leading-[1.1] mb-2 drop-shadow-sm">
          Welcome back, {userName}
        </h1>
        <p className="text-[14px] text-content-secondary font-medium">
          {today}
        </p>
      </div>

      <div
        className="absolute z-20 pointer-events-none flex items-center gap-3 bg-surface-card/70 border border-border-subtle backdrop-blur-xl px-5 py-2.5 rounded-xl shadow-sm"
        style={{ top: 40, right: 48 }}
      >
        <span className="w-2 h-2 rounded-full bg-[#10d879] shadow-[0_0_12px_#10d879] animate-[ps-pulse_2s_infinite]" />
        <span className="text-[13px] text-content-strong font-semibold tracking-wide">
          Systems Nominal
        </span>
      </div>

      {activeCity && cardVisible && (
        <div
          key={activeCity.id}
          style={getCardStyle(activeCity)}
          onClick={() => onCityClick?.(activeCity.id)}
          className="group transition-transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-black/5 dark:border-white/10 pb-3">
            <div className="w-3 h-3 rounded-full" style={{ background: activeCity.color, boxShadow: `0 0 15px ${activeCity.color}` }} />
            <span className="font-logo text-lg font-bold text-slate-900 dark:text-white tracking-widest">
              {activeCity.name.toUpperCase()}
            </span>
            <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-md bg-black/5 dark:bg-white/5" style={{ color: activeCity.color }}>
              {activeCity.country}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activeCity.kpis.map(kpi => (
              <div
                key={kpi.label}
                className="bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-lg p-3 transition-colors group-hover:border-black/10 dark:group-hover:border-white/10"
              >
                <div className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1 font-semibold">
                  {kpi.label}
                </div>
                <div className="text-[17px] font-bold text-slate-900 dark:text-white mb-0.5">
                  {kpi.value}
                </div>
                <div className="text-[11px] font-medium flex items-center gap-1" style={{ color: activeCity.color }}>
                  {kpi.delta}
                </div>
              </div>
            ))}
          </div>

          {onCityClick && (
            <div className="mt-4 pt-3 text-[11px] font-bold opacity-80 text-center tracking-widest uppercase flex items-center justify-center gap-2 hover:opacity-100 transition-opacity" style={{ color: activeCity.color }}>
              Access Dashboard 
              <span className="text-sm">→</span>
            </div>
          )}
        </div>
      )}

      {!hovered && (
        <div className="absolute pointer-events-none bottom-27.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[ps-fade_1s_ease_1s_both]">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-[0.25em] uppercase drop-shadow-sm dark:drop-shadow-md">
            Select a market to analyze
          </div>
          <div className="w-px h-6 bg-linear-to-b from-brand-primary/50 to-transparent" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none flex justify-center gap-12 pb-6 pt-16 bg-linear-to-t from-surface-page via-surface-page/80 to-transparent">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <div className="font-logo text-[22px] font-extrabold text-content-strong leading-none drop-shadow-sm">
              {s.value}
            </div>
            <div className="text-[10px] text-brand-primary/80 font-bold tracking-[0.2em] uppercase mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ps-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.8); }
        }
        @keyframes ps-fade {
          from { opacity: 0; transform: translateY(10px) translateX(-50%); }
          to   { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        @keyframes ps-card-pop {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ps-scan {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(600px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
