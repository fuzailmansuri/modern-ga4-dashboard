"use client";

import React, { createContext, useContext } from "react";

// NOTE: Dark mode causes Tailwind build issues in this workspace for some setups.
// To remove risk and keep behavior deterministic, this simplified ThemeProvider
// forces the app into light mode. This preserves the `useTheme` API so components
// that call it continue to work. Reverting is straightforward: restore the
// previous implementation which handled system/dark modes.

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const DEFAULT: ThemeContextValue = {
  theme: "light",
  resolvedTheme: "light",
  // no-op setters to keep API stable
  setTheme: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Ensure the document root has light class applied (client-only)
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }

  return <ThemeContext.Provider value={DEFAULT}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
