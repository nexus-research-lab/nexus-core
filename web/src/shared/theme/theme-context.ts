/**
 * =====================================================
 * @File   : theme-context.ts
 * @Date   : 2026-04-04 18:06
 * @Author : leemysw
 * 2026-04-04 18:06   Create
 * =====================================================
 */

"use client";

import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "sunny";

export const THEME_STORAGE_KEY = "nexus-theme";

export interface ThemeContextValue {
  theme: Theme;
  set_theme: (theme: Theme) => void;
}

export function detect_initial_theme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved_theme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved_theme === "light" || saved_theme === "dark" || saved_theme === "sunny") {
    return saved_theme;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function apply_theme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("sunny", theme === "sunny");
}

export const THEME_CONTEXT = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(THEME_CONTEXT);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
