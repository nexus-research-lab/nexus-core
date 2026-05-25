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
import {
  build_dock_app_slots,
  group_dock_windows_by_app,
} from "./operation-stage-dock-model";
import { summarize_hidden_stage_windows } from "./operation-stage-hidden-windows";

const PINNED_DOCK_APPS: Array<{ app_label: string; kind: StageWindowKind }> = [
  { app_label: "访达", kind: "finder" },
  { app_label: "Safari", kind: "browser" },
  { app_label: "终端", kind: "terminal" },
  { app_label: "Code", kind: "code_editor" },
  { app_label: "控制台", kind: "run_manifest" },
  { app_label: "预览", kind: "image_viewer" },
];

export function StageWindowsHiddenState({
  windows,
  on_restore_all,
}: {
  windows: StageWindowState[];
  on_restore_all: () => void;
}) {
  const summary = summarize_hidden_stage_windows(windows);

  return (
    <div className="pointer-events-none absolute inset-0 z-[9] px-6 pb-24 pt-12 max-md:relative max-md:min-h-[220px] max-md:p-5">
      <div className="pointer-events-auto absolute bottom-24 left-6 max-w-[260px] rounded-[14px] border border-white/58 bg-white/36 px-3 py-2 text-left text-(--text-soft) shadow-[0_12px_34px_rgba(18,28,42,0.08)] backdrop-blur-xl max-md:static max-md:mx-auto max-md:mt-20">
        <p className="text-[11px] font-black text-(--text-strong)">桌面已清空</p>
        <p className="mt-0.5 text-[10px] font-semibold leading-4">
          {summary.label}
        </p>
        <button
          className="mt-2 inline-flex h-7 items-center justify-center rounded-full border border-white/64 bg-white/50 px-2.5 text-[10px] font-bold text-(--text-strong) transition hover:bg-white/76 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]"
          onClick={on_restore_all}
          type="button"
        >
          从 Dock 恢复全部
        </button>
      </div>
    </div>
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
  const dock_apps = build_dock_app_slots(
    group_dock_windows_by_app(windows, active_window_id, stage_app_label_for_window_kind),
    PINNED_DOCK_APPS,
  );
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
          const state_label = is_active
            ? "当前"
            : window?.phase === "minimized"
              ? "已最小化"
              : is_running ? "后台" : window ? "可重新打开" : "未打开";
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
                "relative grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[14px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_8px_18px_rgba(18,28,42,0.10)]",
                dock_icon_skin_for_kind(window?.kind ?? kind),
                is_active ? "ring-2 ring-[rgba(91,114,255,0.24)]" : "ring-0",
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

function display_window_title(window: StageWindowState): string {
  if (!is_low_signal_director_value(window.title)) {
    return window.title;
  }
  return display_stage_event_title(window.payload.event, stage_app_label_for_window_kind(window.kind));
}

function dock_icon_skin_for_kind(kind: StageWindowKind): string {
  if (kind === "finder") {
    return "border-[rgba(72,152,224,0.42)] bg-[linear-gradient(135deg,#5ac8fa_0%,#e8f5ff_48%,#ffffff_49%,#7dd3fc_100%)] text-[#14517a]";
  }
  if (kind === "browser") {
    return "border-[rgba(72,152,224,0.36)] bg-[radial-gradient(circle_at_50%_50%,#ffffff_0_24%,#5ac8fa_25%_52%,#2f6dff_53%_70%,#f45b69_71%_100%)] text-white";
  }
  if (kind === "terminal") {
    return "border-[rgba(141,224,173,0.32)] bg-[linear-gradient(135deg,#111827,#05080d)] text-[#8de0ad]";
  }
  if (kind === "code_editor") {
    return "border-[rgba(91,114,255,0.36)] bg-[linear-gradient(135deg,#243b74,#4f6fff)] text-white";
  }
  if (kind === "run_manifest" || kind === "evidence") {
    return "border-[rgba(117,131,149,0.30)] bg-[linear-gradient(135deg,#f8fafc,#cbd5e1)] text-[#334155]";
  }
  if (kind === "image_viewer" || kind === "markdown_reader" || kind === "pdf_reader" || kind === "word_reader") {
    return "border-[rgba(47,184,132,0.32)] bg-[linear-gradient(135deg,#ffffff,#a7f3d0_52%,#60a5fa)] text-[#17644f]";
  }
  if (kind === "permission_wait") {
    return "border-[rgba(117,131,149,0.34)] bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] text-[#475569]";
  }
  if (kind === "task_board") {
    return "border-[rgba(47,184,132,0.34)] bg-[linear-gradient(135deg,#08111f,#123f3a)] text-[#8de0ad]";
  }
  if (kind === "spreadsheet") {
    return "border-[rgba(47,184,132,0.34)] bg-[linear-gradient(135deg,#f0fdf4,#34d399)] text-[#064e3b]";
  }
  return "border-white/52 bg-white/44 text-(--icon-muted)";
}
