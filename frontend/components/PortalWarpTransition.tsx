"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

export type PortalType = "admin" | "analyst" | "user";
type CountryType = "london" | "dubai" | "cairo";

interface WarpContextType {
  currentPortal: PortalType;
  currentCountry: CountryType;
  switchPortal: (portal: PortalType, event: React.MouseEvent) => void;
  switchCountry: (country: CountryType, event: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>) => void;
  isWarping: boolean;
  isTransitioning: boolean;
}

const WarpContext = createContext<WarpContextType | undefined>(undefined);

export function usePortalWarp() {
  const context = useContext(WarpContext);
  if (!context) throw new Error("usePortalWarp must be used within PortalWarpProvider");
  return context;
}

interface PortalWarpProviderProps {
  children: ReactNode;
  initialPortal?: PortalType;
  initialCountry?: CountryType;
}

export function PortalWarpProvider({
  children,
  initialPortal = "user",
  initialCountry = "london",
}: PortalWarpProviderProps) {
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [country, setCountry] = useState<CountryType>(initialCountry);
  const [isWarping, setIsWarping] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [warpPos, setWarpPos] = useState({ x: 0, y: 0 });
  const [warpColor, setWarpColor] = useState("var(--ui-brand-primary)");

  const router = useRouter();
  const pathname = usePathname();

  // Load saved country from localStorage on mount to avoid hydration mismatch
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartmove-country") as CountryType | null;
      if (saved === "london" || saved === "dubai" || saved === "cairo") {
        setCountry(saved);
        document.documentElement.setAttribute(
          "data-country",
          saved === "london" ? "uk" : saved === "dubai" ? "uae" : "egypt"
        );
      } else {
        document.documentElement.setAttribute(
          "data-country",
          initialCountry === "london" ? "uk" : initialCountry === "dubai" ? "uae" : "egypt"
        );
      }
    }
  }, [initialCountry]);

  // Listen to external country updates (e.g. from settings page changing Region)
  React.useEffect(() => {
    const handleCountryChanged = () => {
      const saved = localStorage.getItem("smartmove-country") as CountryType | null;
      if (saved === "london" || saved === "dubai" || saved === "cairo") {
        setCountry(saved);
      }
    };

    window.addEventListener("smartmove-country-changed", handleCountryChanged);
    return () => {
      window.removeEventListener("smartmove-country-changed", handleCountryChanged);
    };
  }, []);

  const triggerWarp = (x: number, y: number, nextColor: string, callback: () => void) => {
    setWarpPos({ x, y });
    setWarpColor(nextColor);
    setIsWarping(true);
    setIsTransitioning(true);

    // Mid-animation switch (400ms)
    setTimeout(() => {
      callback();
    }, 400);

    // End animation (1000ms)
    setTimeout(() => {
      setIsWarping(false);
      setIsTransitioning(false);
    }, 1000);
  };

  const switchPortal = (nextPortal: PortalType, e: React.MouseEvent) => {
    if (nextPortal === portal) return;

    const portalColors: Record<PortalType, string> = {
      user: "#10d879",
      analyst: "#3b82f6",
      admin: "#f5a623",
    };

    triggerWarp(e.clientX, e.clientY, portalColors[nextPortal], () => {
      setPortal(nextPortal);
      document.documentElement.setAttribute("data-portal", nextPortal);

      const parts = pathname.split("/");
      if (parts.length > 1) {
        parts[1] = nextPortal;
        router.push(parts.join("/"));
      }
    });
  };

  const switchCountry = (nextCountry: CountryType, e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>) => {
    if (nextCountry === country) return;

    const countryColors: Record<CountryType, string> = {
      london: "#3b82f6",
      dubai: "#2dd4bf",
      cairo: "#8b5cf6",
    };

    const x = "clientX" in e ? e.clientX : typeof window !== "undefined" ? window.innerWidth / 2 : 0;
    const y = "clientY" in e ? e.clientY : typeof window !== "undefined" ? window.innerHeight / 2 : 0;

    triggerWarp(x, y, countryColors[nextCountry], () => {
      setCountry(nextCountry);
      if (typeof window !== "undefined") {
        localStorage.setItem("smartmove-country", nextCountry);
        // Also keep the region context in sync
        const nextRegion = nextCountry === "london" ? "England" : nextCountry === "dubai" ? "Dubai" : "Egypt";
        localStorage.setItem("smartmove-region", nextRegion);
        // Dispatch custom event to notify RegionContext in case it's already mounted
        window.dispatchEvent(new Event("smartmove-region-changed"));
      }
      document.documentElement.setAttribute("data-country", nextCountry === "london" ? "uk" : nextCountry === "dubai" ? "uae" : "egypt");
    });
  };

  return (
    <WarpContext.Provider value={{
      currentPortal: portal,
      currentCountry: country,
      switchPortal,
      switchCountry,
      isWarping,
      isTransitioning
    }}>
      <div style={{ position: "relative" }}>
        {children}

        <AnimatePresence>
          {isWarping && (
            <motion.div
              initial={{ clipPath: `circle(0% at ${warpPos.x}px ${warpPos.y}px)` }}
              animate={{ clipPath: `circle(150% at ${warpPos.x}px ${warpPos.y}px)` }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: warpColor,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </WarpContext.Provider>
  );
}

export function PortalToggle() {
  const { currentPortal, switchPortal } = usePortalWarp();
  const portals: PortalType[] = ["user", "analyst", "admin"];

  return (
    <div className="flex gap-1 rounded-lg bg-surface-muted p-1 border border-border-subtle relative">
      {portals.map((p) => (
        <button
          key={p}
          onClick={(e) => switchPortal(p, e)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all z-10 ${currentPortal === p
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-700"
            }`}
        >
          {p}
        </button>
      ))}
      <motion.div
        layoutId="portal-pill"
        className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm pointer-events-none"
        initial={false}
        animate={{
          left: portals.indexOf(currentPortal) * (100 / portals.length) + "%",
          width: (100 / portals.length) + "%",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

export function CountryToggle() {
  const { currentCountry, switchCountry } = usePortalWarp();
  const countries: CountryType[] = ["london", "dubai", "cairo"];

  const labels: Record<CountryType, string> = {
    london: "UK",
    dubai: "UAE",
    cairo: "EG",
  };

  return (
    <>
      {/* Mobile view dropdown select */}
      <div className="flex md:hidden relative items-center">
        <select
          value={currentCountry}
          onChange={(e) => switchCountry(e.target.value as CountryType, e)}
          className="appearance-none pl-3 pr-7 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-border-subtle bg-surface-muted text-content-primary focus:outline-none cursor-pointer"
        >
          {countries.map((c) => (
            <option key={c} value={c} className="bg-surface-card text-content-primary">
              {labels[c]}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-content-muted">
          ▼
        </span>
      </div>

      {/* Desktop view pill buttons */}
      <div className="hidden md:flex gap-1 rounded-lg bg-surface-muted p-1 border border-border-subtle relative h-8 items-center min-w-[140px]">
        {countries.map((c) => (
          <button
            key={c}
            onClick={(e) => switchCountry(c, e)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-widest transition-all z-10 relative ${currentCountry === c
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {labels[c]}
          </button>
        ))}

        <motion.div
          className="absolute bg-white rounded-md shadow-sm h-6"
          initial={false}
          animate={{
            left: countries.indexOf(currentCountry) * (100 / countries.length) + "%",
            width: (100 / countries.length) + "%",
          }}
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
          style={{
            margin: "0 4px",
            width: "calc(33.33% - 8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.04)"
          }}
        />
      </div>
    </>
  );
}

