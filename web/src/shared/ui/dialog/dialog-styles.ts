/**
# !/usr/bin/env xx
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：dialog-styles.ts
# @Date   ：2026-04-05 17:09
# @Author ：leemysw
# 2026-04-05 17:09   Create
# =====================================================
*/

import { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const DIALOG_HEADER_LEADING_CLASS_NAME = "flex min-w-0 items-start gap-3.5";

export const DIALOG_HEADER_ICON_CLASS_NAME =
  "dialog-card flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[color:var(--text-strong)]";

export const DIALOG_EMPTY_CLASS_NAME =
  "surface-inset flex items-center justify-center rounded-[20px] px-4 py-4 text-[13px] text-[color:var(--text-muted)]";

export const DIALOG_TAG_CLASS_NAME =
  "chip-default inline-flex items-center gap-1 rounded-full px-[0.7rem] py-[0.3rem] text-[11px] font-semibold text-[color:var(--text-muted)]";

export function getDialogNoteClassName(tone: "default" | "danger", class_name?: string): string {
  return cn(
    "rounded-[18px] px-4 py-[0.95rem] text-[13px] leading-[1.65]",
    tone === "default"
      ? "surface-card text-[color:var(--text-default)]"
      : "border text-[color:var(--text-default)]",
    class_name,
  );
}

export function getDialogNoteStyle(tone: "default" | "danger"): CSSProperties | undefined {
  if (tone !== "danger") {
    return undefined;
  }

  return {
    background: "color-mix(in srgb, var(--destructive) 12%, var(--modal-card-background))",
    borderColor: "color-mix(in srgb, var(--destructive) 26%, var(--modal-card-border))",
    color: "var(--text-default)",
  };
}

export function getDialogChoiceClassName(is_active: boolean, class_name?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full px-[0.9rem] py-[0.45rem] text-[12px] font-semibold transition-[background,color,box-shadow,border-color] duration-180 ease-out",
    is_active
      ? "text-[var(--primary-foreground)]"
      : "chip-pill border border-[color:var(--chip-pill-border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]",
    class_name,
  );
}

export function getDialogChoiceStyle(is_active: boolean): CSSProperties | undefined {
  if (!is_active) {
    return undefined;
  }

  return {
    background: "color-mix(in srgb, var(--primary) 82%, var(--modal-card-background))",
    border: "1px solid color-mix(in srgb, var(--primary) 36%, var(--modal-card-border))",
    color: "var(--primary-foreground)",
  };
}
