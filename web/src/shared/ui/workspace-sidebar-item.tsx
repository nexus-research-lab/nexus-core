"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceSidebarItemProps {
  is_active?: boolean;
  icon?: ReactNode;
  icon_mode?: "chip" | "plain";
  size?: "default" | "compact";
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  class_name?: string;
  on_click: () => void;
}

export function WorkspaceSidebarItem({
  is_active = false,
  icon,
  icon_mode = "chip",
  size = "default",
  title,
  subtitle,
  meta,
  trailing,
  class_name,
  on_click,
}: WorkspaceSidebarItemProps) {
  const is_compact = size === "compact";

  return (
    <button
      className={cn(
        "group flex w-full items-start gap-3 text-left transition-all duration-300",
        is_compact ? "rounded-[16px] px-3 py-2.5" : "rounded-[18px] px-3 py-3",
        is_active
          ? "workspace-card-strong border-white/24 shadow-[0_18px_30px_rgba(102,112,145,0.12)]"
          : "workspace-card border-transparent hover:bg-white/34",
        class_name,
      )}
      onClick={on_click}
      type="button"
    >
      {icon ? (
        icon_mode === "plain" ? (
          <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center text-slate-700/60">
            {icon}
          </div>
        ) : (
          <div className="workspace-chip mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-900/76">
            {icon}
          </div>
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-950/86">
            {title}
          </p>
          {trailing ? (
            <div className="shrink-0 text-[11px] text-slate-700/48">
              {trailing}
            </div>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-[12px] text-slate-700/56">
            {subtitle}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-2 text-[11px] text-slate-700/48">
            {meta}
          </div>
        ) : null}
      </div>
    </button>
  );
}
