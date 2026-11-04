"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const COOKIE_KEY = "snipe-theme";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

/**
 * `initialTheme` comes from the server (src/app/layout.tsx reads it from a
 * cookie and bakes it straight into the initial HTML's data-theme attribute)
 * — so this never needs to guess or re-derive anything client-side, and
 * there's nothing that can disagree with what was actually rendered.
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
