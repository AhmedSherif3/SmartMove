"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useRegion } from "@/lib/context/RegionContext";
import { useCurrency } from "@/lib/currency-context";

type CurrencyOption = { code: string; label: string };

export default function UserSettingsPage() {
  const { region, setRegion } = useRegion();
  const { currency, setCurrency } = useCurrency();
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState("");
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCurrencies = async () => {
      try {
        const response = await fetch("/api/currency/rates/", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load currencies");
        }

        const data = await response.json();
        const rateKeys = data?.rates ? Object.keys(data.rates) : [];
        const sortedCodes = Array.from(new Set([...rateKeys, "USD"])).sort();
        const options = sortedCodes.map((code) => ({ code, label: code }));

        if (isMounted) {
          setCurrencyOptions(options);
        }
      } catch {
        if (isMounted) {
          setCurrencyOptions([{ code: "USD", label: "USD" }]);
        }
      } finally {
        if (isMounted) {
          setCurrencyLoading(false);
        }
      }
    };

    loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currencyOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      setCurrencyOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [currencyOpen]);

  const filteredOptions = useMemo(() => {
    const query = currencyQuery.trim().toLowerCase();
    if (!query) {
      return currencyOptions;
    }
    return currencyOptions.filter((option) => option.code.toLowerCase().includes(query));
  }, [currencyOptions, currencyQuery]);

  const handleCurrencySelect = (code: string) => {
    setCurrency(code);
    setCurrencyOpen(false);
    setCurrencyQuery("");
  };

  const [subEmail, setSubEmail] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("smartmove-reports-email") || "";
    setSubEmail(saved);
  }, []);

  const handleSaveSubEmail = () => {
    if (subEmail && !subEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!subEmail.trim()) {
      localStorage.removeItem("smartmove-reports-email");
      alert("Subscription email cleared.");
    } else {
      localStorage.setItem("smartmove-reports-email", subEmail.trim());
      alert("Subscription email updated successfully!");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-logo font-bold text-content-strong">My Account</h1>
        <p className="mt-1 text-content-muted">Manage your preferences and defaults.</p>
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-content-strong">Regional Preferences</h2>
          <p className="text-sm text-content-muted">Choose the region and currency used across dashboards.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-content-secondary">Region</label>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value as "Egypt" | "Dubai" | "England")}
              className="w-full rounded-lg border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Egypt">Egypt</option>
              <option value="Dubai">Dubai</option>
              <option value="England">England</option>
            </select>
          </div>

          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-sm font-semibold text-content-secondary">Currency</label>
            <button
              type="button"
              onClick={() => setCurrencyOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content-primary"
            >
              <span className="font-semibold text-content-primary">{currency}</span>
              <ChevronDown className="h-4 w-4 text-content-muted" />
            </button>

            {currencyOpen && (
              <div className="relative">
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-border-subtle bg-surface-card shadow-lg">
                  <div className="border-b border-border-subtle p-2">
                    <input
                      type="search"
                      placeholder="Search currency"
                      value={currencyQuery}
                      onChange={(event) => setCurrencyQuery(event.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1">
                    {currencyLoading && (
                      <div className="px-3 py-2 text-sm text-content-muted">Loading currencies...</div>
                    )}
                    {!currencyLoading && filteredOptions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-content-muted">No matches found.</div>
                    )}
                    {!currencyLoading &&
                      filteredOptions.map((option) => (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => handleCurrencySelect(option.code)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                            option.code === currency
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "text-content-primary hover:bg-surface-muted"
                          }`}
                        >
                          <span className="font-semibold">{option.label}</span>
                          {option.code === currency && (
                            <span className="text-xs font-semibold text-brand-primary">Selected</span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Subscription Email Panel */}
      <section className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-content-strong">Report Subscriptions</h2>
          <p className="text-sm text-content-muted">Manage the email address where your weekly/monthly PDF digests are sent.</p>
        </div>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-content-secondary">Subscription Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder="Enter email for automated reports"
                className="flex-1 rounded-lg border border-border-subtle bg-surface-muted px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <button
                type="button"
                onClick={handleSaveSubEmail}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-content-on-brand hover:brightness-110 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
