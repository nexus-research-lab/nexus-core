import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { build_operation_event_io_summary } from "../operation-event-io";
import { build_operation_live_episode } from "../operation-stage-experience";
import {
  display_stage_event_target,
  display_stage_event_title,
} from "../operation-stage-labels";
import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import type { StageEpisodeMap } from "./operation-stage-episodes";
import { episode_tone } from "./operation-stage-episodes";
import { icon_for_operation_kind } from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

export function StageNarrativeRail({
  events,
  active_event_id,
  active_window,
  narrative,
  on_focus_event,
  episodes,
  revealed_window_count,
  snapshot,
  total_window_count,
}: {
  events: NexusOperationEvent[];
  active_event_id: string;
  active_window: StageWindowState | null;
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
  episodes: StageEpisodeMap;
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
  const active_target = active_event
    ? display_stage_event_target(active_event, SURFACE_LABEL[active_event.surface])
    : active_window?.title;
  const episode = active_event
    ? build_operation_live_episode(active_event, events, snapshot)
    : null;
  const active_episode = episodes.active_episode;

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
                    当前工具 · {display_stage_event_title(active_event, SURFACE_LABEL[active_event.surface])}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-(--text-soft)">
                    {active_episode?.detail ?? active_target}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/64 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
                {active_phase_meta?.label ?? narrative.label}
              </span>
            </div>
            <div className="mt-2 grid min-w-0 grid-cols-3 gap-1.5 overflow-hidden text-center text-[9px] font-semibold text-(--text-soft)">
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="text-[11px] font-black text-(--text-strong)">{episodes.settled_count || settled_count}</div>
                <div>已沉淀</div>
              </div>
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="truncate text-[11px] font-black text-(--text-strong)">{active_window?.title ?? "-"}</div>
                <div>窗口焦点</div>
              </div>
              <div className="rounded-[8px] bg-white/44 px-1.5 py-1.5">
                <div className="text-[11px] font-black text-(--text-strong)">
                  {episodes.progress_label}
                </div>
                <div>执行进度</div>
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
          episodes={episodes}
          on_focus_event={on_focus_event}
        />
        <div className="flex min-w-0 max-w-full gap-1.5 overflow-hidden">
          {events.slice(-7).map((item, index) => {
            const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
            const Icon = icon_for_operation_kind(item.kind);
            const is_active = item.id === active_event_id;
            const event_title = display_stage_event_title(item, profile.action_label);
            return (
              <button
                aria-label={`聚焦执行事件 ${index + 1}：${profile.action_label} ${event_title}`}
                className={cn(
                  "group relative flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-[11px] border px-2 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                  is_active
                    ? "border-[rgba(91,114,255,0.28)] bg-[rgba(91,114,255,0.13)] text-[color:var(--primary)]"
                    : "border-white/50 bg-white/36 text-(--text-muted)",
                )}
                key={item.id}
                onClick={() => on_focus_event?.(item)}
                title={`${index + 1}. ${profile.action_label} · ${event_title}`}
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
  const io_summary = build_operation_event_io_summary(active_event);
  const output_label = io_summary.output_label ?? "等待沉淀";
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
          {io_summary.action_label}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 text-[9.5px] max-sm:grid-cols-1">
        <TraceCell label="输入" value={io_summary.input_label} />
        <TraceArrow />
        <TraceCell label="窗口" value={window_label} />
        <TraceArrow />
        <TraceCell label="沉淀" value={output_label} />
      </div>
      {io_summary.input_detail && io_summary.input_detail !== io_summary.input_label ? (
        <div className="mt-1.5 flex min-w-0 gap-1.5 overflow-hidden text-[8.5px] font-semibold text-(--text-soft)">
          <span className="truncate rounded-full bg-white/42 px-2 py-1">{io_summary.input_detail}</span>
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

function StageEventBeatList({
  active_event_id,
  episodes,
  on_focus_event,
}: {
  active_event_id: string;
  episodes: StageEpisodeMap;
  on_focus_event?: (event: NexusOperationEvent) => void;
}) {
  const visible_episodes = episodes.episodes.slice(-5);

  return (
    <div className="mb-2 space-y-1.5">
      {visible_episodes.map((episode) => {
        const item = episode.event;
        const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
        const Icon = icon_for_operation_kind(item.kind);
        const phase_meta = PHASE_STATUS_META[item.phase];
        const PhaseIcon = phase_meta.Icon;
        const is_active = item.id === active_event_id;
        const tone = episode_tone(episode.state);
        const event_title = display_stage_event_title(item, profile.action_label);
        const target = display_stage_event_target(item, profile.action_label);

        return (
          <button
            aria-label={`回放第 ${episode.index + 1} 步：${profile.action_label} ${event_title}`}
            className={cn(
              "group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[11px] border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.24)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
              is_active
                ? "border-[rgba(91,114,255,0.30)] bg-[rgba(91,114,255,0.12)]"
                : tone === "settled"
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
                : tone === "settled"
                  ? "border-[rgba(47,184,132,0.18)] bg-white/58 text-[color:var(--success)]"
                  : phase_meta.class_name,
            )}>
              <Icon className="h-3.5 w-3.5" />
              {episode.index > 0 ? (
                <span className={cn(
                  "absolute -left-[9px] top-1/2 h-px w-[9px]",
                  tone === "settled" ? "bg-[rgba(47,184,132,0.42)]" : "bg-white/54",
                )} />
              ) : null}
            </span>

            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[10px] font-black text-(--text-strong)">
                  {profile.action_label} · {event_title}
                </span>
                <span className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[8px] font-black",
                  tone === "active"
                    ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                    : tone === "settled"
                      ? "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                      : "bg-white/52 text-(--text-soft)",
                )}>
                  {episode.state_label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[9px] font-semibold text-(--text-soft)">
                {episode.detail || target}
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

export function StageOperationRunway({
  events,
  active_event_id,
  narrative,
  on_focus_event,
  episodes,
}: {
  events: NexusOperationEvent[];
  active_event_id: string;
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
  episodes: StageEpisodeMap;
}) {
  if (events.length <= 1) {
    return null;
  }

  const runway_episodes = episodes.episodes.slice(-6);
  const active_index = Math.max(0, runway_episodes.findIndex((item) => item.id === active_event_id));
  const progress_percent = runway_episodes.length <= 1
    ? 100
    : Math.round((active_index / (runway_episodes.length - 1)) * 100);

  return (
    <div className="operation-stage-mobile-panel absolute left-1/2 top-3 z-20 w-[min(430px,34vw)] -translate-x-1/2 max-xl:top-[92px] max-xl:w-[min(430px,calc(100%-2rem))] max-md:relative max-md:left-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:translate-x-0 max-md:overflow-hidden">
      <div className="rounded-[15px] border border-white/62 bg-white/42 px-3 py-2 shadow-[0_16px_42px_rgba(18,28,42,0.09)] backdrop-blur-xl">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[9.5px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
          <span>工作台航线</span>
          <span className="normal-case tracking-normal">
            {episodes.progress_label} · {narrative.label}
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-3.5 right-3.5 top-[14px] h-px bg-white/64" />
          <div
            className="absolute left-3.5 top-[14px] h-px bg-[linear-gradient(90deg,rgba(91,114,255,0.68),rgba(47,184,132,0.58))] transition-[width] duration-500"
            style={{ width: `calc((100% - 1.75rem) * ${progress_percent / 100})` }}
          />
          <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${runway_episodes.length}, minmax(0, 1fr))` }}>
            {runway_episodes.map((episode) => {
              const item = episode.event;
              const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
              const Icon = icon_for_operation_kind(item.kind);
              const phase_meta = PHASE_STATUS_META[item.phase];
              const is_active = item.id === active_event_id;
              const tone = episode_tone(episode.state);
              const is_settled = tone === "settled";
              const event_title = display_stage_event_title(item, profile.action_label);
              return (
                <button
                  aria-label={`聚焦工作台航线 ${episode.index + 1}：${profile.action_label} ${event_title}`}
                  className="min-w-0 rounded-[12px] text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]"
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${episode.index + 1}. ${profile.action_label} · ${event_title}`}
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
                  <p className={cn(
                    "mx-auto mt-0.5 w-fit max-w-full truncate rounded-full px-1.5 py-px text-[7.5px] font-black",
                    tone === "active"
                      ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                      : tone === "settled"
                        ? "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                        : "bg-white/48 text-(--text-soft)",
                  )}>
                    {episode.state_label}
                  </p>
                  <p className="truncate text-[8px] font-semibold text-(--text-soft)">
                    {event_title}
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
