import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  ListTree,
  Loader2,
  Maximize2,
  PauseCircle,
  RadioTower,
  RotateCcw,
  Route,
  ShieldQuestion,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { StageWindowContent } from "../apps/operation-app-renderers";
import type {
  StageWindowKind,
  StageWindowState,
} from "../operation-desktop-types";
import {
  plan_operation_desktop,
  resolve_operation_event_window_id,
} from "../operation-scene-planner";
import {
  build_operation_continuation_brief,
  build_operation_live_episode,
} from "../operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "../operation-types";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import { format_operation_time } from "../operation-preview";
import {
  build_stage_narrative,
  collect_archive_capsules,
  collect_completion_artifacts,
  collect_completion_workspace_artifacts,
  collect_handoff_checklist,
  collect_handoff_items,
  collect_narrative_events,
  event_sequence_label,
  format_elapsed,
  icon_for_operation_kind,
  icon_for_window_kind,
  minimum_revealed_window_count,
  order_windows_for_reveal,
  position_for_window,
  stage_app_label_for_window_kind,
  useRevealedWindowCount,
} from "./operation-stage-helpers";
import type {
  ArchiveCapsuleItem,
  CompletionArtifact,
  HandoffChecklistItem,
  HandoffItem,
  StageNarrativePhase,
  StageNarrativeState,
  StageWindowOverride,
} from "./operation-stage-model";
import {
  PHASE_STATUS_META,
  SURFACE_ACCENT_CLASS_NAME,
  SURFACE_LABEL,
} from "./operation-stage-style";
import { OperationStageWindow } from "./operation-stage-window";

