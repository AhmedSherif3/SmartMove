
"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginNexusPanel from "@/components/orb/LoginNexusPanel";
import NexusOrb from "@/components/orb/NexusOrb";
import { useOrbLogin } from "@/components/orb/OrbLoginContext";

export default function HeroSection() {
  const pathname = usePathname();
  const orbPanelRef = useRef<HTMLDivElement>(null);
  const { orbState, setOrbState, orbColor, setOrbColor } = useOrbLogin();

  if (pathname === "/authentication/login") {
    return <LoginNexusPanel />;
  }

  const handleOrbClick = () => {
    if (orbState === "loading") {
      return;
    }

    setOrbColor("var(--ui-status-success)");
    setOrbState("success");

    window.setTimeout(() => {
      setOrbColor("var(--ui-brand-primary)");
      setOrbState("idle");
    }, 900);
  };

  const handleMouseEnter = () => {
    if (orbState === "idle") {
      setOrbState("hover");
    }
  };

  const handleMouseLeave = () => {
    if (orbState === "hover") {
      setOrbState("idle");
    }
  };

  return (
    <section className="relative isolate flex  flex-col items-center justify-center gap-6 overflow-hidden border-b border-border-subtle bg-linear-to-br from-surface-card via-surface-muted/70 to-surface-page px-8 py-12 md:border-b-0 md:border-r md:px-12">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-primary/25 blur-3xl dark:bg-brand-primary/20" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-brand-accent/30 blur-3xl dark:bg-brand-accent/20" />
      <div
        ref={orbPanelRef}
        className="relative z-10 -mb-2 flex w-full items-center justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <NexusOrb
          state={orbState}
          accentColor={orbColor}
          size={280}
          nodeCount={28}
          connectionDist={0.72}
          mouseTarget={orbPanelRef}
          onClick={handleOrbClick}
        />
      </div>
      <div className="relative z-10 h-40 w-40 overflow-hidden md:h-44 md:w-44">
        <Image
          className="h-full w-full"
          src="/SmartMove2.png"
          alt="SmartMove logo"
          width={540}
          height={540}
          priority
        />
      </div>
      <div className="relative z-10 max-w-md text-center">
        <h1 className="font-logo text-4xl font-bold text-content-strong">Smart Move</h1>

        <p className="mt-3 text-sm text-content-secondary md:text-base">
          Data-driven insights for smarter property investments
        </p>
      </div>
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex items-center rounded-2xl border border-border-subtle bg-surface-muted/90 px-3 py-2 text-xs font-medium text-content-secondary backdrop-blur-sm md:text-sm dark:bg-slate-800/70 dark:text-slate-200">
          <span className="relative me-2 inline-flex h-2.5 w-2.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-brand-primary"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            ></motion.span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary"></span>
          </span>
          Real-time analytics
        </span>
        <span className="inline-flex items-center rounded-2xl border border-border-subtle bg-surface-muted/90 px-3 py-2 text-xs font-medium text-content-secondary backdrop-blur-sm md:text-sm dark:bg-slate-800/70 dark:text-slate-200">
          <span className="relative me-2 inline-flex h-2.5 w-2.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-brand-secondary"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
            ></motion.span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-secondary"></span>
          </span>
          Market insights
        </span>
      </div>

      <div className="mt-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-muted/60 px-4 py-2 text-xs font-semibold text-content-secondary transition-all duration-300 hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:text-brand-primary"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
    </section>
  );
}
