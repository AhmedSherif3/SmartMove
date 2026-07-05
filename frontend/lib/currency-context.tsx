"use client";

import React, { createContext, useContext, useState } from "react";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = "preferred_currency";
const DEFAULT_CURRENCY = "USD";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CURRENCY;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_CURRENCY;
  });

  const setCurrency = (nextCurrency: string) => {
    setCurrencyState(nextCurrency);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, nextCurrency);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
