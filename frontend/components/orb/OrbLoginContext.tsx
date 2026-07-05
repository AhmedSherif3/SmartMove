"use client";

import { createContext, useContext, useState } from "react";
import type { NexusState } from "@/components/orb/NexusOrb";

type OrbLoginContextValue = {
  orbState: NexusState;
  setOrbState: React.Dispatch<React.SetStateAction<NexusState>>;
  orbColor: string;
  setOrbColor: React.Dispatch<React.SetStateAction<string>>;
};

const OrbLoginContext = createContext<OrbLoginContextValue | undefined>(undefined);

export function OrbLoginProvider({ children }: { children: React.ReactNode }) {
  const [orbState, setOrbState] = useState<NexusState>("idle");
  const [orbColor, setOrbColor] = useState("var(--ui-brand-primary)");

  return (
    <OrbLoginContext.Provider value={{ orbState, setOrbState, orbColor, setOrbColor }}>
      {children}
    </OrbLoginContext.Provider>
  );
}

export function useOrbLogin() {
  const context = useContext(OrbLoginContext);

  if (!context) {
    throw new Error("useOrbLogin must be used inside OrbLoginProvider");
  }

  return context;
}
