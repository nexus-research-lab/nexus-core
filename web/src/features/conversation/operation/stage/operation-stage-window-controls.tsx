import {
  LayoutGrid,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowKind, StageWindowState } from "../operation-desktop-types";
import {
  display_stage_event_title,
} from "../operation-stage-labels";
import {
  icon_for_window_kind,
  is_low_signal_director_value,
  stage_app_label_for_window_kind,
} from "./operation-stage-helpers";

const PINNED_DOCK_APPS: Array<{ app_label: string; kind: StageWindowKind }> = [
  { app_label: "Finder", kind: "finder" },
  { app_label: "Safari", kind: "browser" },
  { app_label: "Terminal", kind: "terminal" },
  { app_label: "Code", kind: "code_editor" },
  { app_label: "Console", kind: "run_manifest" },
  { app_label: "Preview", kind: "image_viewer" },
];

export function StageWindowsHiddenState({
  on_restore,
  windows,
  on_restore_all,
}: {
  on_restore: (window_id: string) => void;
  windows: StageWindowState[];
  on_restore_all: () => void;
}) {
  const minimized_count = windows.filter((window) => window.phase === "minimized").length;
  const closed_count = windows.filter((window) => window.phase === "closed").length;
  const recoverable_windows = windows.filter((window) => (
    window.phase === "minimized" || window.phase === "closed"
  ));
  const has_only_minimized_windows = minimized_count > 0 && closed_count === 0;
  const title = has_only_minimized_windows ? "桌面" : "调度中心";
  const detail = has_only_minimized_windows
    ? `${minimized_count} 个窗口已收进 Dock。`
    : minimized_count > 0
      ? `${minimized_count} 个窗口在 Dock，${closed_count} 个窗口已关闭。`
    : "没有打开的应用窗口。";

  return (
    <div className="pointer-events-none absolute inset-0 z-[9] flex items-center justify-center px-8 pb-24 pt-14 text-center max-md:relative max-md:min-h-[260px] max-md:p-5">
      <div className="pointer-events-auto w-full max-w-[760px]">
        <div className="mb-4 flex items-center justify-center gap-2 text-(--text-soft)">
          <LayoutGrid className="h-4 w-4" />
          <div className="text-left">
            <p className="text-[13px] font-black tracking-[-0.02em] text-(--text-strong)">{title}</p>
            <p className="text-[10px] leading-4">{detail}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {recoverable_windows.slice(0, 6).map((window) => (
            <MissionControlTile
              key={window.id}
              on_restore={on_restore}
              window={window}
            />
          ))}
        </div>
        <button
          className="mt-4 inline-flex h-8 items-center justify-center rounded-full border border-white/64 bg-white/58 px-3 text-[11px] font-bold text-(--text-strong) shadow-[0_8px_24px_rgba(18,28,42,0.08)] transition hover:bg-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]"
          onClick={on_restore_all}
          type="button"
        >
          恢复所有窗口
        </button>
      </div>
    </div>
  );
}

function MissionControlTile({
  on_restore,
  window,
}: {
  on_restore: (window_id: string) => void;
  window: StageWindowState;
}) {
  const Icon = icon_for_window_kind(window.kind);
  const app_label = stage_app_label_for_window_kind(window.kind);
  const title = display_window_title(window);
  const state_label = window.phase === "closed" ? "已关闭" : "已最小化";

  return (
    <button
      aria-label={`恢复 ${app_label}：${title}`}
      className="group min-w-0 rounded-[16px] border border-white/54 bg-white/36 p-2 text-left shadow-[0_20px_50px_rgba(18,28,42,0.10),inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/58 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.38)]"
      onClick={() => on_restore(window.id)}
      type="button"
    >
      <div className="relative h-24 overflow-hidden rounded-[10px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(231,238,247,0.70))]">
        <div className="flex h-5 items-center gap-1 border-b border-white/52 bg-white/50 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(223,93,98,0.68)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(223,157,46,0.72)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(47,184,132,0.68)]" />
        </div>
        <div className="grid h-[calc(100%-1.25rem)] place-items-center text-(--icon-muted)">
          <Icon className="h-7 w-7 transition group-hover:scale-105" />
        </div>
        <span className="absolute bottom-2 right-2 rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold text-(--text-soft)">
          {state_label}
        </span>
      </div>
      <div className="mt-2 min-w-0 px-0.5">
        <p className="truncate text-[11px] font-black text-(--text-strong)">{title}</p>
        <p className="truncate text-[10px] font-semibold text-(--text-soft)">{app_label}</p>
      </div>
    </button>
  );
}

