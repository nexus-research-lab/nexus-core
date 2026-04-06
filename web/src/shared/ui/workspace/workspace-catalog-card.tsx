/**
 * =====================================================
 * @File   : workspace-catalog-card.tsx
 * @Date   : 2026-04-05 14:32
 * @Author : leemysw
 * 2026-04-05 14:32   Create
 * =====================================================
 */

"use client";

import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type CatalogBadgeTone = "neutral" | "info" | "success" | "warning";
type CatalogMediaShape = "round" | "rounded";
type CatalogActionTone = "default" | "danger";
type IconFrameTone = "default" | "primary" | "success" | "warning";
type IconFrameSize = "sm" | "md" | "lg";

const BADGE_STYLE_MAP: Record<CatalogBadgeTone, { background: string; border: string; color: string }> = {
  neutral: {
    background: "var(--surface-panel-subtle-background)",
    border: "1px solid var(--surface-panel-subtle-border)",
    color: "var(--text-muted)",
  },
  info: {
    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--primary) 30%, var(--surface-panel-subtle-border))",
    color: "color-mix(in srgb, var(--primary) 78%, var(--text-strong))",
  },
  success: {
    background: "color-mix(in srgb, var(--success) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--success) 30%, var(--surface-panel-subtle-border))",
    color: "color-mix(in srgb, var(--success) 78%, var(--text-strong))",
  },
  warning: {
    background: "color-mix(in srgb, var(--warning) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--warning) 30%, var(--surface-panel-subtle-border))",
    color: "color-mix(in srgb, var(--warning) 82%, var(--text-strong))",
  },
};

const ICON_FRAME_TONE_CLASS_MAP: Record<IconFrameTone, string> = {
  default: "border-[color:var(--chip-default-border)] bg-[var(--chip-default-background)] text-[color:var(--text-default)]",
  primary: "border-primary/14 bg-primary/8 text-primary",
  success: "border-emerald-200/70 bg-emerald-50/92 text-emerald-700",
  warning: "border-amber-200/72 bg-amber-50/92 text-amber-700",
};

const ICON_FRAME_SIZE_CLASS_MAP: Record<IconFrameSize, string> = {
  sm: "h-9 w-9 rounded-[14px]",
  md: "h-11 w-11 rounded-[16px]",
  lg: "h-14 w-14 rounded-[20px]",
};

/** 中文注释：这组目录卡片是高频共享块，长相收回组件层，避免全局 CSS 继续膨胀。 */
export function WorkspaceCatalogCard({
  children,
  class_name,
  muted = false,
  onClick,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  class_name?: string;
  muted?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden border border-[color:var(--card-default-border)] bg-[var(--card-default-background)] transition duration-150 ease-out hover:border-[var(--surface-interactive-active-border)] hover:bg-[var(--surface-interactive-hover-background)]",
        onClick && "cursor-pointer",
        muted && "opacity-70",
        class_name,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </article>
  );
}

export function WorkspaceCatalogMedia({
  children,
  class_name,
  shape = "rounded",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  class_name?: string;
  shape?: CatalogMediaShape;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden border border-[color:var(--chip-default-border)] bg-[var(--chip-default-background)]",
        shape === "round" ? "rounded-full" : "rounded-[14px]",
        class_name,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** 中文注释：统一高频图标容器，侧栏、卡片和弹窗都用这套边界语法。 */
export function WorkspaceIconFrame({
  children,
  class_name,
  shape = "rounded",
  size = "md",
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  class_name?: string;
  shape?: CatalogMediaShape;
  size?: IconFrameSize;
  tone?: IconFrameTone;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border",
        ICON_FRAME_SIZE_CLASS_MAP[size],
        ICON_FRAME_TONE_CLASS_MAP[tone],
        shape === "round" && "rounded-full",
        class_name,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceCatalogAction({
  children,
  class_name,
  tone = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  class_name?: string;
  tone?: CatalogActionTone;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-[color:var(--chip-default-border)] bg-[var(--chip-default-background)] text-[color:var(--icon-default)] transition duration-150 ease-out hover:border-[var(--surface-interactive-active-border)] hover:bg-[var(--surface-interactive-active-background)] hover:text-[color:var(--icon-strong)]",
        tone === "danger" && "hover:border-rose-100 hover:bg-rose-50/92 hover:text-rose-600/90",
        class_name,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function WorkspaceCatalogBadge({
  children,
  class_name,
  tone = "neutral",
}: {
  children: ReactNode;
  class_name?: string;
  tone?: CatalogBadgeTone;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-[1.2]", class_name)}
      style={BADGE_STYLE_MAP[tone]}
    >
      {children}
    </span>
  );
}

export function WorkspaceCatalogTag({
  children,
  class_name,
}: {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-[color:var(--text-muted)]",
        class_name,
      )}
      style={{
        background: "var(--surface-panel-subtle-background)",
        border: "1px solid var(--surface-panel-subtle-border)",
      }}
    >
      {children}
    </span>
  );
}

export function WorkspaceCatalogGhostCard({
  children,
  class_name,
  onClick,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-dashed border-[var(--surface-panel-subtle-border)] bg-[var(--card-default-background)] text-center transition duration-150 ease-out hover:border-[var(--surface-interactive-active-border)] hover:bg-[var(--surface-interactive-hover-background)]",
        onClick && "cursor-pointer",
        class_name,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </article>
  );
}

export function WorkspaceCatalogEmptyShell({
  children,
  class_name,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-80 items-center justify-center rounded-[28px] border border-[color:var(--card-default-border)] bg-[var(--card-default-background)] px-8 text-center",
        class_name,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
