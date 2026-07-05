"use client";

import { useCallback, useEffect, useRef } from "react";

export type NexusState =
  | "idle"
  | "hover"
  | "email"
  | "password"
  | "loading"
  | "spectra"
  | "success"
  | "error";

export interface NexusOrbProps {
  state?: NexusState;
  accentColor?: string;
  size?: number;
  nodeCount?: number;
  connectionDist?: number;
  onStatusChange?: (status: string) => void;
  onClick?: () => void;
  mouseTarget?: React.RefObject<HTMLElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

interface OrbNode {
  ox: number;
  oy: number;
  oz: number;
  px: number;
  py: number;
  pz: number;
  depth: number;
  phase: number;
  speed: number;
  size: number;
}

let parserCtx: CanvasRenderingContext2D | null = null;

function resolveCssColor(color: string): string {
  const raw = color.trim();

  if (raw.startsWith("var(")) {
    if (typeof window === "undefined") {
      return "#3b82f6";
    }

    const varName = raw.slice(4, -1).trim();
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return resolved || "#3b82f6";
  }

  return raw;
}

function toRgba(color: string): string {
  const resolved = resolveCssColor(color);

  if (resolved.startsWith("rgba(")) {
    const body = resolved.slice(5, -1);
    const values = body
      .split(",")
      .slice(0, 3)
      .map((part) => part.trim());
    return `rgba(${values[0]},${values[1]},${values[2]},`;
  }

  if (resolved.startsWith("rgb(")) {
    const body = resolved.slice(4, -1);
    const values = body
      .split(",")
      .slice(0, 3)
      .map((part) => part.trim());
    return `rgba(${values[0]},${values[1]},${values[2]},`;
  }

  if (resolved.startsWith("#")) {
    let hex = resolved.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},`;
  }

  if (typeof document !== "undefined") {
    parserCtx ??= document.createElement("canvas").getContext("2d");

    if (parserCtx) {
      parserCtx.fillStyle = "#3b82f6";
      parserCtx.fillStyle = resolved;

      const parsed = parserCtx.fillStyle;
      if (typeof parsed === "string" && parsed.startsWith("#")) {
        return toRgba(parsed);
      }

      if (typeof parsed === "string" && parsed.startsWith("rgb")) {
        return toRgba(parsed);
      }
    }
  }

  return "rgba(59,130,246,";
}

const STATUS_MESSAGES: Record<NexusState, string> = {
  idle: "AI engine active",
  hover: "Hello! I'm NEXUS",
  email: "Scanning identity...",
  password: "Privacy mode enabled",
  loading: "Processing...",
  spectra: "Spectral resonance active",
  success: "Welcome back!",
  error: "Authentication failed",
};

export default function NexusOrb({
  state = "idle",
  accentColor = "var(--ui-brand-primary)",
  size = 300,
  nodeCount = 28,
  connectionDist = 0.72,
  onStatusChange,
  onClick,
  mouseTarget,
  className,
  style,
}: NexusOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef(state);
  const accentRef = useRef(accentColor);
  const mouseRef = useRef({ x: size / 2, y: size / 2 });
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);
  const nodesRef = useRef<OrbNode[]>([]);
  const errorFlashRef = useRef(0);
  const successBurstRef = useRef(0);
  const hoverLeanRef = useRef({ x: 0, y: 0 });
  const privacyFadeRef = useRef(0);
  const rotRef = useRef({ y: 0, x: 0 });

  useEffect(() => {
    stateRef.current = state;
    onStatusChange?.(STATUS_MESSAGES[state]);
  }, [onStatusChange, state]);

  useEffect(() => {
    accentRef.current = accentColor;
  }, [accentColor]);

  useEffect(() => {
    if (state === "error") {
      errorFlashRef.current = 50;
    }

    if (state === "success") {
      successBurstRef.current = 60;
    }
  }, [state]);

  const buildNodes = useCallback(() => {
    const nodes: OrbNode[] = [];

    for (let index = 0; index < nodeCount; index += 1) {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;

      nodes.push({
        ox: Math.sin(phi) * Math.cos(theta),
        oy: Math.sin(phi) * Math.sin(theta),
        oz: Math.cos(phi),
        px: 0,
        py: 0,
        pz: 0,
        depth: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.006,
        size: 2 + Math.random() * 2,
      });
    }

    nodesRef.current = nodes;
  }, [nodeCount]);

  useEffect(() => {
    buildNodes();
  }, [buildNodes]);

  const project = useCallback(
    (
      nx: number,
      ny: number,
      nz: number,
      lean: { x: number; y: number },
      rotY: number,
      rotX: number,
      radius: number,
    ) => {
      const x = nx + lean.x * 0.12;
      const y = ny + lean.y * 0.12;
      const z = nz;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const rx = x * cosY - z * sinY;
      let rz = x * sinY + z * cosY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const ry = y * cosX - rz * sinX;
      rz = y * sinX + rz * cosX;

      return { x: rx * radius, y: ry * radius, z: rz, depth: (rz + 1) / 2 };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const width = size;
    const height = size;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size * 0.307;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      tickRef.current += 1;
      const tick = tickRef.current;
      const currentState = stateRef.current;
      const accentRgba = toRgba(accentRef.current);
      const errorRgba = toRgba("var(--ui-status-error)");
      const isDarkMode =
        typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      const lineVisibilityFactor = isDarkMode ? 1 : 1.28;
      const dotVisibilityFactor = isDarkMode ? 1 : 1.18;
      const glowVisibilityFactor = isDarkMode ? 1 : 0.92;

      let activeRgba = accentRgba;
      let spectraScale = 1;
      if (currentState === "spectra") {
        const palette = [
          toRgba("var(--ui-brand-primary)"),
          toRgba("var(--ui-brand-secondary)"),
          toRgba("var(--ui-brand-accent)"),
          toRgba("var(--ui-status-success)"),
          toRgba("var(--ui-status-warning)"),
        ];
        const paletteIndex = Math.floor(tick / 32) % palette.length;
        activeRgba = palette[paletteIndex] ?? accentRgba;
        spectraScale = 1 + Math.sin(tick * 0.11) * 0.12;
      }

      rotRef.current.y += 0.004;
      rotRef.current.x += 0.0015;

      const privacyAmount = privacyFadeRef.current;
      const errorFlash = errorFlashRef.current > 0 ? Math.sin(tick * 0.6) * 0.5 + 0.5 : 0;
      errorFlashRef.current = Math.max(0, errorFlashRef.current - 1);

      let burstScale = 1;
      if (successBurstRef.current > 0) {
        const progress = 1 - successBurstRef.current / 60;
        burstScale = 1 + Math.sin(progress * Math.PI) * 0.35;
        successBurstRef.current -= 1;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(burstScale * spectraScale, burstScale * spectraScale);

      const glowRadius = radius + 28 + Math.sin(tick * 0.02) * 8;
      const atmosphereAlpha = privacyAmount > 0 ? 0.06 + (1 - privacyAmount) * 0.14 : 0.2;
      const atmosphere = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, glowRadius);
      atmosphere.addColorStop(0, `${activeRgba}${atmosphereAlpha})`);
      atmosphere.addColorStop(0.6, `${activeRgba}0.04)`);
      atmosphere.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = atmosphere;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `${activeRgba}${0.15 - privacyAmount * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.rotate(tick * 0.008);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 14, 0, Math.PI * 2);
      ctx.setLineDash([4, 10]);
      ctx.strokeStyle = `${activeRgba}${0.12 - privacyAmount * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.rotate(-tick * 0.005);
      ctx.scale(1, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
      ctx.strokeStyle = `${activeRgba}${0.08 - privacyAmount * 0.07})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      const bodyGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
      const baseAlpha = privacyAmount > 0 ? 0.04 : 0.12;
      const rimAlpha = privacyAmount > 0 ? 0.02 : 0.06;

      if (errorFlash > 0) {
        bodyGradient.addColorStop(0, `${errorRgba}${0.18 * errorFlash})`);
        bodyGradient.addColorStop(1, `${errorRgba}${0.04 * errorFlash})`);
      } else {
        bodyGradient.addColorStop(0, `${activeRgba}${baseAlpha})`);
        bodyGradient.addColorStop(1, `${activeRgba}${rimAlpha})`);
      }

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGradient;
      ctx.fill();

      const specular = ctx.createRadialGradient(
        -radius * 0.38,
        -radius * 0.38,
        0,
        -radius * 0.2,
        -radius * 0.2,
        radius * 0.55,
      );
      specular.addColorStop(0, `rgba(255,255,255,${privacyAmount > 0 ? 0.02 : 0.07})`);
      specular.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = specular;
      ctx.fill();

      const nodes = nodesRef.current;
      nodes.forEach((node) => {
        let wave = 0;

        if (currentState === "email") {
          wave = Math.sin(tick * 0.07 + node.phase * 3) * 0.08;
        } else if (currentState === "loading") {
          wave = Math.sin(tick * 0.18 + node.phase * 5) * 0.12;
        } else if (currentState === "spectra") {
          wave = Math.sin(tick * 0.24 + node.phase * 6) * 0.16;
        } else {
          wave = Math.sin(tick * node.speed * 7 + node.phase) * 0.04;
        }

        const nx = node.ox + wave;
        const ny = node.oy + wave * 0.7;
        const nz = node.oz + wave * 0.5;
        const point = project(
          nx,
          ny,
          nz,
          hoverLeanRef.current,
          rotRef.current.y,
          rotRef.current.x,
          radius,
        );

        node.px = point.x;
        node.py = point.y;
        node.pz = point.z;
        node.depth = point.depth;
      });

      nodes.sort((left, right) => left.pz - right.pz);

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const first = nodes[i];
          const second = nodes[j];

          const dx = first.ox - second.ox;
          const dy = first.oy - second.oy;
          const dz = first.oz - second.oz;

          if (Math.sqrt(dx * dx + dy * dy + dz * dz) > connectionDist) {
            continue;
          }

          const averageDepth = (first.depth + second.depth) / 2;
          // Global connection shimmer: slow wave affecting all connections together
          const globalShimmer = (Math.sin(tick * 0.05) + 1) / 2;
          const lineAlpha =
            averageDepth *
            0.55 *
            (1 - privacyAmount * 0.7) *
            (0.6 + globalShimmer * 0.4) *
            lineVisibilityFactor;

          if (errorFlash > 0) {
            ctx.strokeStyle = `${errorRgba}${lineAlpha * errorFlash})`;
          } else if (currentState === "loading" || currentState === "spectra") {
            const pulse = (Math.sin(tick * 0.15 + i * 0.4) + 1) / 2;
            ctx.strokeStyle = `${activeRgba}${lineAlpha * (0.3 + pulse * 0.7)})`;
          } else {
            ctx.strokeStyle = `${activeRgba}${lineAlpha})`;
          }

          ctx.beginPath();
          ctx.moveTo(first.px, first.py);
          ctx.lineTo(second.px, second.py);
          ctx.lineWidth = averageDepth * 1.2;
          ctx.stroke();
        }
      }

      nodes.forEach((node, index) => {
        const alpha = node.depth * (privacyAmount > 0 ? 0.25 : 0.9);
        const nodeSize = node.size * (0.5 + node.depth * 0.7);
        // Faster, more intense pulse for the nodes
        const pulse = (Math.sin(tick * 0.08 + node.phase) + 1) / 2;
        // Secondary shimmer for extra "sparkle"
        const sparkle = (Math.sin(tick * 0.12 + node.phase * 2) + 1) / 2;
        const nodeGlowTransparent = isDarkMode
          ? "transparent"
          : `${errorFlash > 0 ? errorRgba : activeRgba}0)`;

        const glow = ctx.createRadialGradient(node.px, node.py, 0, node.px, node.py, nodeSize * 5);
        glow.addColorStop(
          0,
          errorFlash > 0
            ? `${errorRgba}${alpha * 0.5 * errorFlash})`
            : `${activeRgba}${alpha * 0.6 * (0.4 + pulse * 0.4 + sparkle * 0.2) * glowVisibilityFactor})`,
        );
        glow.addColorStop(1, nodeGlowTransparent);
        ctx.beginPath();
        ctx.arc(node.px, node.py, nodeSize * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.px, node.py, nodeSize * (0.7 + pulse * 0.5 + sparkle * 0.3), 0, Math.PI * 2);

        if (errorFlash > 0) {
          ctx.fillStyle = `${errorRgba}${alpha * errorFlash})`;
        } else if (currentState === "loading" || currentState === "spectra") {
          const loadingPulse = (Math.sin(tick * 0.2 + index * 0.5) + 1) / 2;
          ctx.fillStyle = `${activeRgba}${Math.min(1, alpha * (0.4 + loadingPulse * 0.6) * dotVisibilityFactor)})`;
        } else {
          // Increase base brightness for the "shining" effect
          ctx.fillStyle = `${activeRgba}${Math.min(1, alpha * (0.8 + sparkle * 0.25) * dotVisibilityFactor)})`;
        }

        ctx.fill();
      });

      const coreAlpha = privacyAmount > 0 ? 0.2 : 0.85;
      const coreRadius = (size / 300) * (8 + Math.sin(tick * 0.03) * 2);
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 2.5);
      coreGradient.addColorStop(0, `${activeRgba}${coreAlpha})`);
      coreGradient.addColorStop(0.5, `${activeRgba}${coreAlpha * 0.4})`);
      coreGradient.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle =
        errorFlash > 0 ? `${errorRgba}${0.9 * errorFlash})` : `${activeRgba}${coreAlpha})`;
      ctx.fill();

      if (currentState === "email") {
        const scanAngle = (tick * 0.05) % (Math.PI * 2);
        ctx.save();
        ctx.rotate(scanAngle);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 0.7);
        ctx.strokeStyle = `${activeRgba}0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      if (privacyAmount > 0.1) {
        ctx.save();
        ctx.globalAlpha = privacyAmount * 0.65;
        ctx.font = `${Math.round(20 * privacyAmount)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🔒", 0, 0);
        ctx.restore();
      }

      const relativeX = (mouseRef.current.x - centerX) / width;
      const relativeY = (mouseRef.current.y - centerY) / height;
      hoverLeanRef.current.x += (relativeX * 1.4 - hoverLeanRef.current.x) * 0.06;
      hoverLeanRef.current.y += (relativeY * 1.4 - hoverLeanRef.current.y) * 0.06;

      const targetPrivacy = currentState === "password" ? 1 : 0;
      privacyFadeRef.current += (targetPrivacy - privacyFadeRef.current) * 0.05;

      ctx.restore();
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [connectionDist, project, size]);

  useEffect(() => {
    const target = mouseTarget?.current ?? canvasRef.current;
    if (!target || !canvasRef.current) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handleLeave = () => {
      mouseRef.current = { x: size / 2, y: size / 2 };
    };

    target.addEventListener("mousemove", handleMove as EventListener);
    target.addEventListener("mouseleave", handleLeave);

    return () => {
      target.removeEventListener("mousemove", handleMove as EventListener);
      target.removeEventListener("mouseleave", handleLeave);
    };
  }, [mouseTarget, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onClick={onClick}
      className={className}
      style={{ cursor: "crosshair", display: "block", ...style }}
    />
  );
}
