"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export { WorkspaceTaskStrip } from "./workspace-task-strip";

const SURFACE_HEADER_CLASS_NAME =
  "border-b border-[var(--divider-subtle-color)] bg-transparent";

interface WorkspaceSurfaceHeaderTab<TTabKey extends string> {
  key: TTabKey;
  label: string;
  icon?: LucideIcon;
}

interface WorkspaceSurfaceHeaderProps<TTabKey extends string> {
  title: string;
  badge?: string;
  density?: "default" | "compact";
  leading?: ReactNode;
  title_trailing?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  tabs?: WorkspaceSurfaceHeaderTab<TTabKey>[];
  tabs_trailing?: ReactNode;
  active_tab?: TTabKey;
  on_change_tab?: (tab: TTabKey) => void;
}

export function WorkspaceSurfaceHeader<TTabKey extends string>({
  title,
  badge,
  density = "default",
  leading,
  title_trailing,
  subtitle,
  trailing,
  tabs = [],
  tabs_trailing,
  active_tab,
  on_change_tab,
}: WorkspaceSurfaceHeaderProps<TTabKey>) {
  return (
    <div className={SURFACE_HEADER_CLASS_NAME} data-density={density}>
      <div className={cn(
        "flex min-w-0 items-start justify-between gap-4 px-5 xl:px-6",
        density === "compact" ? "py-3" : "py-3.5",
      )}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading ? (
            <div
              className={cn(
                "chip-default flex shrink-0 items-center justify-center rounded-full text-[color:var(--icon-default)]",
                density === "compact" ? "h-8 w-8" : "h-[34px] w-[34px]",
              )}
            >
              {leading}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className={cn(
                "truncate font-black tracking-[-0.045em] text-[color:var(--text-strong)]",
                density === "compact" ? "text-[17px]" : "text-[18px]",
              )}>
                {title}
              </div>
              {badge ? (
                <span
                  className="chip-default inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.14em] text-[color:var(--text-default)]"
                >
                  {badge}
                </span>
              ) : null}
              {title_trailing ? (
                <div className="min-w-0 shrink">{title_trailing}</div>
              ) : null}
            </div>
            {subtitle ? (
              <div className="mt-1 text-[12px] text-[color:var(--text-soft)]">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {trailing ? (
          <div className="ml-3 flex shrink-0 flex-wrap items-center justify-end gap-2">
            {trailing}
          </div>
        ) : null}
      </div>

      {tabs.length || tabs_trailing ? (
        <div className={cn(
          "flex min-w-0 items-center gap-3 px-5 xl:px-6",
          density === "compact" ? "pb-2" : "pb-2.5",
        )}>
          <nav
            aria-label="视图切换"
            className="soft-scrollbar scrollbar-hide -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const is_active = active_tab === tab.key;
              return (
                <button
                  aria-pressed={is_active}
                  aria-current={is_active ? "page" : undefined}
                  key={tab.key}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-[background-color,color] duration-150 ease-out",
                    is_active
                      ? "bg-[var(--surface-interactive-active-background)] text-[color:var(--text-strong)]"
                      : "text-[color:var(--text-default)] hover:bg-[var(--surface-interactive-hover-background)] hover:text-[color:var(--text-strong)]",
                    density === "compact" && "h-7 px-2.5 text-[10.5px]",
                  )}
                  onClick={() => on_change_tab?.(tab.key)}
                  type="button"
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {tab.label}
                </button>
              );
            })}
          </nav>
          {tabs_trailing ? (
            <div className="shrink-0">
              {tabs_trailing}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
