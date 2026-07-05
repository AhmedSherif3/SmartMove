"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
  metrics: { label: string; value: string }[];
}

const NODES: Node[] = [
  { 
    id: "raw", label: "Raw CSV", x: 100, y: 150, 
    description: "Ingested source files from regional property portals and government land registries.",
    metrics: [{ label: "Data Vol", value: "4.2 GB" }, { label: "Files/Day", value: "142" }, { label: "Integrity", value: "99.8%" }, { label: "Latency", value: "Realtime" }]
  },
  { 
    id: "dw", label: "Azure DW", x: 280, y: 150, 
    description: "Centralized cloud data warehouse housing the unified SmartMove schema.",
    metrics: [{ label: "Storage", value: "2.8 TB" }, { label: "Queries", value: "18.5K" }, { label: "Uptime", value: "99.9%" }, { label: "Security", value: "AES-256" }]
  },
  { 
    id: "dbt", label: "dbt", x: 460, y: 150, 
    description: "Transformation layer where raw data is cleaned, validated, and normalized.",
    metrics: [{ label: "Models", value: "342" }, { label: "Tests", value: "1.2K" }, { label: "Run Time", value: "4m 20s" }, { label: "Freshness", value: "Active" }]
  },
  { 
    id: "ssas", label: "SSAS/DAX", x: 640, y: 150, 
    description: "Semantic layer for high-performance analytical modeling and business logic.",
    metrics: [{ label: "Measures", value: "156" }, { label: "Cache Hit", value: "92%" }, { label: "Aggs", value: "Active" }, { label: "Memory", value: "64 GB" }]
  },
  { 
    id: "pbi", label: "Power BI", x: 820, y: 150, 
    description: "Visualization engine providing interactive drill-downs and heatmaps.",
    metrics: [{ label: "Reports", value: "28" }, { label: "Views", value: "850/hr" }, { label: "Mobile", value: "Optimized" }, { label: "Alerts", value: "Active" }]
  },
  { 
    id: "ps", label: "SmartMove", x: 1000, y: 150, 
    description: "The final AI-powered dashboard portal for predictive real-estate insights.",
    metrics: [{ label: "Predictions", value: "Active" }, { label: "Confidence", value: "94%" }, { label: "Agents", value: "8" }, { label: "Status", value: "Systems Nominal" }]
  },
];

export default function PipelineVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  interface VisualizerParticle {
    nodeIdx: number;
    progress: number;
    speed: number;
  }
  const particlesRef = useRef<VisualizerParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1100 * 2;
    canvas.height = 300 * 2;
    ctx.scale(2, 2);

    let raf: number;
    const render = () => {
      ctx.clearRect(0, 0, 1100, 300);

      // Draw Connections (Bezier)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
      ctx.lineWidth = 2;
      for (let i = 0; i < NODES.length - 1; i++) {
        const start = NODES[i];
        const end = NODES[i + 1];
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(start.x + 90, start.y, end.x - 90, end.y, end.x, end.y);
      }
      ctx.stroke();

      // Emit particles
      if (Math.random() > 0.95) {
        particlesRef.current.push({
          nodeIdx: 0,
          progress: 0,
          speed: Math.random() * 0.005 + 0.005,
        });
      }

      // Draw Particles
      particlesRef.current.forEach((p, idx) => {
        const start = NODES[p.nodeIdx];
        const end = NODES[p.nodeIdx + 1];
        if (!end) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.nodeIdx++;
          return;
        }

        const x = cubicBezier(start.x, start.x + 90, end.x - 90, end.x, p.progress);
        const y = cubicBezier(start.y, start.y, end.y, end.y, p.progress);

        ctx.fillStyle = "#3b82f6";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#3b82f6";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Nodes
      NODES.forEach((n) => {
        const isActive = activeNode?.id === n.id;
        
        ctx.fillStyle = isActive ? "#3b82f6" : "#1e293b";
        ctx.shadowBlur = isActive ? 20 : 0;
        ctx.shadowColor = "#3b82f6";
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = isActive ? "#ffffff" : "rgba(255,255,255,0.7)";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + 35);
        ctx.shadowBlur = 0;
      });

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [activeNode]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (1100 / rect.width);
    const y = (e.clientY - rect.top) * (300 / rect.height);

    const hit = NODES.find(n => Math.hypot(n.x - x, n.y - y) < 30);
    setActiveNode(hit || null);
  };

  return (
    <div className="card-shell bg-surface-card p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-content-strong">Pipeline Visualizer</h3>
        <p className="text-sm text-content-secondary">Real-time data flow architecture and telemetry</p>
      </div>

      <div className="relative overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          className="cursor-pointer"
          style={{ width: 1100, height: 300 }} 
        />
      </div>

      <AnimatePresence mode="wait">
        {activeNode && (
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 rounded-2xl bg-surface-muted p-8 border border-border-subtle"
          >
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full bg-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                <h4 className="text-2xl font-bold text-content-strong tracking-tight">{activeNode.label}</h4>
              </div>
              <p className="text-sm text-content-secondary leading-relaxed">
                {activeNode.description}
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {activeNode.metrics.map(m => (
                <div key={m.label} className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">{m.label}</div>
                  <div className="text-lg font-bold text-brand-primary">{m.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const cX = 3 * (p1 - p0),
    bX = 3 * (p2 - p1) - cX,
    aX = p3 - p0 - cX - bX;
  return aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0;
}
