"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-xl border border-border/40 bg-secondary/30 ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-secondary/70 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <div className="relative h-4 w-4">
        {/* Sun Icon for Light Mode */}
        <Sun
          className={`absolute inset-0 h-4 w-4 text-amber-500 transition-all duration-300 transform-gpu ${
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
        />
        {/* Moon Icon for Dark Mode */}
        <Moon
          className={`absolute inset-0 h-4 w-4 text-cyan-400 transition-all duration-300 transform-gpu ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
