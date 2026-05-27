import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Battery,
  Bell,
  CheckCircle2,
  Command,
  Loader2,
  MousePointer2,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Wifi,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import {
  icon_for_artifact_path,
  stage_app_label_for_window_kind,
} from "./operation-stage-window-meta";
import { stage_menu_items_for_window_kind } from "./operation-stage-app-identity";
import { build_stage_desktop_icon_items } from "./operation-stage-desktop-icons";
import { build_stage_menu_status } from "./operation-stage-menu-model";
import {
  agent_cursor_action_label,
  agent_cursor_anchor_class,
  agent_cursor_intent_for_window_kind,
} from "./operation-stage-agent-cursor";
import type { StageLiveStripState } from "./operation-stage-live-strip";

export function StageMacMenuBar({
  active_window,
  windows,
}: {
  active_window: StageWindowState | null;
  windows: StageWindowState[];
}) {
  const app_name = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";
  const menu_status = useMemo(() => (
    build_stage_menu_status(windows, active_window, (window) => stage_app_label_for_window_kind(window.kind))
  ), [active_window, windows]);
  const [current_time, set_current_time] = useState(() => new Date());
  const menu_items = useMemo(
    () => stage_menu_items_for_window_kind(active_window?.kind ?? null),
    [active_window?.kind],
  );
  const time_label = useMemo(() => (
    new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(current_time)
  ), [current_time]);

  useEffect(() => {
    const interval = window.setInterval(() => set_current_time(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      aria-label={menu_status.activity_label}
      className="absolute inset-x-0 top-0 z-40 flex h-7 items-center justify-between border-b border-white/50 bg-white/44 px-4 text-[10px] font-semibold text-(--text-strong) shadow-[0_1px_0_rgba(255,255,255,0.64),0_10px_26px_rgba(18,28,42,0.07)] backdrop-blur-2xl max-md:hidden"
      title={[
        menu_status.activity_label,
        menu_status.window_label,
        menu_status.dock_label,
      ].filter(Boolean).join(" · ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Apple className="h-3.5 w-3.5 shrink-0" />
        <span className="font-black">{app_name}</span>
        {menu_items.map((item) => (
          <span className="text-(--text-soft)" key={item}>{item}</span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 text-(--text-soft)">
        <Search className="h-3 w-3" />
        <Command className="h-3 w-3" />
        <SlidersHorizontal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <Battery className="h-3 w-3" />
        <span className="font-mono text-[10px] text-(--text-strong)">{time_label}</span>
      </div>
    </div>
  );
}

export function StageDesktopIcons({
  on_restore,
  windows,
}: {
  on_restore: (window_id: string) => void;
  windows: StageWindowState[];
}) {
  const desktop_items = build_stage_desktop_icon_items(windows);

  if (!desktop_items.length) {
    return null;
  }

  return (
    <div className="absolute right-5 top-16 z-10 hidden grid-cols-1 gap-2.5 md:grid">
      {desktop_items.map((window) => {
        const Icon = icon_for_artifact_path(window.target);
        return (
          <button
            aria-label={window.aria_label}
            className="group flex w-[72px] flex-col items-center gap-1 text-center outline-none"
            key={window.window.id}
            onClick={() => on_restore(window.window.id)}
            title={window.title}
            type="button"
          >
            <div className={cn(
              "relative grid h-10 w-10 place-items-center rounded-[13px] border border-white/62 bg-white/42 text-(--icon-default) shadow-[0_10px_24px_rgba(18,28,42,0.08)] backdrop-blur-xl transition group-hover:-translate-y-0.5 group-hover:bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-[rgba(91,114,255,0.38)]",
              window.window.phase === "focused" && "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]",
              window.window.phase === "minimized" && "opacity-78",
              window.window.phase === "closed" && "opacity-62 grayscale-[0.22]",
            )}>
              <Icon className="h-[18px] w-[18px]" />
              <span className={cn(
                "absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/72",
                window.window.phase === "closed"
                  ? "bg-[rgba(117,131,149,0.55)]"
                  : window.window.phase === "minimized"
                    ? "bg-[rgba(223,157,46,0.82)]"
                    : "bg-[rgba(47,184,132,0.72)]",
              )} />
            </div>
            <p className="line-clamp-2 rounded-[6px] px-1 text-[9px] font-semibold leading-3 text-(--text-strong) group-hover:bg-white/48">
              {window.label}
            </p>
            <span className="text-[8px] font-semibold leading-none text-(--text-soft) opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {window.file_kind_label}
            </span>
            <span className="sr-only">{window.state_label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StageLiveStrip({
  state,
}: {
  state: StageLiveStripState;
}) {
  const Icon = state.tone === "done"
    ? CheckCircle2
    : state.tone === "error"
      ? AlertTriangle
      : Loader2;

  return (
    <div className="pointer-events-none absolute right-5 top-11 z-30 hidden w-[220px] md:block">
      <div className={cn(
        "operation-stage-live-strip grid min-w-0 grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-[13px] border px-2 py-1.5 text-[9px] font-semibold opacity-88 shadow-[0_14px_34px_rgba(18,28,42,0.11)] backdrop-blur-2xl",
        state.tone === "error" && "border-[rgba(223,93,98,0.22)] bg-[rgba(255,246,246,0.78)] text-[color:var(--destructive)]",
        state.tone === "waiting" && "border-[rgba(223,157,46,0.22)] bg-[rgba(255,249,236,0.78)] text-[color:var(--warning)]",
        state.tone === "done" && "border-[rgba(47,184,132,0.20)] bg-[rgba(241,253,247,0.78)] text-[color:var(--success)]",
        state.tone === "active" && "border-[rgba(91,114,255,0.20)] bg-[rgba(247,249,255,0.78)] text-[color:var(--primary)]",
      )}>
        <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-white/68 text-(--icon-default) shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
          <Bell className="h-3 w-3" />
          <Icon className={cn(
            "absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-white/84 p-0.5 shadow-[0_4px_10px_rgba(18,28,42,0.12)]",
            state.tone === "active" && "animate-spin",
          )} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-black text-(--text-strong)">{state.app_label}</span>
            <span className="shrink-0 rounded-full bg-white/58 px-1.5 py-px text-[7px] font-black text-(--text-soft)">
              {state.step_label}
            </span>
          </span>
          <span className="mt-0.5 block truncate font-bold text-(--text-strong)">{state.title}</span>
          <span className="mt-0.5 block truncate text-[8px] font-semibold text-(--text-soft)">{state.detail}</span>
        </span>
      </div>
    </div>
  );
}

export function StageAgentCursor({
  active_window,
}: {
  active_window: StageWindowState | null;
}) {
  if (!active_window) {
    return null;
  }
  const intent = agent_cursor_intent_for_window_kind(active_window.kind);
  const action_label = agent_cursor_action_label(intent);
  const app_label = stage_app_label_for_window_kind(active_window.kind);

  return (
    <div
      aria-label={`Nexus ${action_label} ${app_label}`}
      className={cn("operation-stage-agent-cursor pointer-events-none absolute z-50 hidden -translate-x-2 -translate-y-2 md:block", agent_cursor_anchor_class(active_window))}
      data-agent-cursor-intent={intent}
    >
      <MousePointer2 className="h-5 w-5 fill-[rgba(32,43,58,0.88)] text-[rgba(32,43,58,0.88)] drop-shadow-[0_8px_14px_rgba(18,28,42,0.22)]" />
    </div>
  );
}
