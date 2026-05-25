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
  windows,
  on_restore_all,
}: {
  windows: StageWindowState[];
  on_restore_all: () => void;
}) {
  const minimized_count = windows.filter((window) => window.phase === "minimized").length;
  const closed_count = windows.filter((window) => window.phase === "closed").length;
  const has_only_minimized_windows = minimized_count > 0 && closed_count === 0;
  const title = has_only_minimized_windows ? "所有窗口已最小化" : "桌面没有打开的窗口";
  const detail = has_only_minimized_windows
    ? `${minimized_count} 个窗口仍在 Dock 中，可以恢复到桌面。`
    : minimized_count > 0
      ? `${minimized_count} 个窗口仍在 Dock 中，${closed_count} 个窗口已关闭。`
    : "应用已被关闭，可以从桌面重新打开。";

  return (
    <div className="pointer-events-none absolute inset-0 z-[9] grid place-items-center px-6 text-center max-md:relative max-md:min-h-[260px]">
      <div className="pointer-events-auto max-w-[300px] rounded-[18px] border border-white/70 bg-white/70 p-5 shadow-[0_24px_64px_rgba(18,28,42,0.12)] backdrop-blur-xl">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[13px] border border-(--divider-subtle-color) bg-white/72 text-(--icon-muted)">
          <PauseCircle className="h-5 w-5" />
        </div>
        <p className="text-[15px] font-black tracking-[-0.025em] text-(--text-strong)">{title}</p>
        <p className="mt-2 text-[11px] leading-5 text-(--text-soft)">
          {detail}
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

  const dock_windows = windows.filter((window) => window.phase !== "closed");
  const running_windows = dock_windows.filter((window) => window.phase !== "minimized");
  const minimized_windows = dock_windows.filter((window) => window.phase === "minimized");
  const running_apps = group_running_windows_by_app(running_windows, active_window_id);
  const active_window = running_windows.find((window) => window.id === active_window_id)
    ?? running_windows[0]
    ?? minimized_windows[0]
    ?? null;
  const active_app_label = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";
  if (!dock_windows.length) {
    return null;
  }

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
        {running_apps.map(({ app_label, count, is_active, window }) => {
          const Icon = icon_for_window_kind(window.kind);
          const window_title = display_window_title(window);
          const state_label = is_active ? "当前" : "后台";
          const title = count > 1
            ? `${app_label} · ${count} 个窗口 · ${state_label}`
            : `${app_label} · ${window_title} · ${state_label}`;
          return (
            <button
              aria-label={`${state_label}：${app_label}`}
              className={cn(
                "group relative grid shrink-0 place-items-center rounded-[18px] border text-left transition duration-200 ease-out hover:-translate-y-2 hover:scale-110 focus-visible:-translate-y-2 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]",
                is_active
                  ? "h-[52px] w-[52px] border-[rgba(91,114,255,0.32)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_16px_32px_rgba(91,114,255,0.22)]"
                  : "h-[44px] w-[44px] border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/72 hover:text-(--text-strong)",
              )}
              key={app_label}
              onClick={() => on_restore(window.id)}
              title={title}
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
                    : "bg-[rgba(47,184,132,0.72)]",
                )} />
                {count > 1 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border border-white/80 bg-[rgba(20,28,38,0.72)] px-1 text-[8px] font-black leading-none text-white shadow-[0_4px_10px_rgba(18,28,42,0.18)]">
                    {count}
                  </span>
                ) : null}
              </span>
              <span className={cn(
                  "absolute -bottom-2 left-1/2 h-1.5 -translate-x-1/2 rounded-full transition",
                  is_active
                    ? "w-5 bg-[color:var(--primary)]"
                    : "w-2 bg-[rgba(47,184,132,0.54)]",
              )} />
              <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 hidden max-w-[230px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/70 bg-[rgba(20,28,38,0.82)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_rgba(18,28,42,0.22)] backdrop-blur-xl group-hover:block group-focus-visible:block">
                <span className="block max-w-[160px] truncate">{app_label}</span>
                <span className="block text-[9px] font-medium text-white/66">
                  {count > 1 ? `${count} 个窗口` : window_title} · {state_label}
                </span>
              </span>
            </button>
          );
        })}
        {minimized_windows.length ? (
          <>
            <div className="h-9 w-px shrink-0 bg-white/56" />
            {minimized_windows.map((window) => {
              const Icon = icon_for_window_kind(window.kind);
              const app_label = stage_app_label_for_window_kind(window.kind);
              const window_title = display_window_title(window);
              return (
                <button
                  aria-label={`恢复：${window_title}`}
                  className="group relative grid h-[42px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-[12px] border border-white/58 bg-white/40 text-(--icon-muted) shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] transition duration-200 ease-out hover:-translate-y-2 hover:bg-white/70 hover:text-(--text-strong) focus-visible:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]"
                  key={window.id}
                  onClick={() => on_restore(window.id)}
                  title={`已最小化：${window_title}`}
                  type="button"
                >
                  <div className="absolute inset-x-1 top-1 h-3 rounded-[8px] border border-white/54 bg-white/48" />
                  <Icon className="relative z-10 h-[17px] w-[17px]" />
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-[rgba(223,157,46,0.78)]" />
                  <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 hidden max-w-[230px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/70 bg-[rgba(20,28,38,0.82)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_rgba(18,28,42,0.22)] backdrop-blur-xl group-hover:block group-focus-visible:block">
                    <span className="block max-w-[160px] truncate">{window_title}</span>
                    <span className="block text-[9px] font-medium text-white/66">{app_label} · 已最小化</span>
                  </span>
                </button>
              );
            })}
          </>
        ) : null}
        </div>
      </div>
    </div>
  );
}

interface DockAppGroup {
  app_label: string;
  count: number;
  is_active: boolean;
  window: StageWindowState;
}

function group_running_windows_by_app(
  windows: StageWindowState[],
  active_window_id: string | null,
): DockAppGroup[] {
  const groups = new Map<string, DockAppGroup>();

  for (const window of windows) {
    const app_label = stage_app_label_for_window_kind(window.kind);
    const existing = groups.get(app_label);
    const is_active = window.id === active_window_id;
    if (!existing) {
      groups.set(app_label, {
        app_label,
        count: 1,
        is_active,
        window,
      });
      continue;
    }
    existing.count += 1;
    existing.is_active = existing.is_active || is_active;
    if (is_active) {
      existing.window = window;
    }
  }

  return [...groups.values()];
}

function display_window_title(window: StageWindowState): string {
  if (!is_low_signal_director_value(window.title)) {
    return window.title;
  }
  return display_stage_event_title(window.payload.event, stage_app_label_for_window_kind(window.kind));
}
