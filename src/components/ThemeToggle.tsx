"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "~/contexts/ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1 shadow ring-1 ring-black/5 dark:ring-white/10">
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700 transition-colors"
        aria-label="Toggle dark mode"
        title={`Toggle theme (current: ${resolvedTheme})`}
      >
        {resolvedTheme === "dark" ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M21.64 13.65A9 9 0 1 1 10.35 2.36a7 7 0 1 0 11.29 11.29z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 4a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1zm0-20a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm10 11a1 1 0 0 1-1-1h-1a1 1 0 1 1 0-2h1a1 1 0 1 1 2 0 1 1 0 0 1-1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 6.36a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 1 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41zM6.17 6.17a1 1 0 0 1 0-1.41l.71-.71A1 1 0 1 1 8.29 5.46l-.71.71a1 1 0 0 1-1.41 0zm0 11.66a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0  0 1 0-1.41zM17.66 6.17a1 1 0 0 1 1.41 0l.71.71A1 1 0 1 1 18.37 8.29l-.71-.71a1 1 0 0 1 0-1.41z"/></svg>
        )}
        <span className="hidden sm:inline">{resolvedTheme === "dark" ? "Dark" : "Light"}</span>
      </button>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="rounded-full bg-transparent px-2 py-1 text-sm text-zinc-700 dark:text-zinc-200 focus:outline-none"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
