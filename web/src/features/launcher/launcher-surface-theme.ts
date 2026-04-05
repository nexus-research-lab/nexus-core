/**
# !/usr/bin/env xx
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：launcher-surface-theme.ts
# @Date   ：2026-04-05 17:09
# @Author ：leemysw
# 2026-04-05 17:09   Create
# =====================================================
*/

import { CSSProperties } from "react";

import { Theme } from "@/shared/theme/theme-context";

type LauncherSurfaceThemeStyle = CSSProperties & Record<`--launcher-${string}`, string>;

const LAUNCHER_SURFACE_THEME_STYLE_MAP: Record<Theme, LauncherSurfaceThemeStyle> = {
  light: {
    "--launcher-bridge-background":
      "radial-gradient(circle at 18% 50%, rgba(255, 255, 255, 0.28), transparent 34%), linear-gradient(90deg, rgba(181, 214, 255, 0.02), rgba(181, 214, 255, 0.22) 28%, rgba(181, 214, 255, 0.12) 62%, rgba(255, 255, 255, 0.03))",
    "--launcher-hero-aura":
      "radial-gradient(30% 16% at 50% 82%, rgba(133, 119, 255, 0.30), rgba(133, 119, 255, 0) 74%), radial-gradient(12% 20% at 86% 22%, rgba(118, 231, 206, 0.18), rgba(118, 231, 206, 0) 76%), radial-gradient(12% 18% at 14% 38%, rgba(255, 190, 122, 0.14), rgba(255, 190, 122, 0) 76%), radial-gradient(40% 12% at 50% 12%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 74%)",
    "--launcher-hero-stop-1": "rgba(229, 237, 255, 0.12)",
    "--launcher-hero-stop-2": "rgba(214, 225, 248, 0.11)",
    "--launcher-hero-stop-3": "rgba(203, 216, 241, 0.12)",
    "--launcher-hero-stroke": "rgba(255, 255, 255, 0.32)",
    "--launcher-hero-inner-fill": "rgba(216, 226, 247, 0.06)",
    "--launcher-hero-inner-stroke": "rgba(255, 255, 255, 0.08)",
    "--launcher-hero-tint-1": "transparent",
    "--launcher-hero-tint-2": "transparent",
    "--launcher-hero-tint-3": "transparent",
    "--launcher-hero-tint-4": "transparent",
    "--launcher-input-fill": "rgba(255, 255, 255, 0.08)",
    "--launcher-input-stroke": "rgba(255, 255, 255, 0.32)",
    "--launcher-input-inner-fill": "rgba(255, 255, 255, 0.04)",
    "--launcher-input-inner-stroke": "rgba(255, 255, 255, 0.08)",
    "--launcher-input-icon": "rgba(57, 70, 95, 0.66)",
    "--launcher-input-text": "rgba(24, 33, 49, 0.88)",
    "--launcher-input-placeholder": "rgba(76, 87, 109, 0.44)",
    "--launcher-submit-background": "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(240, 237, 232, 0.92))",
    "--launcher-submit-color": "#182131",
    "--launcher-submit-shadow": "0 10px 20px rgba(110, 117, 142, 0.14)",
    "--launcher-agent-chip-background": "rgba(255, 255, 255, 0.10)",
    "--launcher-agent-chip-border": "rgba(255, 255, 255, 0.12)",
    "--launcher-agent-chip-text": "rgba(255, 255, 255, 0.84)",
    "--launcher-room-chip-background": "rgba(255, 255, 255, 0.08)",
    "--launcher-room-chip-border": "rgba(255, 255, 255, 0.10)",
    "--launcher-room-chip-text": "rgba(255, 255, 255, 0.76)",
    "--launcher-handoff-color": "rgba(126, 34, 206, 0.52)",
    "--launcher-handoff-hover-color": "rgba(126, 34, 206, 0.82)",
  },
  dark: {
    "--launcher-bridge-background":
      "radial-gradient(circle at 18% 50%, rgba(255, 255, 255, 0.14), transparent 34%), linear-gradient(90deg, rgba(118, 169, 255, 0.02), rgba(118, 169, 255, 0.20) 28%, rgba(243, 184, 109, 0.12) 62%, rgba(255, 255, 255, 0.02))",
    "--launcher-hero-aura":
      "radial-gradient(30% 16% at 50% 82%, rgba(118, 169, 255, 0.28), rgba(118, 169, 255, 0) 74%), radial-gradient(12% 20% at 86% 22%, rgba(117, 218, 195, 0.16), rgba(117, 218, 195, 0) 76%), radial-gradient(12% 18% at 14% 38%, rgba(243, 184, 109, 0.18), rgba(243, 184, 109, 0) 76%), radial-gradient(40% 12% at 50% 12%, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 74%)",
    "--launcher-hero-stop-1": "rgba(255, 255, 255, 0.08)",
    "--launcher-hero-stop-2": "rgba(229, 222, 209, 0.10)",
    "--launcher-hero-stop-3": "rgba(229, 222, 209, 0.14)",
    "--launcher-hero-stroke": "rgba(255, 255, 255, 0.20)",
    "--launcher-hero-inner-fill": "rgba(255, 255, 255, 0.04)",
    "--launcher-hero-inner-stroke": "rgba(255, 255, 255, 0.06)",
    "--launcher-hero-tint-1": "transparent",
    "--launcher-hero-tint-2": "transparent",
    "--launcher-hero-tint-3": "transparent",
    "--launcher-hero-tint-4": "transparent",
    "--launcher-input-fill": "rgba(255, 255, 255, 0.06)",
    "--launcher-input-stroke": "rgba(255, 255, 255, 0.20)",
    "--launcher-input-inner-fill": "rgba(255, 255, 255, 0.03)",
    "--launcher-input-inner-stroke": "rgba(255, 255, 255, 0.06)",
    "--launcher-input-icon": "rgba(236, 228, 214, 0.64)",
    "--launcher-input-text": "rgba(245, 238, 227, 0.92)",
    "--launcher-input-placeholder": "rgba(209, 199, 183, 0.42)",
    "--launcher-submit-background": "linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.12))",
    "--launcher-submit-color": "#f5ecde",
    "--launcher-submit-shadow": "0 10px 24px rgba(0, 0, 0, 0.24)",
    "--launcher-agent-chip-background": "rgba(255, 255, 255, 0.08)",
    "--launcher-agent-chip-border": "rgba(255, 255, 255, 0.12)",
    "--launcher-agent-chip-text": "rgba(244, 239, 230, 0.84)",
    "--launcher-room-chip-background": "rgba(255, 255, 255, 0.06)",
    "--launcher-room-chip-border": "rgba(255, 255, 255, 0.10)",
    "--launcher-room-chip-text": "rgba(225, 218, 207, 0.78)",
    "--launcher-handoff-color": "rgba(154, 187, 255, 0.72)",
    "--launcher-handoff-hover-color": "rgba(190, 210, 255, 0.96)",
  },
  sunny: {
    "--launcher-bridge-background":
      "radial-gradient(circle at 18% 50%, rgba(255, 255, 255, 0.06), transparent 34%), linear-gradient(90deg, rgba(138, 152, 173, 0.02), rgba(138, 152, 173, 0.10) 28%, rgba(188, 145, 101, 0.06) 62%, rgba(255, 255, 255, 0.01))",
    "--launcher-hero-aura":
      "radial-gradient(32% 18% at 50% 82%, rgba(138, 152, 173, 0.16), rgba(138, 152, 173, 0) 74%), radial-gradient(12% 18% at 86% 22%, rgba(114, 129, 151, 0.12), rgba(114, 129, 151, 0) 76%), radial-gradient(12% 18% at 14% 38%, rgba(188, 145, 101, 0.12), rgba(188, 145, 101, 0) 76%), radial-gradient(40% 12% at 50% 12%, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 74%)",
    "--launcher-hero-stop-1": "rgba(52, 47, 43, 0.16)",
    "--launcher-hero-stop-2": "rgba(40, 36, 32, 0.14)",
    "--launcher-hero-stop-3": "rgba(34, 30, 27, 0.18)",
    "--launcher-hero-stroke": "rgba(255, 255, 255, 0.14)",
    "--launcher-hero-inner-fill": "rgba(255, 255, 255, 0.02)",
    "--launcher-hero-inner-stroke": "rgba(255, 255, 255, 0.04)",
    "--launcher-hero-tint-1": "transparent",
    "--launcher-hero-tint-2": "transparent",
    "--launcher-hero-tint-3": "transparent",
    "--launcher-hero-tint-4": "transparent",
    "--launcher-input-fill": "rgba(255, 255, 255, 0.03)",
    "--launcher-input-stroke": "rgba(255, 255, 255, 0.14)",
    "--launcher-input-inner-fill": "rgba(255, 255, 255, 0.01)",
    "--launcher-input-inner-stroke": "rgba(255, 255, 255, 0.04)",
    "--launcher-input-icon": "rgba(236, 228, 214, 0.58)",
    "--launcher-input-text": "rgba(238, 230, 220, 0.88)",
    "--launcher-input-placeholder": "rgba(185, 175, 164, 0.36)",
    "--launcher-submit-background": "linear-gradient(180deg, rgba(236, 230, 220, 0.16), rgba(236, 230, 220, 0.10))",
    "--launcher-submit-color": "#efe7dc",
    "--launcher-submit-shadow": "0 8px 18px rgba(0, 0, 0, 0.24)",
    "--launcher-agent-chip-background": "rgba(255, 255, 255, 0.06)",
    "--launcher-agent-chip-border": "rgba(255, 255, 255, 0.08)",
    "--launcher-agent-chip-text": "rgba(236, 228, 214, 0.74)",
    "--launcher-room-chip-background": "rgba(255, 255, 255, 0.04)",
    "--launcher-room-chip-border": "rgba(255, 255, 255, 0.08)",
    "--launcher-room-chip-text": "rgba(196, 186, 174, 0.68)",
    "--launcher-handoff-color": "rgba(188, 145, 101, 0.64)",
    "--launcher-handoff-hover-color": "rgba(210, 172, 132, 0.92)",
  },
};

export function getLauncherSurfaceThemeStyle(theme: Theme): LauncherSurfaceThemeStyle {
  return LAUNCHER_SURFACE_THEME_STYLE_MAP[theme];
}
