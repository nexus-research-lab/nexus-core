import {
  ArrowRight,
  CornerDownRight,
  Layers3,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { build_operation_event_io_summary } from "../operation-event-io";
import type { NexusOperationEvent } from "../operation-types";
import type { StageEpisodeMap } from "./operation-stage-episodes";
import { icon_for_operation_kind } from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

export function StageDirectorCue({
  active_event,
  active_window,
  episodes,
  is_replay,
  narrative,
}: {
  active_event: NexusOperationEvent;
  active_window: StageWindowState | null;
  episodes: StageEpisodeMap;
  is_replay: boolean;
  narrative: StageNarrativeState;
}) {
  if (narrative.phase === "completed" && !is_replay) {
    return null;
  }

  const active_episode = episodes.active_episode;
  const io_summary = build_operation_event_io_summary(active_event);
  const ToolIcon = icon_for_operation_kind(active_event.kind);
  const phase_meta = PHASE_STATUS_META[active_event.phase];
  const PhaseIcon = phase_meta.Icon;
  const cue_title = is_replay
    ? "回放这一拍"
    : narrative.phase === "awakening"
      ? "工具准备登场"
      : narrative.phase === "settling"
        ? "结果正在沉淀"
        : "当前工具接管";
  const window_label = active_window
    ? active_window.title
    : active_event.target ?? SURFACE_LABEL[active_event.surface];
  const output_label = io_summary.output_label ?? "等待输出";
  const target_label = active_episode?.target ?? active_event.target ?? active_event.summary ?? active_event.title;

  return (
    <div
      className="operation-stage-mobile-panel pointer-events-none absolute bottom-[118px] right-5 z-30 w-[min(340px,28vw)] max-xl:bottom-[112px] max-xl:w-[min(340px,calc(100%-2rem))] max-md:relative max-md:bottom-auto max-md:right-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full"
      key={`${active_event.id}:${active_event.phase}`}
    >
      <div className="operation-stage-director-cue rounded-[17px] border border-white/66 bg-[rgba(255,255,255,0.58)] p-3 shadow-[0_20px_54px_rgba(18,28,42,0.12)] backdrop-blur-2xl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] border border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
              <ToolIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.10em] text-(--text-strong)">
                {cue_title}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-(--text-soft)">
                {active_episode?.act_label ?? "Act"} · {active_event.tool_name ?? active_event.title}
              </p>
            </div>
          </div>
          <span className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[9px] font-black",
            phase_meta.class_name,
          )}>
            <PhaseIcon className={cn("h-3 w-3", active_event.phase === "running" && "animate-spin")} />
            {phase_meta.label}
          </span>
        </div>

        <div className="mt-3 rounded-[13px] border border-white/48 bg-white/36 p-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[9.5px] font-semibold">
            <CueSegment
              label="输入"
              value={io_summary.input_label}
            />
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
            <CueSegment
              label="窗口"
              value={window_label}
            />
          </div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[10px] bg-white/34 px-2 py-1.5 text-[9.5px]">
            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
            <div className="min-w-0">
              <p className="truncate font-bold text-(--text-soft)">沉淀</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-(--text-strong)">
                {output_label}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] border border-[rgba(91,114,255,0.15)] bg-[rgba(91,114,255,0.06)] px-2.5 py-2">
          <Play className="h-3.5 w-3.5 shrink-0 text-[color:var(--primary)]" />
          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-(--text-soft)">
              {episodes.progress_label} · {SURFACE_LABEL[active_event.surface]}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-(--text-strong)">
              {target_label}
            </p>
          </div>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[9px] bg-white/52 text-(--icon-muted)">
            <Layers3 className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function CueSegment({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-white/40 px-2 py-1.5">
      <p className="text-[8px] font-black uppercase tracking-[0.10em] text-(--text-soft)">{label}</p>
      <p className="mt-0.5 truncate text-[9.5px] font-semibold text-(--text-strong)">{value}</p>
    </div>
  );
}
