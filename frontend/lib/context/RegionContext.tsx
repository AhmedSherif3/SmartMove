"use client";
import React, { createContext, useContext, useState } from "react";

type Region = "Egypt" | "Dubai" | "England";

interface RegionContextType {
  region: Region;
  setRegion: (region: Region) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region>("England");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartmove-region") as Region | null;
      if (saved === "Egypt" || saved === "Dubai" || saved === "England") {
        setRegionState(saved);
      } else {
        const savedCountry = localStorage.getItem("smartmove-country");
        if (savedCountry === "london") setRegionState("England");
        else if (savedCountry === "dubai") setRegionState("Dubai");
        else if (savedCountry === "cairo") setRegionState("Egypt");
      }
    }
  }, []);

  // Listen to external region updates (e.g. from topbar CountryToggle)
  React.useEffect(() => {
    const handleRegionChanged = () => {
      const saved = localStorage.getItem("smartmove-region") as Region | null;
      if (saved === "Egypt" || saved === "Dubai" || saved === "England") {
        setRegionState(saved);
      }
    };

    window.addEventListener("smartmove-region-changed", handleRegionChanged);
    return () => {
      window.removeEventListener("smartmove-region-changed", handleRegionChanged);
    };
  }, []);

  const setRegion = (newRegion: Region) => {
    setRegionState(newRegion);

    if (typeof window !== "undefined") {
      localStorage.setItem("smartmove-region", newRegion);
      const nextCountry = newRegion === "England" ? "london" : newRegion === "Dubai" ? "dubai" : "cairo";
      localStorage.setItem("smartmove-country", nextCountry);
      document.documentElement.setAttribute(
        "data-country",
        nextCountry === "london" ? "uk" : nextCountry === "dubai" ? "uae" : "egypt"
      );
      window.dispatchEvent(new Event("smartmove-country-changed"));
    }
  };

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error("useRegion must be used within RegionProvider");
  return context;
}
