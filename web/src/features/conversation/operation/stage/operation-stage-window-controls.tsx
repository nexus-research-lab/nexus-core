import {
  Maximize2,
  PauseCircle,
  RotateCcw,
} from "lucide-react";
import { memo } from "react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent } from "../operation-types";
import {
  event_sequence_label,
  icon_for_window_kind,
  is_low_signal_director_value,
  stage_app_label_for_window_kind,
} from "./operation-stage-helpers";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

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
        <p className="text-[15px] font-black tracking-[-0.025em] text-(--text-strong)">窗口已全部收起</p>
        <p className="mt-2 text-[11px] leading-5 text-(--text-soft)">
          {window_count} 个执行窗口仍在 Dock 中，可以恢复继续查看。
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

export function StageWindowControls({
  active_window,
  has_layout_changes,
  has_position_changes,
  on_reset_positions,
  on_restore_all,
  visible_window_count,
  window_count,
}: {
  active_window: StageWindowState | null;
  has_layout_changes: boolean;
  has_position_changes: boolean;
  on_reset_positions: () => void;
  on_restore_all: () => void;
  visible_window_count: number;
  window_count: number;
}) {
  if (!window_count) {
    return null;
  }

  return (
    <div
      aria-label={`${active_window ? stage_app_label_for_window_kind(active_window.kind) : "工作台"}，${visible_window_count}/${window_count} 个窗口`}
      className="absolute right-5 top-20 z-30 flex items-center gap-1 rounded-full border border-white/70 bg-white/58 p-1 shadow-[0_18px_44px_rgba(18,28,42,0.10)] backdrop-blur-2xl max-md:hidden"
    >
      <button
        aria-label="恢复窗口布局"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full text-(--icon-default) transition hover:bg-(--surface-interactive-hover-background) hover:text-(--text-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.38)]",
          !has_position_changes && "pointer-events-none opacity-35",
        )}
        disabled={!has_position_changes}
        onClick={on_reset_positions}
        title="恢复窗口布局"
        type="button"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label="展开全部窗口"
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full text-(--icon-default) transition hover:bg-(--surface-interactive-hover-background) hover:text-(--text-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.38)]",
          !has_layout_changes && "pointer-events-none opacity-35",
        )}
        disabled={!has_layout_changes}
        onClick={on_restore_all}
        title="展开全部窗口"
        type="button"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StageWindowDock({
  active_window_id,
  events,
  windows,
  on_restore,
}: {
  active_window_id: string | null;
  events: NexusOperationEvent[];
  windows: StageWindowState[];
  on_restore: (window_id: string) => void;
}) {
  if (!windows.length) {
    return null;
  }

  const active_window = windows.find((window) => window.id === active_window_id) ?? windows[0];
  const settled_window_count = windows.filter((window) => window.phase === "closed" || window.phase === "minimized").length;
  const live_window_count = windows.length - settled_window_count;

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 flex justify-center max-md:relative max-md:inset-x-auto max-md:bottom-auto max-md:mt-3">
      <div className="flex max-w-full flex-col items-center gap-1.5">
        <div className="hidden max-w-[360px] rounded-full border border-white/60 bg-[rgba(20,28,38,0.72)] px-3 py-1.5 text-center text-white shadow-[0_14px_36px_rgba(18,28,42,0.18)] backdrop-blur-xl md:block">
          <p className="truncate text-[10px] font-bold">
            {active_window ? `${stage_app_label_for_window_kind(active_window.kind)} · ${active_window.title}` : "Nexus 工作台"}
          </p>
          <p className="mt-0.5 truncate text-[8.5px] font-semibold text-white/58">
            {live_window_count} 个现场 · {settled_window_count} 个沉淀
          </p>
        </div>
        <div className="operation-window-dock soft-scrollbar flex max-w-full items-end gap-2 overflow-x-auto rounded-[26px] border border-white/70 bg-[rgba(255,255,255,0.60)] px-2.5 py-2 shadow-[0_24px_60px_rgba(18,28,42,0.18),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-2xl">
          <div className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[17px] border border-white/60 bg-[linear-gradient(135deg,rgba(91,114,255,0.18),rgba(255,255,255,0.74),rgba(79,162,159,0.14))] text-[13px] font-black text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            N
          </div>
          <div className="h-9 w-px shrink-0 bg-white/56" />
        {windows.map((window) => {
          const Icon = icon_for_window_kind(window.kind);
          const is_active = active_window_id === window.id && window.phase !== "closed" && window.phase !== "minimized";
          const app_label = stage_app_label_for_window_kind(window.kind);
          const sequence_label = event_sequence_label(window.payload.event, events);
          const state_label = window.phase === "closed"
            ? "已关闭"
            : window.phase === "minimized"
              ? "已最小化"
              : is_active
                ? "当前"
                : "后台";
          return (
            <button
              aria-label={`${state_label}：${window.title}`}
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
              title={`${state_label}：${window.title}`}
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
                <span className="block max-w-[160px] truncate">{window.title}</span>
                <span className="block text-[9px] font-medium text-white/66">{sequence_label} · {app_label} · {state_label}</span>
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

export function StageFocusBeam() {
  return (
    <div className="pointer-events-none absolute inset-x-[14%] top-[50%] hidden h-px bg-gradient-to-r from-transparent via-[rgba(91,114,255,0.24)] to-transparent md:block">
      <span className="operation-focus-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--primary)]" />
    </div>
  );
}

export function WindowSettlementBar({
  active,
  event,
  sequence_label,
  tone,
}: {
  active: boolean;
  event: NexusOperationEvent;
  sequence_label: string;
  tone: "default" | "terminal";
}) {
  const phase_meta = PHASE_STATUS_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const evidence_count = event.evidence?.length ?? 0;
  const target_candidate = event.target ?? event.summary ?? event.title;
  const target = is_low_signal_director_value(target_candidate) ? event.title : target_candidate;
  const settled = event.phase === "done" || event.phase === "cancelled" || event.phase === "error";

  return (
    <div className={cn(
      "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-[9.5px]",
      tone === "terminal" ? "text-[#88a19a]" : "text-(--text-soft)",
    )}>
      <span className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 font-bold",
        tone === "terminal"
          ? settled
            ? "border-[#24463a] bg-[#14241d] text-[#8de0ad]"
            : "border-[#243545] bg-[#111b24] text-[#8bb7ff]"
          : phase_meta.class_name,
      )}>
        <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
        {settled ? "已沉淀" : phase_meta.label}
      </span>
      <span className="min-w-0 truncate font-semibold">{sequence_label} · {target}</span>
      <span className={cn(
        "shrink-0 rounded-full px-1.5 py-px font-bold",
        active
          ? tone === "terminal"
            ? "bg-[#17232c] text-[#b7cbc5]"
            : "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
          : tone === "terminal"
            ? "bg-[#111b24] text-[#60757f]"
            : "bg-white/56 text-(--text-soft)",
      )}>
        {evidence_count ? `${evidence_count} 证据` : SURFACE_LABEL[event.surface]}
      </span>
    </div>
  );
}

export const BackgroundWindowSummary = memo(function BackgroundWindowSummary({
  sequence_label,
  window,
}: {
  sequence_label: string;
  window: StageWindowState;
}) {
  const event = window.payload.event;
  const preview_candidate = window.payload.summary
    ?? event.summary
    ?? window.payload.target
    ?? window.target
    ?? event.target
    ?? event.title;
  const preview_text = is_low_signal_director_value(String(preview_candidate ?? ""))
    ? event.title
    : preview_candidate;
  const target_candidate = window.target ?? event.target ?? window.title;
  const target = is_low_signal_director_value(target_candidate) ? window.title : target_candidate;

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-3 rounded-[12px] border border-(--divider-subtle-color) bg-white/46 p-3">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black tracking-[-0.02em] text-(--text-strong)">
          {sequence_label} · {event.tool_name ?? event.title}
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-(--text-soft)">
          {String(preview_text ?? "等待窗口内容")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-(--text-soft)">
        <span className="truncate">{target}</span>
        <span className={cn(
          "shrink-0 rounded-full px-1.5 py-px font-semibold",
          event.phase === "running"
            ? "bg-[rgba(47,184,132,0.11)] text-[color:var(--success)]"
            : "bg-white/72 text-(--text-muted)",
        )}>
          {event.phase === "running" ? "执行中" : "已沉淀"}
        </span>
      </div>
    </div>
  );
});
