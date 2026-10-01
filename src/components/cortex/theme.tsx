"use client";

// Dark / light theme for the Option B pages. The palette class (.cx-b in
// globals.css) holds the DESIGN.md tokens; data-theme switches it. Remembered
// per browser in localStorage (falls back to dark if storage is unavailable).

import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeRoot({ scope, storageKey, children }: { scope: "cx-b"; storageKey: string; children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* storage unavailable: stay on dark */
    }
  }, [storageKey]);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {/* everything inside (dialogs, toasts, drawer) follows the theme */}
      <div className={`${scope} min-h-screen bg-cx-bg text-cx-text`} data-theme={theme}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeToggle({ className = "flex h-9 w-9 items-center justify-center rounded-lg border border-cx-line text-cx-muted hover:text-cx-text" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Light theme" : "Dark theme"} className={className}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
