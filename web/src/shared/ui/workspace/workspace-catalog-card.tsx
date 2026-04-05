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

const BADGE_STYLE_MAP: Record<CatalogBadgeTone, { background: string; border: string; color: string }> = {
  neutral: {
    background: "rgb(255 255 255 / 0.72)",
    border: "1px solid rgb(226 232 240 / 0.78)",
    color: "rgb(100 116 139 / 0.84)",
  },
  info: {
    background: "rgb(239 246 255 / 0.9)",
    border: "1px solid rgb(191 219 254 / 0.82)",
    color: "rgb(3 105 161)",
  },
  success: {
    background: "rgb(236 253 245 / 0.92)",
    border: "1px solid rgb(167 243 208 / 0.82)",
    color: "rgb(4 120 87)",
  },
  warning: {
    background: "rgb(255 251 235 / 0.92)",
    border: "1px solid rgb(253 230 138 / 0.82)",
    color: "rgb(180 83 9)",
  },
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
        "relative flex flex-col border border-[color:var(--card-default-border)] bg-[var(--card-default-background)] shadow-[var(--card-default-shadow)] transition duration-150 ease-out hover:-translate-y-px hover:border-white/50 hover:bg-white/45 hover:shadow-[0_18px_36px_rgb(106_124_158/0.12)]",
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
        "flex items-center justify-center border border-[color:var(--chip-default-border)] bg-[var(--chip-default-background)] shadow-[var(--chip-default-shadow)]",
        shape === "round" ? "rounded-full" : "rounded-[14px]",
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
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500/80 transition duration-150 ease-out hover:bg-slate-50/92 hover:text-slate-900/92",
        tone === "danger" && "hover:bg-rose-50/92 hover:text-rose-600/90",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-500/80",
        class_name,
      )}
      style={{
        background: "rgb(255 255 255 / 0.68)",
        border: "1px solid rgb(226 232 240 / 0.74)",
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
        "flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-400/30 bg-[var(--card-default-background)] text-center shadow-[var(--card-default-shadow)] transition duration-150 ease-out hover:-translate-y-px hover:border-slate-400/45 hover:bg-white/45",
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
        "flex min-h-80 items-center justify-center rounded-[28px] border border-[color:var(--card-default-border)] bg-[var(--card-default-background)] px-8 text-center shadow-[var(--card-default-shadow)]",
        class_name,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
