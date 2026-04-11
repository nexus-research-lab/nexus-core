/**
# !/usr/bin/env xx
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：liquid-glass-presets.ts
# @Date   ：2026-04-11 11:43
# @Author ：leemysw
# 2026-04-11 11:43   Create
# =====================================================
*/

export interface LiquidGlassPreset {
  background: string;
  border_color: string;
  inner_background: string;
  inner_border_color: string;
  shadow: string;
  sheen_background: string;
  glow_background: string;
}

export const LIQUID_GLASS_PRESETS: Record<string, LiquidGlassPreset> = {
  panel: {
    background: "var(--surface-panel-background)",
    border_color: "var(--surface-panel-border)",
    inner_background: "var(--material-panel-inner)",
    inner_border_color: "var(--material-panel-highlight)",
    shadow: "var(--surface-panel-shadow)",
    sheen_background: "radial-gradient(68% 48% at 16% 6%, rgba(255,255,255,0.22), rgba(255,255,255,0) 56%), linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 48%, rgba(255,255,255,0) 100%)",
    glow_background: "var(--material-panel-glow)",
  },
  subtle_panel: {
    background: "var(--surface-inset-background)",
    border_color: "var(--surface-inset-border)",
    inner_background: "var(--material-inset-inner)",
    inner_border_color: "var(--material-inset-highlight)",
    shadow: "var(--surface-inset-shadow)",
    sheen_background: "radial-gradient(72% 52% at 16% 6%, rgba(255,255,255,0.18), rgba(255,255,255,0) 54%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0) 42%)",
    glow_background: "radial-gradient(52% 34% at 20% 4%, rgba(255,255,255,0.08), rgba(255,255,255,0) 68%), radial-gradient(28% 24% at 86% 100%, rgba(193,213,255,0.06), rgba(193,213,255,0) 76%)",
  },
  shell: {
    background: "var(--surface-shell-background)",
    border_color: "var(--surface-shell-border)",
    inner_background: "var(--material-shell-inner)",
    inner_border_color: "var(--material-shell-highlight)",
    shadow: "var(--surface-shell-shadow)",
    sheen_background: "radial-gradient(74% 52% at 14% 4%, rgba(255,255,255,0.22), rgba(255,255,255,0) 54%), linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 48%, rgba(255,255,255,0) 100%)",
    glow_background: "var(--material-shell-glow)",
  },
  popover: {
    background: "var(--surface-popover-background)",
    border_color: "var(--surface-popover-border)",
    inner_background: "var(--material-popover-inner)",
    inner_border_color: "rgba(255,255,255,0.2)",
    shadow: "var(--surface-popover-shadow)",
    sheen_background: "radial-gradient(72% 52% at 14% 4%, rgba(255,255,255,0.18), rgba(255,255,255,0) 56%), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 48%, rgba(255,255,255,0) 100%)",
    glow_background: "radial-gradient(52% 32% at 18% 2%, rgba(255,255,255,0.12), rgba(255,255,255,0) 72%), radial-gradient(24% 22% at 84% 100%, rgba(150,180,255,0.08), rgba(150,180,255,0) 78%)",
  },
};
