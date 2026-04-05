"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export { WorkspaceTaskStrip } from "./workspace-task-strip";

const SURFACE_HEADER_CLASS_NAME =
  "relative z-10 border-b border-[var(--divider-subtle-color)] bg-white/50";

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
  const chip_style = {
    background: "var(--chip-default-background)",
    border: "1px solid var(--chip-default-border)",
    boxShadow: "var(--chip-default-shadow)",
  } as const;

  return (
    <div className={SURFACE_HEADER_CLASS_NAME} data-density={density}>
      <div className={cn(
        "flex min-w-0 items-center justify-between gap-4 px-5 xl:px-6",
        density === "compact" ? "py-2" : "py-2.5",
      )}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading ? (
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full text-slate-600/90",
                density === "compact" ? "h-7 w-7" : "h-[30px] w-[30px]",
              )}
              style={chip_style}
            >
              {leading}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className={cn(
                "truncate font-bold tracking-[-0.04em] text-slate-950/90",
                density === "compact" ? "text-[15px]" : "text-[16px]",
              )}>
                {title}
              </div>
              {badge ? (
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-600/86"
                  style={chip_style}
                >
                  {badge}
                </span>
              ) : null}
              {title_trailing ? (
                <div className="min-w-0 shrink">{title_trailing}</div>
              ) : null}
            </div>
            {subtitle ? (
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-700/52">
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
          density === "compact" ? "pb-1" : "pb-1.5",
        )}>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const is_active = active_tab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition duration-150 ease-out",
                    is_active
                      ? "border-[color:var(--chip-default-border)] text-slate-950/96"
                      : "border-transparent text-slate-600/84 hover:bg-white/35 hover:text-slate-950/96",
                    density === "compact" && "h-7 px-2.5 text-[10.5px]",
                  )}
                  style={is_active ? chip_style : undefined}
                  onClick={() => on_change_tab?.(tab.key)}
                  type="button"
                >
                  {Icon ? <Icon className="h-3.5 w-3.5"/> : null}
                  {tab.label}
                </button>
              );
            })}
          </div>
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
