"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeToggleVariant = "floating" | "topbar";

type ThemeToggleProps = {
  variant?: ThemeToggleVariant;
};

const STORAGE_KEY = "smartmove-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle({ variant = "floating" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored ?? (prefersDark ? "dark" : "light");
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const variantClassName =
    variant === "topbar"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-muted text-content-primary transition-colors duration-200 hover:bg-surface-page hover:text-content-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      : "fixed right-16 top-3 md:right-4 md:top-3 z-[200] inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-brand-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-muted hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={variantClassName}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}

      <span className="sr-only">
        {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </button>
  );
}