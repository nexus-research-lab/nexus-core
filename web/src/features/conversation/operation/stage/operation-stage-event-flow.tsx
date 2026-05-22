import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { build_operation_live_episode } from "../operation-stage-experience";
import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import {
  build_operation_input_rows,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import { icon_for_operation_kind } from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

export function StageNarrativeRail({
  events,
  active_event_id,
  active_window,
  narrative,
  on_focus_event,
  revealed_window_count,
  snapshot,
  total_window_count,
}: {
  events: NexusOperationEvent[];
  active_event_id: string;
  active_window: StageWindowState | null;
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
  revealed_window_count: number;
  snapshot: NexusOperationSnapshot | null;
  total_window_count: number;
}) {
  if (!events.length) {
    return null;
  }

  const active_event = events.find((item) => item.id === active_event_id) ?? events.at(-1) ?? null;
  const active_phase_meta = active_event ? PHASE_STATUS_META[active_event.phase] : null;
  const ActivePhaseIcon = active_phase_meta?.Icon ?? Activity;
  const settled_count = events.filter((item) => item.id !== active_event_id && (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;
  const active_target = active_event?.target ?? active_event?.summary ?? active_window?.title ?? active_event?.title;
  const episode = active_event
    ? build_operation_live_episode(active_event, events, snapshot)
    : null;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[76px] left-4 z-30 w-[min(390px,calc(100%-2rem))] max-md:relative max-md:bottom-auto max-md:left-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="rounded-[16px] border border-white/66 bg-white/54 p-2.5 shadow-[0_18px_46px_rgba(18,28,42,0.10)] backdrop-blur-xl">
        {active_event ? (
          <div className="mb-2.5 rounded-[12px] border border-white/54 bg-white/46 p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border",
                  active_phase_meta?.class_name,
                )}>
                  <ActivePhaseIcon className={cn("h-3.5 w-3.5", active_event.phase === "running" && "animate-spin")} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-black text-(--text-strong)">
                    当前工具 · {active_event.tool_name ?? active_event.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-(--text-soft)">
                    {active_target}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/64 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
                {active_phase_meta?.label ?? narrative.label}
              </span>
            </div>
            <div className="mt-2 grid min-w-0 grid-cols-3 gap-1.5 overflow-hidden text-center text-[9px] font-semibold text-(--text-soft)">
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="text-[11px] font-black text-(--text-strong)">{settled_count}</div>
                <div>已沉淀</div>
              </div>
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="truncate text-[11px] font-black text-(--text-strong)">{active_window?.title ?? "-"}</div>
                <div>窗口焦点</div>
              </div>
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="text-[11px] font-black text-(--text-strong)">
                  {Math.min(revealed_window_count, total_window_count)}/{total_window_count}
                </div>
                <div>现场窗口</div>
              </div>
            </div>
          </div>
        ) : null}
        {episode ? (
          <div className="mb-2.5 rounded-[12px] border border-[rgba(91,114,255,0.15)] bg-[rgba(91,114,255,0.06)] p-2.5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                  {episode.status_label}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-(--text-soft)">
                  {episode.active_tool_label} · {episode.active_target}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/58 px-2 py-1 text-[9px] font-bold text-(--text-soft)">
                {episode.progress_label}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5 text-[9.5px] max-sm:grid-cols-1">
              <div className="min-w-0 rounded-[9px] bg-white/34 px-2 py-1.5">
                <p className="font-bold text-(--text-soft)">刚刚沉淀</p>
                <p className="mt-0.5 truncate font-semibold text-(--text-strong)">{episode.previous_label}</p>
              </div>
              <div className="min-w-0 rounded-[9px] bg-white/34 px-2 py-1.5">
                <p className="font-bold text-(--text-soft)">下一拍</p>
                <p className="mt-0.5 truncate font-semibold text-(--text-strong)">{episode.next_label}</p>
              </div>
            </div>
          </div>
        ) : null}
        {active_event ? (
          <StageEventIOTrace active_event={active_event} active_window={active_window} />
        ) : null}
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold text-(--text-soft)">
          <span>事件流</span>
          <span>{events.length} 步 · {Math.min(revealed_window_count, total_window_count)}/{total_window_count}</span>
        </div>
        <StageEventBeatList
          active_event_id={active_event_id}
          events={events}
          on_focus_event={on_focus_event}
        />
        <div className="flex min-w-0 max-w-full gap-1.5 overflow-hidden">
          {events.slice(-7).map((item, index) => {
            const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
            const Icon = icon_for_operation_kind(item.kind);
            const is_active = item.id === active_event_id;
            return (
              <button
                aria-label={`聚焦执行事件 ${index + 1}：${profile.action_label} ${item.tool_name ?? item.title}`}
                className={cn(
                  "group relative flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-[11px] border px-2 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                  is_active
                    ? "border-[rgba(91,114,255,0.28)] bg-[rgba(91,114,255,0.13)] text-[color:var(--primary)]"
                    : "border-white/50 bg-white/36 text-(--text-muted)",
                )}
                key={item.id}
                onClick={() => on_focus_event?.(item)}
                title={`${index + 1}. ${profile.action_label} · ${item.tool_name ?? item.title}`}
                type="button"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/64">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate text-[10px] font-semibold">
                  {profile.action_label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageEventIOTrace({
  active_event,
  active_window,
}: {
  active_event: NexusOperationEvent;
  active_window: StageWindowState | null;
}) {
  const profile = resolve_operation_tool_profile(active_event.tool_name, active_event.kind, active_event.surface);
  const input_rows = build_operation_input_rows(active_event.input_preview, profile.target_keys, 2);
  const input_label = input_rows[0]
    ? `${input_rows[0].label}: ${input_rows[0].value}`
    : active_event.target ?? active_event.summary ?? active_event.title;
  const output_label = resolve_event_output_label(active_event);
  const window_label = active_window
    ? `${SURFACE_LABEL[active_event.surface]} -> ${active_window.title}`
    : `${SURFACE_LABEL[active_event.surface]} -> 等待窗口`;

  return (
    <div className="mb-2.5 rounded-[12px] border border-white/54 bg-white/36 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-[9.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
          执行轨迹
        </p>
        <span className="shrink-0 rounded-full bg-white/58 px-2 py-1 text-[8.5px] font-bold text-(--text-soft)">
          {profile.action_label}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 text-[9.5px] max-sm:grid-cols-1">
        <TraceCell label="输入" value={input_label} />
        <TraceArrow />
        <TraceCell label="窗口" value={window_label} />
        <TraceArrow />
        <TraceCell label="沉淀" value={output_label} />
      </div>
      {input_rows.length > 1 ? (
        <div className="mt-1.5 flex min-w-0 gap-1.5 overflow-hidden text-[8.5px] font-semibold text-(--text-soft)">
          {input_rows.slice(1).map((row) => (
            <span className="truncate rounded-full bg-white/42 px-2 py-1" key={row.key}>
              {row.label}: {row.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TraceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[9px] border border-white/48 bg-white/40 px-2 py-1.5">
      <p className="text-[8px] font-black uppercase tracking-[0.10em] text-(--text-soft)">{label}</p>
      <p className="mt-0.5 truncate text-[9.5px] font-semibold text-(--text-strong)">{value}</p>
    </div>
  );
}

function TraceArrow() {
  return (
    <div className="grid place-items-center text-[10px] font-black text-(--text-soft) max-sm:hidden">
      -&gt;
    </div>
  );
}

function resolve_event_output_label(event: NexusOperationEvent): string {
  const evidence = event.evidence?.find((item) => item.value || item.label);
  const result_label = compact_result_label(event.result_preview);
  if (event.phase === "running") {
    return event.surface === "terminal" ? "等待 stdout/stderr" : "等待工具结果";
  }
  if (event.phase === "waiting") {
    return "等待确认";
  }
  if (event.phase === "error") {
    return result_label ?? evidence?.value ?? evidence?.label ?? event.summary ?? "异常证据";
  }
  if (event.surface === "terminal") {
    return result_label ?? evidence?.value ?? evidence?.label ?? event.summary ?? "命令结果";
  }
  return evidence?.value ?? evidence?.label ?? event.summary ?? result_label ?? event.title;
}

function compact_result_label(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim().split(/\r?\n/).find(Boolean)?.slice(0, 120) ?? null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => compact_result_label(item)).find(Boolean) ?? null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["stderr", "stdout", "output", "content", "error", "message", "result", "text"]) {
      const label = compact_result_label(record[key]);
      if (label) {
        return label;
      }
    }
  }
  try {
    return JSON.stringify(value).slice(0, 120);
  } catch {
    return String(value).slice(0, 120);
  }
}

function StageEventBeatList({
  active_event_id,
  events,
  on_focus_event,
}: {
  active_event_id: string;
  events: NexusOperationEvent[];
  on_focus_event?: (event: NexusOperationEvent) => void;
}) {
  const visible_events = events.slice(-5);
  const active_index = Math.max(0, visible_events.findIndex((item) => item.id === active_event_id));

  return (
    <div className="mb-2 space-y-1.5">
      {visible_events.map((item, index) => {
        const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
        const Icon = icon_for_operation_kind(item.kind);
        const phase_meta = PHASE_STATUS_META[item.phase];
        const PhaseIcon = phase_meta.Icon;
        const is_active = item.id === active_event_id;
        const beat = event_beat_state(item, index, active_index);
        const target = item.target ?? item.summary ?? item.title;

        return (
          <button
            aria-label={`回放第 ${events.length - visible_events.length + index + 1} 步：${profile.action_label} ${item.tool_name ?? item.title}`}
            className={cn(
              "group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[11px] border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.24)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
              is_active
                ? "border-[rgba(91,114,255,0.30)] bg-[rgba(91,114,255,0.12)]"
                : beat.tone === "settled"
                  ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.06)]"
                  : "border-white/44 bg-white/28",
            )}
            key={item.id}
            onClick={() => on_focus_event?.(item)}
            type="button"
          >
            <span className={cn(
              "relative grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border",
              is_active
                ? "border-[rgba(91,114,255,0.28)] bg-white/68 text-[color:var(--primary)]"
                : beat.tone === "settled"
                  ? "border-[rgba(47,184,132,0.18)] bg-white/58 text-[color:var(--success)]"
                  : phase_meta.class_name,
            )}>
              <Icon className="h-3.5 w-3.5" />
              {index > 0 ? (
                <span className={cn(
                  "absolute -left-[9px] top-1/2 h-px w-[9px]",
                  beat.tone === "settled" ? "bg-[rgba(47,184,132,0.42)]" : "bg-white/54",
                )} />
              ) : null}
            </span>

            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[10px] font-black text-(--text-strong)">
                  {profile.action_label} · {item.tool_name ?? item.title}
                </span>
                <span className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[8px] font-black",
                  beat.tone === "active"
                    ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                    : beat.tone === "settled"
                      ? "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                      : "bg-white/52 text-(--text-soft)",
                )}>
                  {beat.label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[9px] font-semibold text-(--text-soft)">
                {target}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <span className="hidden rounded-full bg-white/48 px-1.5 py-px text-[8px] font-bold text-(--text-soft) sm:inline">
                {SURFACE_LABEL[item.surface]}
              </span>
              <span className={cn("grid h-5 w-5 place-items-center rounded-full border", phase_meta.class_name)}>
                <PhaseIcon className={cn("h-3 w-3", item.phase === "running" && is_active && "animate-spin")} />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function event_beat_state(
  event: NexusOperationEvent,
  index: number,
  active_index: number,
): { label: string; tone: "active" | "settled" | "pending" } {
  if (index === active_index) {
    return {
      label: event.phase === "waiting" ? "等待确认" : "当前聚焦",
      tone: "active",
    };
  }
  if (index < active_index || event.phase === "done" || event.phase === "cancelled" || event.phase === "error") {
    return {
      label: event.phase === "error" || event.phase === "cancelled" ? "异常沉淀" : "已沉淀",
      tone: "settled",
    };
  }
  return {
    label: "待接续",
    tone: "pending",
  };
}

export function StageOperationRunway({
  events,
  active_event_id,
  narrative,
  on_focus_event,
}: {
  events: NexusOperationEvent[];
  active_event_id: string;
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
}) {
  if (events.length <= 1) {
    return null;
  }

  const runway_events = events.slice(-6);
  const active_index = Math.max(0, runway_events.findIndex((item) => item.id === active_event_id));
  const progress_percent = runway_events.length <= 1
    ? 100
    : Math.round((active_index / (runway_events.length - 1)) * 100);

  return (
    <div className="operation-stage-mobile-panel absolute left-1/2 top-3 z-20 w-[min(430px,34vw)] -translate-x-1/2 max-xl:top-[92px] max-xl:w-[min(430px,calc(100%-2rem))] max-md:relative max-md:left-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:translate-x-0 max-md:overflow-hidden">
      <div className="rounded-[15px] border border-white/62 bg-white/42 px-3 py-2 shadow-[0_16px_42px_rgba(18,28,42,0.09)] backdrop-blur-xl">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[9.5px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
          <span>工作台航线</span>
          <span className="normal-case tracking-normal">{narrative.label}</span>
        </div>
        <div className="relative">
          <div className="absolute left-3.5 right-3.5 top-[14px] h-px bg-white/64" />
          <div
            className="absolute left-3.5 top-[14px] h-px bg-[linear-gradient(90deg,rgba(91,114,255,0.68),rgba(47,184,132,0.58))] transition-[width] duration-500"
            style={{ width: `calc((100% - 1.75rem) * ${progress_percent / 100})` }}
          />
          <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${runway_events.length}, minmax(0, 1fr))` }}>
            {runway_events.map((item, index) => {
              const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
              const Icon = icon_for_operation_kind(item.kind);
              const phase_meta = PHASE_STATUS_META[item.phase];
              const is_active = item.id === active_event_id;
              const is_settled = index < active_index || item.phase === "done" || item.phase === "cancelled";
              return (
                <button
                  aria-label={`聚焦工作台航线 ${index + 1}：${profile.action_label} ${item.tool_name ?? item.title}`}
                  className="min-w-0 rounded-[12px] text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]"
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${index + 1}. ${profile.action_label} · ${item.tool_name ?? item.title}`}
                  type="button"
                >
                  <div className={cn(
                    "mx-auto grid h-7 w-7 place-items-center rounded-[10px] border shadow-[0_8px_18px_rgba(18,28,42,0.08)] transition",
                    is_active
                      ? "scale-110 border-[rgba(91,114,255,0.36)] bg-[rgba(91,114,255,0.17)] text-[color:var(--primary)]"
                      : is_settled
                        ? "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                        : phase_meta.class_name,
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", item.phase === "running" && is_active && "animate-spin")} />
                  </div>
                  <p className={cn(
                    "mt-1 truncate text-[9px] font-black",
                    is_active ? "text-(--text-strong)" : "text-(--text-soft)",
                  )}>
                    {profile.action_label}
                  </p>
                  <p className="truncate text-[8px] font-semibold text-(--text-soft)">
                    {item.tool_name ?? SURFACE_LABEL[item.surface]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
