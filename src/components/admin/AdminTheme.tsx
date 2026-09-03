"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "gamefy_admin_theme";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(ThemeCtx);
}

/// Applies the admin colour scheme via `data-admin-theme` on <html> and
/// persists the choice per browser. A tiny inline script in the admin
/// layout sets the attribute before first paint (no flash on hard loads);
/// this keeps it in sync across client-side navigation and on toggle, and
/// clears it when the admin unmounts so the storefront is never touched.
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let initial: Theme = "light";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") initial = stored;
    } catch {
      /* private mode / storage disabled — fall back to light */
    }
    setTheme(initial);
    document.documentElement.setAttribute("data-admin-theme", initial);

    return () => document.documentElement.removeAttribute("data-admin-theme");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-admin-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useAdminTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`a-theme-toggle ${className}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
      <span>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