export function OperationStageDesktop({
  event,
  snapshot,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
}) {
  const desktop = useMemo(() => (
    plan_operation_desktop({ event, snapshot })
  ), [event, snapshot]);
  const [focused_window_id, set_focused_window_id] = useState<string | null>(null);
  const [replay_event_id, set_replay_event_id] = useState<string | null>(null);
  const [window_overrides, set_window_overrides] = useState<Record<string, StageWindowOverride>>({});
  const narrative = useMemo(() => build_stage_narrative(event, snapshot), [event, snapshot]);
  const narrative_events = useMemo(() => collect_narrative_events(event, snapshot), [event, snapshot]);
  const active_narrative_event_id = useMemo(() => (
    replay_event_id && narrative_events.some((item) => item.id === replay_event_id)
      ? replay_event_id
      : event.id
  ), [event.id, narrative_events, replay_event_id]);
  const active_narrative_event = useMemo(() => (
    narrative_events.find((item) => item.id === active_narrative_event_id) ?? event
  ), [active_narrative_event_id, event, narrative_events]);
  const windows_for_reveal = useMemo(() => (
    order_windows_for_reveal(desktop.windows, desktop.active_window_id)
  ), [desktop.active_window_id, desktop.windows]);
  const revealed_window_count = useRevealedWindowCount({
    event_key: `${event.round_id}:${event.id}:${event.phase}`,
    minimum_count: minimum_revealed_window_count({
      event_count: narrative_events.length,
      phase: narrative.phase,
      window_count: windows_for_reveal.length,
    }),
    phase: narrative.phase,
    window_count: windows_for_reveal.length,
  });

  useEffect(() => {
    set_focused_window_id(null);
    set_replay_event_id(null);
    set_window_overrides({});
  }, [event.round_id]);

  useEffect(() => {
    set_replay_event_id(null);
  }, [event.id]);

  useEffect(() => {
    const next_active_window_id = desktop.active_window_id;
    if (!next_active_window_id) {
      return;
    }

    set_focused_window_id(next_active_window_id);
    set_window_overrides((current) => ({
      ...current,
      [next_active_window_id]: {
        ...current[next_active_window_id],
        closed: false,
        minimized: false,
      },
    }));
  }, [desktop.active_window_id, event.id]);

  const window_states = useMemo(() => (
    windows_for_reveal
      .map((window): StageWindowState => {
        const override = window_overrides[window.id];
        if (override?.closed) {
          return { ...window, phase: "closed" };
        }
        if (override?.minimized) {
          return { ...window, phase: "minimized" };
        }
        if (override?.minimized === false && window.phase === "minimized") {
          return { ...window, phase: "background" };
        }
        return window;
      })
      .slice(0, revealed_window_count)
      .sort((left, right) => {
        const left_z = left.id === focused_window_id ? 100 : left.z;
        const right_z = right.id === focused_window_id ? 100 : right.z;
        return left_z - right_z;
      })
  ), [focused_window_id, revealed_window_count, window_overrides, windows_for_reveal]);

  const visible_windows = useMemo(() => (
    window_states.filter((window) => window.phase !== "closed" && window.phase !== "minimized")
  ), [window_states]);

  const active_window_id = useMemo(() => {
    if (focused_window_id && visible_windows.some((window) => (
      window.id === focused_window_id && window.phase !== "minimized"
    ))) {
      return focused_window_id;
    }
    const explicit_active = visible_windows.find((window) => (
      window.id === desktop.active_window_id && window.phase !== "minimized"
    ));
    const focused = explicit_active ?? visible_windows.find((window) => window.phase === "focused");
    return (focused ?? visible_windows[0] ?? null)?.id ?? null;
  }, [desktop.active_window_id, focused_window_id, visible_windows]);

  const active_window = useMemo(() => (
    visible_windows.find((window) => window.id === active_window_id) ?? null
  ), [active_window_id, visible_windows]);
  const has_window_layout_changes = useMemo(() => (
    Object.values(window_overrides).some((override) => (
      override.closed ||
      override.minimized ||
      Boolean(override.offset_x) ||
      Boolean(override.offset_y)
    ))
  ), [window_overrides]);
  const has_window_position_changes = useMemo(() => (
    Object.values(window_overrides).some((override) => Boolean(override.offset_x) || Boolean(override.offset_y))
  ), [window_overrides]);

  const close_window = (window_id: string) => {
    set_focused_window_id((current) => current === window_id ? null : current);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        closed: true,
      },
    }));
  };

  const focus_window = (window_id: string) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: false,
      },
    }));
  };

  const minimize_window = (window_id: string) => {
    set_focused_window_id((current) => current === window_id ? null : current);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: true,
      },
    }));
  };

  const move_window = (window_id: string, offset: { x: number; y: number }) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: false,
        offset_x: Math.round(offset.x),
        offset_y: Math.round(offset.y),
      },
    }));
  };

  const restore_window = (window_id: string) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        closed: false,
        minimized: false,
      },
    }));
  };

  const restore_all_windows = () => {
    set_focused_window_id(desktop.active_window_id ?? desktop.windows[0]?.id ?? null);
    set_window_overrides(Object.fromEntries(
      desktop.windows.map((window) => [window.id, { closed: false, minimized: false }]),
    ));
  };

  const reset_window_positions = () => {
    set_window_overrides((current) => Object.fromEntries(
      Object.entries(current).map(([window_id, override]) => [
        window_id,
        {
          ...override,
          offset_x: 0,
          offset_y: 0,
        },
      ]),
    ));
  };

  const focus_event_window = (target_event: NexusOperationEvent) => {
    const target_window_id = resolve_operation_event_window_id(target_event, desktop.windows)
      ?? desktop.active_window_id
      ?? desktop.windows[0]?.id
      ?? null;
    if (!target_window_id) {
      return;
    }
    set_replay_event_id(target_event.id);
    restore_window(target_window_id);
  };

  return (
    <DynamicStageFrame event={event} narrative={narrative}>
      <StageStatusBar
        active_window={active_window}
        event={active_narrative_event}
        is_replay={active_narrative_event.id !== event.id}
        narrative={narrative}
        snapshot={snapshot}
        visible_window_count={visible_windows.length}
        window_count={desktop.windows.length}
      />
      <StageOperationRunway
        active_event_id={active_narrative_event_id}
        events={narrative_events}
        narrative={narrative}
        on_focus_event={focus_event_window}
      />
      <StageActGuide
        active_window={active_window}
        event={event}
        events={narrative_events}
        narrative={narrative}
        snapshot={snapshot}
      />
      {narrative.phase === "settling" ? (
        <StageCompletionLedger
          active_event_id={active_narrative_event_id}
          event={event}
          events={narrative_events}
          narrative={narrative}
          on_focus_event={focus_event_window}
          snapshot={snapshot}
        />
      ) : narrative.phase === "completed" ? null : (
        <StageNarrativeRail
          active_event_id={active_narrative_event_id}
          active_window={active_window}
          events={narrative_events}
          narrative={narrative}
          on_focus_event={focus_event_window}
          revealed_window_count={revealed_window_count}
          snapshot={snapshot}
          total_window_count={windows_for_reveal.length}
        />
      )}
      {visible_windows.length ? visible_windows.map((window, index) => {
        const is_active = active_window_id === window.id && window.phase !== "minimized";
        return (
          <OperationStageWindow
            delay_ms={Math.min(index * 70, 280)}
            dimmed={!is_active && window.phase !== "minimized"}
            drag_offset={{
              x: window_overrides[window.id]?.offset_x ?? 0,
              y: window_overrides[window.id]?.offset_y ?? 0,
            }}
            focus={is_active}
            footer={(
              <WindowSettlementBar
                active={is_active}
                event={window.payload.event}
                sequence_label={event_sequence_label(window.payload.event, narrative_events)}
                tone={window.kind === "terminal" ? "terminal" : "default"}
              />
            )}
            icon={icon_for_window_kind(window.kind)}
            key={window.id}
            mobile_hidden={!is_active}
            minimized={window.phase === "minimized"}
            on_close={() => close_window(window.id)}
            on_drag={(offset) => move_window(window.id, offset)}
            on_focus={() => focus_window(window.id)}
            on_minimize={() => minimize_window(window.id)}
            position_class_name={position_for_window(window, narrative.phase)}
            title={window.title}
            tone={window.kind === "terminal" ? "terminal" : "default"}
          >
            {is_active ? (
              <StageWindowContent window={window} on_focus_event={focus_event_window} />
            ) : (
              <BackgroundWindowSummary
                sequence_label={event_sequence_label(window.payload.event, narrative_events)}
                window={window}
              />
            )}
          </OperationStageWindow>
        );
      }) : (
        <StageWindowsHiddenState
          window_count={desktop.windows.length}
          on_restore_all={restore_all_windows}
        />
      )}
      <StageWindowDock
        active_window_id={active_window_id}
        events={narrative_events}
        windows={window_states}
        on_restore={restore_window}
      />
      <StageWindowControls
        active_window={active_window}
        has_layout_changes={has_window_layout_changes}
        has_position_changes={has_window_position_changes}
        on_reset_positions={reset_window_positions}
        on_restore_all={restore_all_windows}
        visible_window_count={visible_windows.length}
        window_count={desktop.windows.length}
      />
      {narrative.phase === "completed" || narrative.phase === "settling" ? (
        <>
          <StageArchiveShelf
            event={event}
            events={narrative_events}
            narrative={narrative}
            snapshot={snapshot}
            windows={window_states}
          />
          <StageOutcomeSummary
            event={event}
            events={narrative_events}
            narrative={narrative}
            snapshot={snapshot}
          />
        </>
      ) : null}
      {active_window?.kind === "terminal" || narrative.phase === "completed" || narrative.phase === "settling"
        ? null
        : <StageFocusBeam />}
    </DynamicStageFrame>
  );
}

