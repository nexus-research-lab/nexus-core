import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  ListTree,
  RadioTower,
  Route,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { format_operation_time } from "../operation-preview";
import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import {
  collect_completion_workspace_artifacts,
  format_elapsed,
  is_low_signal_director_value,
} from "./operation-stage-helpers";
import type { StageNarrativePhase, StageNarrativeState } from "./operation-stage-model";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

function StagePhasePath({ narrative }: { narrative: StageNarrativeState }) {
  const resolved_active_index = stage_phase_compass_active_index(narrative.phase);
  const progress_width = `${(resolved_active_index / (STAGE_PHASE_COMPASS_ITEMS.length - 1)) * 80}%`;

  return (
    <div className="mt-3 rounded-[13px] border border-white/50 bg-white/34 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.46)]">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-(--text-soft)">工作路径</p>
          <p className="mt-0.5 truncate text-[10.5px] font-bold text-(--text-strong)">{narrative.detail}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/54 bg-white/46 px-2 py-1 text-[8.5px] font-black text-(--text-soft)">
          {narrative.label}
        </span>
      </div>
      <div className="relative grid grid-cols-5 gap-1.5">
        <div className="absolute left-[10%] right-[10%] top-[13px] h-px bg-white/64" />
        <div
          className="absolute left-[10%] top-[13px] h-px bg-[linear-gradient(90deg,rgba(91,114,255,0.72),rgba(79,162,159,0.66),rgba(47,184,132,0.62))] transition-[width] duration-500"
          style={{ width: progress_width }}
        />
        {STAGE_PHASE_COMPASS_ITEMS.map((item, index) => {
          const Icon = item.Icon;
          const is_active = index === resolved_active_index;
          const is_done = index < resolved_active_index || narrative.phase === "completed";
          return (
            <div className="relative min-w-0 text-center" key={item.id}>
              <span className={cn(
                "relative z-10 mx-auto grid h-6 w-6 place-items-center rounded-[9px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] transition",
                is_active
                  ? "scale-110 border-[rgba(91,114,255,0.34)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_8px_20px_rgba(91,114,255,0.16)]"
                  : is_done
                    ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                    : "border-white/48 bg-white/48 text-(--icon-muted)",
              )}>
                <Icon className="h-3 w-3" />
              </span>
              <span className={cn(
                "mt-1 block truncate text-[8px] font-black",
                is_active ? "text-(--text-strong)" : "text-(--text-soft)",
              )}>
                {item.label}
              </span>
              <span className={cn(
                "mt-0.5 block truncate text-[7.5px] font-semibold",
                is_active ? "text-[color:var(--primary)]" : "text-(--text-soft)",
              )}>
                {is_active ? "当前" : is_done ? "沉淀" : "待接入"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STAGE_PHASE_COMPASS_ITEMS: Array<{
  id: "idle" | StageNarrativePhase;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "idle", label: "入口", Icon: Sparkles },
  { id: "awakening", label: "唤醒", Icon: RadioTower },
  { id: "running", label: "执行", Icon: Activity },
  { id: "settling", label: "落盘", Icon: ListTree },
  { id: "completed", label: "交接", Icon: CheckCircle2 },
];

function stage_phase_compass_active_index(phase: StageNarrativePhase): number {
  if (phase === "awakening") {
    return 1;
  }
  if (phase === "running") {
    return 2;
  }
  if (phase === "settling") {
    return 3;
  }
  return 4;
}

export function StageStatusBar({
  event,
  is_replay,
  snapshot,
  active_window,
  narrative,
  visible_window_count,
  window_count,
}: {
  event: NexusOperationEvent;
  is_replay?: boolean;
  snapshot: NexusOperationSnapshot | null;
  active_window: StageWindowState | null;
  narrative: StageNarrativeState;
  visible_window_count: number;
  window_count: number;
}) {
  const phase_meta = PHASE_STATUS_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const round_event_count = snapshot?.events.filter((item) => item.round_id === event.round_id).length ?? 1;
  const elapsed = format_elapsed(event.started_at, event.ended_at, event.updated_at);
  const display_title = stage_status_display_title(event, narrative, active_window);
  const target_detail = stage_status_target_detail(event, narrative, active_window, display_title);
  const director_cues = build_stage_director_cues({
    active_window,
    display_title,
    event,
    is_replay: Boolean(is_replay),
    narrative,
    round_event_count,
    snapshot,
    visible_window_count,
  });

  return (
    <div className="operation-stage-mobile-panel absolute left-4 top-4 z-30 flex max-w-[min(470px,calc(100%-2rem))] items-start gap-3 max-md:relative max-md:left-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="min-w-0 rounded-[16px] border border-white/72 bg-white/72 px-3.5 py-3 shadow-[0_18px_46px_rgba(18,28,42,0.12)] backdrop-blur-xl max-md:w-full">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[10px] font-bold",
            phase_meta.class_name,
          )}>
            <PhaseIcon className={cn("h-3.5 w-3.5", event.phase === "running" && "animate-spin")} />
            {phase_meta.label}
          </span>
          <span className="truncate text-[12px] font-black tracking-[-0.02em] text-(--text-strong)">
            {display_title}
          </span>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-semibold text-(--text-soft)">
          <span>{is_replay ? "回放中" : narrative.label}</span>
          <span>{SURFACE_LABEL[event.surface]}</span>
          <span>{round_event_count} 步</span>
          <span>{visible_window_count}/{window_count} 窗口</span>
          <span>{elapsed}</span>
          <span>{format_operation_time(event.updated_at)}</span>
        </div>
        {target_detail ? (
          <p className="mt-1.5 truncate text-[11px] text-(--text-muted)">
            {target_detail}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-1.5 max-sm:grid-cols-1">
          {director_cues.map((cue) => {
            const CueIcon = cue.Icon;
            return (
              <div
                className={cn(
                  "min-w-0 rounded-[11px] border px-2.5 py-2",
                  cue.tone === "warning"
                    ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.09)]"
                    : cue.tone === "success"
                      ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/50 bg-white/38",
                )}
                key={cue.label}
              >
                <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-(--text-soft)">
                  <CueIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{cue.label}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10.5px] font-semibold leading-snug text-(--text-strong)">
                  {cue.value}
                </p>
              </div>
            );
          })}
        </div>
        <StagePhasePath narrative={narrative} />
      </div>
    </div>
  );
}

function build_stage_director_cues({
  active_window,
  display_title,
  event,
  is_replay,
  narrative,
  round_event_count,
  snapshot,
  visible_window_count,
}: {
  active_window: StageWindowState | null;
  display_title: string;
  event: NexusOperationEvent;
  is_replay: boolean;
  narrative: StageNarrativeState;
  round_event_count: number;
  snapshot: NexusOperationSnapshot | null;
  visible_window_count: number;
}): Array<{
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}> {
  const round_events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const error_count = round_events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const done_count = round_events.filter((item) => item.phase === "done").length;
  const evidence_count = round_events.reduce((total, item) => total + (item.evidence?.length ?? 0), 0);
  const workspace_count = collect_completion_workspace_artifacts(event, snapshot).length;
  const primary_target_candidate = event.target
    ?? active_window?.target
    ?? active_window?.title
    ?? narrative.detail
    ?? event.title
    ?? event.summary;
  const primary_target = is_low_signal_director_value(primary_target_candidate)
    ? display_title
    : primary_target_candidate;
  const next_step = error_count
    ? "先回看异常窗口、输入参数和证据，再决定重试或改写任务。"
    : narrative.phase === "completed" || narrative.phase === "settling"
      ? "从交接清单继续，打开关键产物或回放任一步骤。"
      : event.phase === "waiting"
        ? "确认权限后，舞台会回到当前工具窗口继续执行。"
        : event.surface === "terminal"
          ? "观察终端输出和退出码，确认命令是否收束。"
          : "等待下一个真实工具事件进入工作台。";

  return [
    {
      label: is_replay ? "回放" : "目标",
      value: primary_target,
      tone: error_count ? "warning" : "neutral",
      Icon: Route,
    },
    {
      label: "现场",
      value: `${round_event_count} 步 · ${visible_window_count} 窗口 · ${workspace_count + evidence_count} 证据`,
      tone: done_count > 0 && !error_count ? "success" : error_count ? "warning" : "neutral",
      Icon: ListChecks,
    },
    {
      label: "下一步",
      value: next_step,
      tone: error_count || event.phase === "waiting" ? "warning" : "neutral",
      Icon: ArrowRight,
    },
  ];
}

function stage_status_display_title(
  event: NexusOperationEvent,
  narrative: StageNarrativeState,
  active_window: StageWindowState | null,
): string {
  const title = event.title || active_window?.title || narrative.label;
  if (!is_low_signal_director_value(title) && event.kind !== "round_summary") {
    return title;
  }
  if (event.kind === "round_summary" || event.surface === "summary") {
    return narrative.phase === "completed" || narrative.phase === "settling"
      ? "交接面板"
      : "执行交接";
  }
  return active_window?.title ?? narrative.label;
}

function stage_status_target_detail(
  event: NexusOperationEvent,
  narrative: StageNarrativeState,
  active_window: StageWindowState | null,
  display_title: string,
): string | null {
  const candidate = event.target ?? active_window?.target ?? active_window?.title ?? narrative.detail;
  if (is_low_signal_director_value(candidate)) {
    return display_title === candidate ? narrative.detail : display_title;
  }
  return candidate ?? null;
}
