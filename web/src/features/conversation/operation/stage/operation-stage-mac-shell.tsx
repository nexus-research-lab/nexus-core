import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Battery,
  Command,
  MousePointer2,
  Search,
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
    <div className="absolute inset-x-0 top-0 z-40 flex h-8 items-center justify-between border-b border-white/58 bg-white/54 px-4 text-[11px] font-semibold text-(--text-strong) shadow-[0_1px_0_rgba(255,255,255,0.70),0_12px_34px_rgba(18,28,42,0.08)] backdrop-blur-2xl max-md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Apple className="h-3.5 w-3.5 shrink-0" />
        <span className="font-black">{app_name}</span>
        {menu_items.map((item) => (
          <span className="text-(--text-soft)" key={item}>{item}</span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-(--text-soft)">
        <span className="rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold text-(--text-muted)">
          {menu_status.activity_label}
        </span>
        <span className="font-mono text-[10px] text-(--text-soft)">{menu_status.window_label}</span>
        {menu_status.dock_label ? (
          <span className="font-mono text-[10px] text-(--text-soft)">{menu_status.dock_label}</span>
        ) : null}
        <Search className="h-3.5 w-3.5" />
        <Command className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <Battery className="h-3.5 w-3.5" />
        <span className="font-mono text-[11px] text-(--text-strong)">{time_label}</span>
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
    <div className="absolute right-6 top-16 z-10 hidden grid-cols-1 gap-4 md:grid">
      {desktop_items.map((window) => {
        const Icon = icon_for_artifact_path(window.target);
        return (
          <button
            aria-label={window.aria_label}
            className="group flex w-[92px] flex-col items-center gap-1.5 text-center outline-none"
            key={window.window.id}
            onClick={() => on_restore(window.window.id)}
            title={window.title}
            type="button"
          >
            <div className={cn(
              "relative grid h-12 w-12 place-items-center rounded-[15px] border border-white/62 bg-white/48 text-(--icon-default) shadow-[0_12px_30px_rgba(18,28,42,0.09)] backdrop-blur-xl transition group-hover:-translate-y-0.5 group-hover:bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-[rgba(91,114,255,0.38)]",
              window.window.phase === "focused" && "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]",
              window.window.phase === "minimized" && "opacity-78",
              window.window.phase === "closed" && "opacity-62 grayscale-[0.22]",
            )}>
              <Icon className="h-5 w-5" />
              <span className={cn(
                "absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/72",
                window.window.phase === "closed"
                  ? "bg-[rgba(117,131,149,0.55)]"
                  : window.window.phase === "minimized"
                    ? "bg-[rgba(223,157,46,0.82)]"
                    : "bg-[rgba(47,184,132,0.72)]",
              )} />
            </div>
            <p className="line-clamp-2 rounded-[6px] px-1 text-[10px] font-semibold leading-4 text-(--text-strong) group-hover:bg-white/48">
              {window.label}
            </p>
            <span className="text-[9px] font-semibold leading-none text-(--text-soft) opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {window.file_kind_label}
            </span>
            <span className="sr-only">{window.state_label}</span>
          </button>
        );
      })}
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
      className={cn(
        "operation-stage-agent-cursor pointer-events-none absolute z-50 hidden -translate-x-2 -translate-y-2 items-start gap-2 md:flex",
        agent_cursor_anchor_class(active_window),
      )}
      data-agent-cursor-intent={intent}
    >
      <MousePointer2 className="h-5 w-5 fill-[rgba(32,43,58,0.88)] text-[rgba(32,43,58,0.88)] drop-shadow-[0_8px_14px_rgba(18,28,42,0.22)]" />
      <div className="mt-4 rounded-full border border-white/72 bg-[rgba(255,255,255,0.78)] px-2.5 py-1 text-[10px] font-bold text-(--text-strong) shadow-[0_12px_30px_rgba(18,28,42,0.14)] backdrop-blur-2xl">
        {action_label} · {app_label}
      </div>
    </div>
  );
}