function DynamicStageFrame({
  event,
  narrative,
  children,
}: {
  event: NexusOperationEvent;
  narrative: StageNarrativeState;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "operation-stage-frame relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,247,251,0.86)_42%,rgba(234,239,247,0.92))] p-4 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:overflow-y-auto max-md:overflow-x-hidden",
        `operation-stage-narrative-${narrative.phase}`,
      )}
      data-stage-experience-phase={narrative.phase}
    >
      <div
        className={cn(
          "operation-stage-aura absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br opacity-[0.28] blur-3xl",
          SURFACE_ACCENT_CLASS_NAME[event.surface],
        )}
      />
      <div className="operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.32]" />
      <div className="operation-stage-light" />
      <div className="operation-desktop-shadow" />
      <div className="relative h-full min-h-[280px] max-md:flex max-md:h-auto max-md:min-h-0 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:flex-col max-md:gap-3 max-md:overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

function StagePhasePath({ narrative }: { narrative: StageNarrativeState }) {
  const resolved_active_index = stage_phase_compass_active_index(narrative.phase);

  return (
    <div className="mt-3 rounded-[12px] border border-white/46 bg-white/30 px-2 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[8.5px] font-black uppercase tracking-[0.10em] text-(--text-soft)">
        <span>stage</span>
        <span className="normal-case tracking-normal">{narrative.label}</span>
      </div>
      <div className="relative grid grid-cols-5 gap-1">
        <div className="absolute left-[10%] right-[10%] top-[13px] h-px bg-white/64" />
        {STAGE_PHASE_COMPASS_ITEMS.map((item, index) => {
          const Icon = item.Icon;
          const is_active = index === resolved_active_index;
          const is_done = index < resolved_active_index || narrative.phase === "completed";
          return (
            <div className="relative min-w-0 text-center" key={item.id}>
              <span className={cn(
                "relative z-10 mx-auto grid h-6 w-6 place-items-center rounded-[9px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]",
                is_active
                  ? "border-[rgba(91,114,255,0.30)] bg-[rgba(91,114,255,0.15)] text-[color:var(--primary)]"
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

function StageStatusBar({
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
  const director_cues = build_stage_director_cues({
    active_window,
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
            {event.title}
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
        {event.target || active_window?.title || narrative.detail ? (
          <p className="mt-1.5 truncate text-[11px] text-(--text-muted)">
            {event.target ?? active_window?.title ?? narrative.detail}
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
  event,
  is_replay,
  narrative,
  round_event_count,
  snapshot,
  visible_window_count,
}: {
  active_window: StageWindowState | null;
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
    ? event.title
    : primary_target_candidate;
  const next_step = error_count
    ? "先回看异常窗口、输入参数和证据，再决定重试或改写任务。"
    : narrative.phase === "completed" || narrative.phase === "settling"
      ? "从交接清单继续，打开关键产物或回放任一步骤。"
      : event.phase === "waiting"
        ? "确认权限后，舞台会回到当前工具窗口继续执行。"
        : event.surface === "terminal"
          ? "观察 stdout、stderr 和退出码，确认命令是否收束。"
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

function is_low_signal_director_value(value: string | null | undefined): value is string {
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return !normalized
    || /^\d+\s+turns?$/.test(normalized)
    || /^\d+\s+actions?$/.test(normalized)
    || /^\d+\s+turns?$/.test(normalized.replace("回合", "turns"))
    || /^\d+\s+步$/.test(normalized);
}

function StageActGuide({
  active_window,
  event,
  events,
  narrative,
  snapshot,
}: {
  active_window: StageWindowState | null;
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}) {
  if (narrative.phase === "completed" || narrative.phase === "settling") {
    return null;
  }

  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const episode = build_operation_live_episode(event, events, snapshot);
  const is_waiting = event.phase === "waiting";
  const is_runtime_handoff = event.surface === "conversation";
  const is_runtime_retry = is_runtime_retry_event(event);
  const act_steps = is_waiting
    ? STAGE_WAITING_ACT_STEPS
    : is_runtime_handoff
      ? STAGE_HANDOFF_ACT_STEPS
      : STAGE_RUNNING_ACT_STEPS;
  const stage_index = narrative.phase === "awakening" ? 0 : 1;
  const target = event.target ?? event.summary ?? active_window?.title ?? event.title;
  const GuideIcon = narrative.phase === "awakening"
    ? Sparkles
    : is_waiting
      ? ShieldQuestion
      : is_runtime_retry
        ? AlertTriangle
      : is_runtime_handoff
        ? RadioTower
        : Route;
  const guide_title = narrative.phase === "awakening"
    ? "工作台正在显影"
    : is_waiting
      ? "等待用户介入"
      : is_runtime_retry
        ? "API 正在重试"
      : is_runtime_handoff
        ? "运行正在接入"
        : "工具正在接管现场";

  return (
    <div className="operation-stage-mobile-panel absolute right-4 top-4 z-30 w-[min(350px,calc(100%-2rem))] max-xl:top-[92px] max-md:relative max-md:right-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="rounded-[16px] border border-white/64 bg-white/52 p-3 shadow-[0_18px_46px_rgba(18,28,42,0.10)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[rgba(91,114,255,0.20)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]">
              <GuideIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">
                {guide_title}
              </p>
              <p className="truncate text-[10.5px] text-(--text-soft)">
                {profile.action_label} · {profile.title}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/56 bg-white/48 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            {episode.progress_label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {act_steps.map((step, index) => {
            const is_done = index < stage_index;
            const is_current = index === stage_index;
            return (
              <div
                className={cn(
                  "min-w-0 rounded-[11px] border px-2 py-2",
                  is_current
                    ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.11)]"
                    : is_done
                      ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/42 bg-white/26",
                )}
                key={step.label}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-black",
                    is_current
                      ? "bg-[color:var(--primary)] text-white"
                      : is_done
                        ? "bg-[color:var(--success)] text-white"
                        : "bg-white/70 text-(--text-soft)",
                  )}>
                    {index + 1}
                  </span>
                  <span className="truncate text-[9.5px] font-black text-(--text-strong)">
                    {step.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-[8.5px] font-semibold text-(--text-soft)">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-[12px] border border-white/46 bg-white/34 px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[9.5px] font-bold text-(--text-soft)">
            <span>当前意图</span>
            <span>{SURFACE_LABEL[event.surface]}</span>
          </div>
          <p className="line-clamp-2 text-[11px] leading-5 text-(--text-strong)">
            {target}
          </p>
        </div>

        <div className="mt-2 overflow-hidden rounded-[12px] border border-[rgba(91,114,255,0.16)] bg-[rgba(91,114,255,0.06)] p-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[9px] border border-[rgba(91,114,255,0.18)] bg-white/46 text-[color:var(--primary)]">
              <Route className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate text-[9.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                  {episode.status_label}
                </p>
                <span className="shrink-0 rounded-full bg-white/54 px-1.5 py-px text-[8.5px] font-bold text-(--text-soft)">
                  live
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-muted)">
                {episode.status_detail}
              </p>
              <div className="mt-2 grid gap-1 text-[9.5px]">
                <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-[8px] bg-white/34 px-2 py-1.5">
                  <span className="font-bold text-(--text-soft)">刚才</span>
                  <span className="truncate font-semibold text-(--text-strong)">{episode.previous_label}</span>
                </div>
                <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-[8px] bg-white/34 px-2 py-1.5">
                  <span className="font-bold text-(--text-soft)">等待</span>
                  <span className="truncate font-semibold text-(--text-strong)">{episode.next_label}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {episode.checkpoints.map((checkpoint) => (
              <div
                className={cn(
                  "min-w-0 rounded-[8px] border px-1.5 py-1.5",
                  checkpoint.tone === "warning"
                    ? "border-[rgba(223,157,46,0.18)] bg-[rgba(223,157,46,0.08)]"
                    : checkpoint.tone === "success"
                      ? "border-[rgba(47,184,132,0.17)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/42 bg-white/28",
                )}
                key={checkpoint.label}
              >
                <p className="truncate text-[8px] font-bold text-(--text-soft)">{checkpoint.label}</p>
                <p className="mt-0.5 truncate text-[9.5px] font-black text-(--text-strong)">{checkpoint.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STAGE_RUNNING_ACT_STEPS = [
  { label: "进入", detail: "字符场展开" },
  { label: "执行", detail: "工具逐个登场" },
  { label: "沉淀", detail: "结果可回看" },
] as const;

const STAGE_HANDOFF_ACT_STEPS = [
  { label: "接入", detail: "运行时接收" },
  { label: "装载", detail: "上下文就绪" },
  { label: "等待", detail: "首个工具事件" },
] as const;

const STAGE_WAITING_ACT_STEPS = [
  { label: "进入", detail: "字符场展开" },
  { label: "确认", detail: "权限检查点" },
  { label: "继续", detail: "回到现场" },
] as const;

function is_runtime_retry_event(event: NexusOperationEvent): boolean {
  return event.surface === "conversation"
    && (event.evidence ?? []).some((item) => item.label === "api_retry");
}

function StageNarrativeRail({
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
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold text-(--text-soft)">
          <span>事件流</span>
          <span>{events.length} 步 · {Math.min(revealed_window_count, total_window_count)}/{total_window_count}</span>
        </div>
        <div className="flex min-w-0 max-w-full gap-1.5 overflow-hidden">
          {events.slice(-7).map((item, index) => {
            const Icon = icon_for_operation_kind(item.kind);
            const is_active = item.id === active_event_id;
            return (
              <button
                aria-label={`聚焦执行事件 ${index + 1}：${item.tool_name ?? item.title}`}
                className={cn(
                  "group relative flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-[11px] border px-2 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                  is_active
                    ? "border-[rgba(91,114,255,0.28)] bg-[rgba(91,114,255,0.13)] text-[color:var(--primary)]"
                    : "border-white/50 bg-white/36 text-(--text-muted)",
                )}
                key={item.id}
                onClick={() => on_focus_event?.(item)}
                title={`${index + 1}. ${item.tool_name ?? item.title}`}
                type="button"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/64">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate text-[10px] font-semibold">
                  {item.tool_name ?? item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageOperationRunway({
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
              const Icon = icon_for_operation_kind(item.kind);
              const phase_meta = PHASE_STATUS_META[item.phase];
              const is_active = item.id === active_event_id;
              const is_settled = index < active_index || item.phase === "done" || item.phase === "cancelled";
              return (
                <button
                  aria-label={`聚焦工作台航线 ${index + 1}：${item.tool_name ?? item.title}`}
                  className="min-w-0 rounded-[12px] text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]"
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${index + 1}. ${item.tool_name ?? item.title}`}
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
                    {item.tool_name ?? item.title}
                  </p>
                  <p className="truncate text-[8px] font-semibold text-(--text-soft)">
                    {SURFACE_LABEL[item.surface]}
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

function StageCompletionLedger({
  active_event_id,
  event,
  events,
  narrative,
  on_focus_event,
  snapshot,
}: {
  active_event_id: string;
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
  snapshot: NexusOperationSnapshot | null;
}) {
  if (!events.length) {
    return null;
  }

  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");
  const artifacts = collect_completion_artifacts(event, snapshot);
  const completed_count = events.filter((item) => item.phase === "done").length;
  const interrupted_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const visible_events = events.slice(-5);
  const active_index = events.findIndex((item) => item.id === active_event_id);
  const active_replay_event = active_index >= 0 ? events[active_index] : event;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[76px] left-4 z-30 w-[min(360px,calc(100%-2rem))] max-md:relative max-md:bottom-auto max-md:left-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="rounded-[18px] border border-white/70 bg-white/58 p-3 shadow-[0_22px_56px_rgba(18,28,42,0.13)] backdrop-blur-2xl">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border",
              has_error
                ? "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
            )}>
              {has_error ? <AlertTriangle className="h-4.5 w-4.5" /> : <ListChecks className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-black text-(--text-strong)">工作台交接账本</p>
              <p className="mt-0.5 truncate text-[10.5px] text-(--text-soft)">
                {has_error ? "保留异常证据，等待回看处理" : "现场已转成可追溯记录，可以继续对话"}
              </p>
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9.5px] font-bold",
            has_error
              ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
              : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
            {active_index >= 0 ? `${active_index + 1}/${events.length}` : has_error ? "回看" : "就绪"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <CompletionLedgerMetric
            label="步骤"
            tone={has_error ? "warning" : "success"}
            value={`${completed_count}/${events.length}`}
          />
          <CompletionLedgerMetric
            label="产物"
            tone={artifacts.length ? "success" : "neutral"}
            value={`${artifacts.length}`}
          />
          <CompletionLedgerMetric
            label={interrupted_count ? "异常" : "状态"}
            tone={interrupted_count ? "warning" : "neutral"}
            value={interrupted_count ? `${interrupted_count}` : narrative.phase === "completed" ? "完成" : "落盘"}
          />
        </div>

        <div className="mt-3 rounded-[13px] border border-white/52 bg-white/36 p-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold text-(--text-soft)">
            <span>执行回放轨迹</span>
            <span>{format_operation_time(active_replay_event.updated_at)}</span>
          </div>
          <div className="space-y-1">
            {visible_events.map((item, index) => {
              const Icon = icon_for_operation_kind(item.kind);
              const phase_meta = PHASE_STATUS_META[item.phase];
              const PhaseIcon = phase_meta.Icon;
              const is_active = item.id === active_event_id;
              return (
                <button
                  aria-label={`回看交接记录 ${index + 1}：${item.tool_name ?? item.title}`}
                  className={cn(
                    "grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                    is_active
                      ? "border-[rgba(91,114,255,0.26)] bg-[rgba(91,114,255,0.10)]"
                      : "border-white/46 bg-white/30",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${item.tool_name ?? item.title} · ${item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}`}
                  type="button"
                >
                  <span className={cn(
                    "grid h-[22px] w-[22px] place-items-center rounded-[8px]",
                    is_active ? "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]" : "bg-white/58 text-(--icon-muted)",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
                      {item.tool_name ?? item.title}
                    </span>
                    <span className="block truncate text-[9.5px] text-(--text-soft)">
                      {item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}
                    </span>
                  </span>
                  <span className={cn(
                    "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[8.5px] font-bold",
                    phase_meta.class_name,
                  )}>
                    <PhaseIcon className={cn("h-3 w-3", item.phase === "running" && "animate-spin")} />
                    {phase_meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[13px] border border-white/52 bg-white/34 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10.5px] font-black text-(--text-strong)">
              {has_error ? "错误上下文已保留" : "交接完成，回到对话"}
            </p>
            <p className="truncate text-[9.5px] text-(--text-soft)">
              {artifacts[0]?.value ?? event.summary ?? event.target ?? "本轮工作台记录可随时回看"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/60 px-2 py-1 text-[9px] font-bold text-(--text-soft)">
            {narrative.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompletionLedgerMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "success" | "warning";
  value: string;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[11px] border px-2 py-2",
      tone === "warning"
        ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
        : tone === "success"
          ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
          : "border-white/48 bg-white/34",
    )}>
      <div className="truncate text-[12px] font-black text-(--text-strong)">{value}</div>
      <div className="mt-0.5 truncate text-[8.5px] font-bold uppercase tracking-normal text-(--text-soft)">
        {label}
      </div>
    </div>
  );
}

function StageOutcomeSummary({
  event,
  events,
  narrative,
  snapshot,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}) {
  const terminal_count = events.filter((item) => item.surface === "terminal").length;
  const file_count = events.filter((item) => item.surface === "workspace" || item.surface === "editor").length;
  const evidence_count = (event.evidence?.length ?? 0) + (snapshot?.recent_evidence.length ?? 0);
  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");
  const artifacts = useMemo(() => collect_completion_artifacts(event, snapshot), [event, snapshot]);
  const handoff_items = useMemo(() => collect_handoff_items({
    artifacts,
    events,
    evidence_count,
    file_count,
    has_error,
    narrative,
    terminal_count,
  }), [artifacts, events, evidence_count, file_count, has_error, narrative, terminal_count]);
  const checklist_items = useMemo(() => collect_handoff_checklist({
    artifacts,
    events,
    evidence_count,
    has_error,
  }), [artifacts, events, evidence_count, has_error]);
  const continuation_brief = useMemo(() => (
    build_operation_continuation_brief(event, events, snapshot)
  ), [event, events, snapshot]);
  const reel_events = events.slice(-5);

  return (
    <div className="absolute right-4 top-4 z-20 w-[min(370px,calc(100%-2rem))] rounded-[16px] border border-white/66 bg-white/60 p-3 shadow-[0_22px_54px_rgba(18,28,42,0.13)] backdrop-blur-xl max-md:relative max-md:right-auto max-md:top-auto max-md:mt-3 max-md:w-full">
      <div className="flex items-center gap-2">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
          has_error
            ? "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
            : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
          {has_error ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-black text-(--text-strong)">
            {has_error ? "执行需要回看" : narrative.phase === "settling" ? "结果正在落盘" : "执行已沉淀"}
          </p>
          <p className="truncate text-[10.5px] text-(--text-soft)">
            {narrative.detail || event.summary || event.target || event.title}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {handoff_items.map((item) => {
          const Icon = item.Icon;
          return (
            <div
              className={cn(
                "min-w-0 rounded-[11px] border px-2 py-2 text-center",
                item.tone === "warning"
                  ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.09)]"
                  : item.tone === "success"
                    ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.09)]"
                    : "border-white/48 bg-white/34",
              )}
              key={item.label}
            >
              <Icon className={cn(
                "mx-auto h-3.5 w-3.5",
                item.tone === "warning" && "text-[color:var(--warning)]",
                item.tone === "success" && "text-[color:var(--success)]",
                item.tone === "neutral" && "text-(--icon-muted)",
              )} />
              <p className="mt-1 truncate text-[9.5px] font-black text-(--text-strong)">{item.label}</p>
              <p className="mt-0.5 truncate text-[8.5px] font-semibold text-(--text-soft)">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className={cn(
        "mt-3 overflow-hidden rounded-[13px] border p-2.5",
        has_error
          ? "border-[rgba(223,157,46,0.22)] bg-[rgba(223,157,46,0.08)]"
          : "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.07)]",
      )}>
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border",
            has_error
              ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
              : "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
          )}>
            {has_error ? <AlertTriangle className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                {continuation_brief.status_label}
              </p>
              <span className="shrink-0 rounded-full bg-white/58 px-1.5 py-px text-[8.5px] font-bold text-(--text-soft)">
                下一步
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-muted)">
              {continuation_brief.status_detail}
            </p>
            <p className="mt-2 rounded-[9px] border border-white/46 bg-white/42 px-2 py-1.5 text-[10px] font-semibold leading-4 text-(--text-strong)">
              {continuation_brief.resume_prompt}
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {continuation_brief.checkpoints.map((checkpoint) => (
            <div
              className={cn(
                "min-w-0 rounded-[9px] border px-1.5 py-1.5",
                checkpoint.tone === "warning"
                  ? "border-[rgba(223,157,46,0.18)] bg-[rgba(223,157,46,0.08)]"
                  : checkpoint.tone === "success"
                    ? "border-[rgba(47,184,132,0.17)] bg-[rgba(47,184,132,0.08)]"
                    : "border-white/44 bg-white/34",
              )}
              key={checkpoint.label}
            >
              <p className="truncate text-[8.5px] font-bold text-(--text-soft)">{checkpoint.label}</p>
              <p className="mt-0.5 truncate text-[10px] font-black text-(--text-strong)">{checkpoint.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-(--text-soft)">
          <span>执行胶片</span>
          <span>{reel_events.length}/{events.length}</span>
        </div>
        <div className="space-y-1">
          {reel_events.map((item, index) => {
            const Icon = icon_for_operation_kind(item.kind);
            const phase_meta = PHASE_STATUS_META[item.phase];
            return (
              <div
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border border-white/48 bg-white/34 px-2 py-1.5 text-[10px]"
                key={item.id}
              >
                <span className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border",
                  item.id === event.id
                    ? "border-[rgba(91,114,255,0.25)] bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                    : "border-white/58 bg-white/52 text-(--icon-muted)",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-(--text-strong)">
                    {index + Math.max(events.length - reel_events.length, 0) + 1}. {item.tool_name ?? item.title}
                  </span>
                  <span className="block truncate text-[9.5px] text-(--text-soft)">
                    {item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-white/54 px-1.5 py-px font-semibold text-(--text-soft)">
                  {phase_meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-(--text-soft)">
          <span>关键产物</span>
          <span>{artifacts.length}</span>
        </div>
        {artifacts.length ? (
          <div className="grid gap-1">
            {artifacts.map((artifact) => {
              const Icon = artifact.Icon;
              return (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-[10px] border border-white/48 bg-white/34 px-2 py-1.5"
                  key={artifact.id}
                  title={artifact.value}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/58 text-(--icon-muted)">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-(--text-strong)">
                      {artifact.label}
                    </span>
                    <span className="block truncate text-[9.5px] text-(--text-soft)">
                      {artifact.value}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[10px] border border-white/48 bg-white/30 px-2 py-2 text-[10px] font-semibold text-(--text-soft)">
            本轮没有独立文件或证据产物。
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <SummaryMetric label="步骤" value={events.length} />
        <SummaryMetric label="文件" value={file_count} />
        <SummaryMetric label="终端" value={terminal_count} />
        <SummaryMetric label="证据" value={evidence_count} />
      </div>

      <div className="mt-3 rounded-[12px] border border-white/50 bg-white/34 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold text-(--text-soft)">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 shrink-0" />
            <span>交接清单</span>
          </span>
          <span>{checklist_items.length} 项</span>
        </div>
        <div className="grid gap-1">
          {checklist_items.map((item) => {
            const Icon = item.Icon;
            return (
              <div
                className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[9px] bg-white/34 px-2 py-1.5 text-[9.5px]"
                key={item.label}
              >
                <span className={cn(
                  "grid h-[18px] w-[18px] place-items-center rounded-full",
                  item.tone === "warning"
                    ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                    : item.tone === "success"
                      ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                      : "bg-white/58 text-(--icon-muted)",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="truncate font-bold text-(--text-strong)">{item.label}</span>
                <span className="max-w-[120px] truncate text-(--text-soft)">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StageArchiveShelf({
  event,
  events,
  narrative,
  snapshot,
  windows,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
  windows: StageWindowState[];
}) {
  const archive_items = useMemo(() => collect_archive_capsules({
    event,
    events,
    snapshot,
    windows,
  }), [event, events, snapshot, windows]);
  const archived_count = events.filter((item) => (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[82px] left-1/2 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 max-md:relative max-md:bottom-auto max-md:left-auto max-md:mt-3 max-md:w-full max-md:translate-x-0">
      <div className="rounded-[18px] border border-white/68 bg-white/54 p-3 shadow-[0_20px_52px_rgba(18,28,42,0.12)] backdrop-blur-xl">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
              event.phase === "error"
                ? "border-[rgba(223,93,98,0.22)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
            )}>
              {event.phase === "error" ? <AlertTriangle className="h-4 w-4" /> : <ListTree className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">现场归档</p>
              <p className="truncate text-[10px] text-(--text-soft)">
                {narrative.phase === "settling" ? "窗口正在落盘为可回看的执行记录" : "工具窗口已沉淀为可追溯工作现场"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/56 bg-white/50 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            {archived_count}/{events.length} 已归档
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {archive_items.map((item, index) => {
            const Icon = item.Icon;
            return (
              <div
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-[13px] border px-2.5 py-2",
                  item.tone === "warning"
                    ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
                    : item.tone === "success"
                      ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/52 bg-white/36",
                )}
                key={item.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-[10px]",
                    item.tone === "warning"
                      ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                      : item.tone === "success"
                        ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                        : "bg-white/58 text-(--icon-muted)",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
                      {item.label}
                    </span>
                    <span className="block truncate text-[9px] font-semibold text-(--text-soft)">
                      {item.value}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-(--text-soft)">
                  <span>{item.meta}</span>
                  <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-white/54 bg-white/42 px-2 py-2">
      <div className="text-[13px] font-black text-(--text-strong)">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-normal text-(--text-soft)">{label}</div>
    </div>
  );
}

function StageWindowsHiddenState({
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

function StageWindowControls({
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

function StageWindowDock({
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
      <div className="operation-window-dock soft-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.66)] px-2.5 py-2 shadow-[0_24px_60px_rgba(18,28,42,0.18),inset_0_1px_0_rgba(255,255,255,0.76)] backdrop-blur-2xl">
        <div className="mr-1 hidden min-w-[112px] border-r border-white/56 pr-2 text-right sm:block">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-(--text-soft)">Nexus</p>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-muted)">工作台现场</p>
        </div>
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
                "group relative grid h-[46px] min-w-[46px] shrink-0 grid-cols-[34px_minmax(0,1fr)] items-center gap-1 rounded-[18px] border px-1.5 pr-2 text-left transition duration-200 ease-out hover:-translate-y-1 hover:scale-[1.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]",
                is_active
                  ? "w-[148px] border-[rgba(91,114,255,0.32)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_12px_28px_rgba(91,114,255,0.20)]"
                  : window.phase === "closed" || window.phase === "minimized"
                    ? "w-[46px] border-transparent bg-white/28 text-(--icon-muted) opacity-72 hover:w-[132px] hover:bg-white/62 hover:text-(--text-strong) hover:opacity-100 focus-visible:w-[132px]"
                    : "w-[46px] border-transparent bg-white/42 text-(--icon-muted) hover:w-[132px] hover:bg-white/72 hover:text-(--text-strong) focus-visible:w-[132px]",
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
                "min-w-0 overflow-hidden transition-opacity duration-150",
                is_active ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              )}>
                <span className="block truncate text-[10.5px] font-black leading-tight text-(--text-strong)">
                  {app_label}
                </span>
                <span className="block truncate text-[9px] font-semibold leading-tight text-(--text-soft)">
                  {sequence_label} · {state_label}
                </span>
              </span>
              <span className={cn(
                "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition group-hover:opacity-0 group-focus-visible:opacity-0",
                is_active
                  ? "opacity-0"
                  : window.phase === "minimized"
                    ? "bg-[rgba(223,157,46,0.70)]"
                    : window.phase === "closed"
                      ? "bg-[rgba(117,131,149,0.42)]"
                      : "bg-transparent",
              )} />
              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 hidden max-w-[210px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/70 bg-[rgba(20,28,38,0.82)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_rgba(18,28,42,0.22)] backdrop-blur-xl group-hover:block group-focus-visible:block">
                <span className="block max-w-[160px] truncate">{window.title}</span>
                <span className="block text-[9px] font-medium text-white/66">{sequence_label} · {app_label} · {state_label}</span>
              </span>
            </button>
          );
        })}
        <div className="ml-1 hidden min-w-[128px] border-l border-white/56 pl-2 text-left md:block">
          <p className="truncate text-[10.5px] font-black text-(--text-strong)">
            {active_window ? stage_app_label_for_window_kind(active_window.kind) : "工作台"}
          </p>
          <p className="mt-0.5 truncate text-[9.5px] font-semibold text-(--text-soft)">
            {live_window_count} 个现场 · {settled_window_count} 个沉淀
          </p>
        </div>
      </div>
    </div>
  );
}

function StageFocusBeam() {
  return (
    <div className="pointer-events-none absolute inset-x-[14%] top-[50%] hidden h-px bg-gradient-to-r from-transparent via-[rgba(91,114,255,0.24)] to-transparent md:block">
      <span className="operation-focus-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--primary)]" />
    </div>
  );
}

function WindowSettlementBar({
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

const BackgroundWindowSummary = memo(function BackgroundWindowSummary({
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
