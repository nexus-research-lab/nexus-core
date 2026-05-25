import {
  PauseCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import {
  display_stage_event_title,
} from "../operation-stage-labels";
import {
  icon_for_window_kind,
  is_low_signal_director_value,
  stage_app_label_for_window_kind,
} from "./operation-stage-helpers";

export function StageWindowsHiddenState({
  window_count,
  on_restore_all,
}: {
  window_count: number;
  on_restore_all: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center px-6 text-center max-md:relative max-md:min-h-[260px]">
      <div className="max-w-[300px] rounded-[18px] border border-white/70 bg-white/70 p-5 shadow-[0_24px_64px_rgba(18,28,42,0.12)] backdrop-blur-xl">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[13px] border border-(--divider-subtle-color) bg-white/72 text-(--icon-muted)">
          <PauseCircle className="h-5 w-5" />
        </div>
        <p className="text-[15px] font-black tracking-[-0.025em] text-(--text-strong)">所有窗口已最小化</p>
        <p className="mt-2 text-[11px] leading-5 text-(--text-soft)">
          {window_count} 个应用仍在 Dock 中，可以恢复到桌面。
        </p>
        <button
          className="mt-4 inline-flex h-8 items-center justify-center rounded-full border border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] px-3 text-[11px] font-bold text-[color:var(--primary)] transition hover:bg-[rgba(91,114,255,0.16)]"
          onClick={on_restore_all}
          type="button"
        >
          恢复全部
        </button>
      </div>
    </div>
  );
}

export function StageWindowDock({
  active_window_id,
  windows,
  on_restore,
}: {
  active_window_id: string | null;
  windows: StageWindowState[];
  on_restore: (window_id: string) => void;
}) {
  if (!windows.length) {
    return null;
  }

  const active_window = windows.find((window) => window.id === active_window_id) ?? windows[0];
  const active_app_label = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 flex justify-center max-md:relative max-md:inset-x-auto max-md:bottom-auto max-md:mt-3">
      <div className="flex max-w-full flex-col items-center gap-1.5">
        <div className="operation-window-dock soft-scrollbar flex max-w-full items-end gap-2 overflow-x-auto rounded-[26px] border border-white/70 bg-[rgba(255,255,255,0.60)] px-2.5 py-2 shadow-[0_24px_60px_rgba(18,28,42,0.18),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-2xl">
          <div
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[17px] border border-white/60 bg-[linear-gradient(135deg,rgba(91,114,255,0.18),rgba(255,255,255,0.74),rgba(79,162,159,0.14))] text-[13px] font-black text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
            title={active_window ? `${active_app_label} · ${display_window_title(active_window)}` : "Nexus"}
          >
            N
          </div>
          <div className="h-9 w-px shrink-0 bg-white/56" />
        {windows.map((window) => {
          const Icon = icon_for_window_kind(window.kind);
          const is_active = active_window_id === window.id && window.phase !== "closed" && window.phase !== "minimized";
          const app_label = stage_app_label_for_window_kind(window.kind);
          const window_title = display_window_title(window);
          const state_label = window.phase === "closed"
            ? "已关闭"
            : window.phase === "minimized"
              ? "已最小化"
              : is_active
                ? "当前"
                : "后台";
          return (
            <button
              aria-label={`${state_label}：${window_title}`}
              className={cn(
                "group relative grid shrink-0 place-items-center rounded-[18px] border text-left transition duration-200 ease-out hover:-translate-y-2 hover:scale-110 focus-visible:-translate-y-2 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]",
                is_active
                  ? "h-[52px] w-[52px] border-[rgba(91,114,255,0.32)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_16px_32px_rgba(91,114,255,0.22)]"
                  : window.phase === "closed" || window.phase === "minimized"
                    ? "h-[44px] w-[44px] border-transparent bg-white/28 text-(--icon-muted) opacity-72 hover:bg-white/62 hover:text-(--text-strong) hover:opacity-100"
                    : "h-[44px] w-[44px] border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/72 hover:text-(--text-strong)",
              )}
              key={window.id}
              onClick={() => on_restore(window.id)}
              title={`${state_label}：${window_title}`}
              type="button"
            >
              <span className={cn(
                "relative grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[14px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]",
                is_active
                  ? "border-[rgba(91,114,255,0.28)] bg-white/58"
                  : "border-white/52 bg-white/44",
              )}>
                <Icon className="h-[18px] w-[18px]" />
                <span className={cn(
                  "absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/72 transition",
                  is_active
                    ? "bg-[color:var(--primary)]"
                    : window.phase === "minimized"
                      ? "bg-[rgba(223,157,46,0.82)]"
                      : window.phase === "closed"
                        ? "bg-[rgba(117,131,149,0.58)]"
                        : "bg-[rgba(47,184,132,0.72)]",
                )} />
              </span>
              <span className={cn(
                "absolute -bottom-2 left-1/2 h-1.5 -translate-x-1/2 rounded-full transition",
                is_active
                  ? "w-5 bg-[color:var(--primary)]"
                  : window.phase === "minimized"
                    ? "w-2 bg-[rgba(223,157,46,0.70)]"
                    : window.phase === "closed"
                      ? "w-2 bg-[rgba(117,131,149,0.42)]"
                      : "w-2 bg-[rgba(47,184,132,0.54)]",
              )} />
              <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 hidden max-w-[230px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/70 bg-[rgba(20,28,38,0.82)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_rgba(18,28,42,0.22)] backdrop-blur-xl group-hover:block group-focus-visible:block">
                <span className="block max-w-[160px] truncate">{window_title}</span>
                <span className="block text-[9px] font-medium text-white/66">{app_label} · {state_label}</span>
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function display_window_title(window: StageWindowState): string {
  if (!is_low_signal_director_value(window.title)) {
    return window.title;
  }
  return display_stage_event_title(window.payload.event, stage_app_label_for_window_kind(window.kind));
}