export function StageWindowDock({
  active_window_id,
  on_restore_all,
  windows,
  on_restore,
}: {
  active_window_id: string | null;
  on_restore_all: () => void;
  windows: StageWindowState[];
  on_restore: (window_id: string) => void;
}) {
  if (!windows.length) {
    return null;
  }

  const running_windows = windows.filter((window) => (
    window.phase !== "closed" && window.phase !== "minimized"
  ));
  const minimized_windows = windows.filter((window) => window.phase === "minimized");
  const dock_apps = build_dock_app_slots(group_dock_windows_by_app(windows, active_window_id));
  const active_window = running_windows.find((window) => window.id === active_window_id)
    ?? running_windows[0]
    ?? minimized_windows[0]
    ?? null;
  const active_app_label = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 flex justify-center max-md:relative max-md:inset-x-auto max-md:bottom-auto max-md:mt-3">
      <div className="flex max-w-full flex-col items-center gap-1.5">
        <div className="operation-window-dock soft-scrollbar flex max-w-full items-end gap-2 overflow-x-auto rounded-[26px] border border-white/70 bg-[rgba(255,255,255,0.60)] px-2.5 py-2 shadow-[0_24px_60px_rgba(18,28,42,0.18),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-2xl">
          <button
            aria-label="恢复 Nexus 工作现场"
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[17px] border border-white/60 bg-[linear-gradient(135deg,rgba(91,114,255,0.18),rgba(255,255,255,0.74),rgba(79,162,159,0.14))] text-[13px] font-black text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition hover:-translate-y-1 hover:scale-105 hover:bg-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]"
            onClick={on_restore_all}
            title={active_window ? `${active_app_label} · ${display_window_title(active_window)}` : "Nexus"}
            type="button"
          >
            N
          </button>
          <div className="h-9 w-px shrink-0 bg-white/56" />
        {dock_apps.map(({ app_label, count, is_active, is_running, kind, window }) => {
          const Icon = icon_for_window_kind(window?.kind ?? kind);
          const window_title = window ? display_window_title(window) : "等待工具调用";
          const state_label = is_active ? "当前" : is_running ? "后台" : window ? "可重新打开" : "未打开";
          const title = !window
            ? `${app_label} · 未打开`
            : count > 1
              ? `${app_label} · ${count} 个窗口 · ${state_label}`
              : `${app_label} · ${window_title} · ${state_label}`;
          return (
            <button
              aria-label={`${state_label}：${app_label}`}
              className={cn(
                "group relative grid shrink-0 place-items-center rounded-[18px] border text-left transition duration-200 ease-out hover:-translate-y-2 hover:scale-110 focus-visible:-translate-y-2 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]",
                is_active
                  ? "h-[52px] w-[52px] border-[rgba(91,114,255,0.32)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_16px_32px_rgba(91,114,255,0.22)]"
                  : is_running
                    ? "h-[44px] w-[44px] border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/72 hover:text-(--text-strong)"
                    : "h-[44px] w-[44px] border-transparent bg-white/20 text-(--icon-muted) opacity-55 hover:bg-white/42 hover:opacity-80",
              )}
              key={app_label}
              disabled={!window}
              onClick={() => window && on_restore(window.id)}
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
                {is_running ? (
                  <span className={cn(
                    "absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/72 transition",
                    is_active
                      ? "bg-[color:var(--primary)]"
                      : "bg-[rgba(47,184,132,0.72)]",
                  )} />
                ) : null}
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
                    : is_running
                      ? "w-2 bg-[rgba(47,184,132,0.54)]"
                      : "w-0 bg-transparent",
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
  is_running: boolean;
  window: StageWindowState;
}

interface DockAppSlot {
  app_label: string;
  count: number;
  is_active: boolean;
  is_running: boolean;
  kind: StageWindowKind;
  window: StageWindowState | null;
}

function build_dock_app_slots(app_groups: DockAppGroup[]): DockAppSlot[] {
  const groups_by_label = new Map(app_groups.map((app) => [app.app_label, app]));
  const pinned_labels = new Set(PINNED_DOCK_APPS.map((app) => app.app_label));
  const pinned_slots = PINNED_DOCK_APPS.map((app): DockAppSlot => {
    const group = groups_by_label.get(app.app_label);
    return {
      app_label: app.app_label,
      count: group?.count ?? 0,
      is_active: Boolean(group?.is_active),
      is_running: Boolean(group?.is_running),
      kind: group?.window.kind ?? app.kind,
      window: group?.window ?? null,
    };
  });
  const extra_slots = app_groups
    .filter((app) => !pinned_labels.has(app.app_label))
    .map((app): DockAppSlot => ({
      app_label: app.app_label,
      count: app.count,
      is_active: app.is_active,
      is_running: app.is_running,
      kind: app.window.kind,
      window: app.window,
    }));

  return [...pinned_slots, ...extra_slots];
}

function group_dock_windows_by_app(
  windows: StageWindowState[],
  active_window_id: string | null,
): DockAppGroup[] {
  const groups = new Map<string, DockAppGroup>();

  for (const window of windows) {
    const app_label = stage_app_label_for_window_kind(window.kind);
    const existing = groups.get(app_label);
    const is_active = window.id === active_window_id;
    const is_running = window.phase !== "closed";
    if (!existing) {
      groups.set(app_label, {
        app_label,
        count: is_running ? 1 : 0,
        is_active,
        is_running,
        window,
      });
      continue;
    }
    const had_running_window = existing.is_running;
    existing.count += is_running ? 1 : 0;
    existing.is_active = existing.is_active || is_active;
    existing.is_running = existing.is_running || is_running;
    if (is_active || (!had_running_window && is_running)) {
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
