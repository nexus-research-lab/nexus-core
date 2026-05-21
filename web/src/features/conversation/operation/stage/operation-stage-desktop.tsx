import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Globe2,
  ImageIcon,
  ListChecks,
  ListTree,
  Loader2,
  Maximize2,
  PauseCircle,
  RadioTower,
  RotateCcw,
  Route,
  Search,
  ShieldQuestion,
  Sparkles,
  Terminal,
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
  derive_operation_stage_experience_phase,
} from "../operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
  OperationKind,
  OperationPhase,
  OperationSurface,
} from "../operation-types";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import { format_operation_time } from "../operation-preview";
import { OperationStageWindow } from "./operation-stage-window";

const SURFACE_ACCENT_CLASS_NAME: Record<OperationSurface, string> = {
  workspace: "from-[rgba(91,114,255,0.24)] via-[rgba(91,114,255,0.12)] to-transparent",
  editor: "from-[rgba(79,162,159,0.24)] via-[rgba(79,162,159,0.12)] to-transparent",
  terminal: "from-[rgba(47,184,132,0.22)] via-[rgba(47,184,132,0.1)] to-transparent",
  web: "from-[rgba(223,157,46,0.22)] via-[rgba(223,157,46,0.1)] to-transparent",
  knowledge: "from-[rgba(91,114,255,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  task: "from-[rgba(223,157,46,0.2)] via-[rgba(91,114,255,0.1)] to-transparent",
  conversation: "from-[rgba(91,114,255,0.2)] via-[rgba(255,255,255,0.08)] to-transparent",
  summary: "from-[rgba(47,184,132,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  fallback: "from-[rgba(117,131,149,0.18)] via-[rgba(255,255,255,0.08)] to-transparent",
};

const SURFACE_LABEL: Record<OperationSurface, string> = {
  workspace: "工作区",
  editor: "编辑器",
  terminal: "终端",
  web: "浏览器",
  knowledge: "知识库",
  task: "任务",
  conversation: "运行时",
  summary: "交接",
  fallback: "操作",
};

const PHASE_STATUS_META: Record<OperationPhase, {
  label: string;
  Icon: LucideIcon;
  class_name: string;
}> = {
  queued: {
    label: "排队中",
    Icon: Clock3,
    class_name: "border-white/60 bg-white/62 text-(--text-muted)",
  },
  running: {
    label: "执行中",
    Icon: Loader2,
    class_name: "border-[rgba(47,184,132,0.26)] bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]",
  },
  waiting: {
    label: "等待确认",
    Icon: ShieldQuestion,
    class_name: "border-[rgba(223,157,46,0.30)] bg-[rgba(223,157,46,0.14)] text-[color:var(--warning)]",
  },
  done: {
    label: "已完成",
    Icon: CheckCircle2,
    class_name: "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  },
  error: {
    label: "失败",
    Icon: AlertTriangle,
    class_name: "border-[rgba(223,93,98,0.28)] bg-[rgba(223,93,98,0.12)] text-[color:var(--destructive)]",
  },
  cancelled: {
    label: "已中断",
    Icon: XCircle,
    class_name: "border-white/60 bg-white/62 text-(--text-muted)",
  },
};

interface StageWindowOverride {
  closed?: boolean;
  minimized?: boolean;
  offset_x?: number;
  offset_y?: number;
}

type StageNarrativePhase = "awakening" | "running" | "settling" | "completed";

interface StageNarrativeState {
  phase: StageNarrativePhase;
  label: string;
  detail: string;
}

interface CompletionArtifact {
  id: string;
  label: string;
  value: string;
  type: OperationEvidence["type"] | "workspace";
  Icon: LucideIcon;
}

interface HandoffItem {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

interface HandoffChecklistItem {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

interface ArchiveCapsuleItem {
  id: string;
  label: string;
  value: string;
  meta: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

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
      {narrative.phase === "completed" || narrative.phase === "settling" ? (
        <StageCompletionLedger
          active_event_id={active_narrative_event_id}
          event={event}
          events={narrative_events}
          narrative={narrative}
          on_focus_event={focus_event_window}
          snapshot={snapshot}
        />
      ) : (
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
              <BackgroundWindowSummary window={window} />
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
  windows,
  active_window_id,
  on_restore,
}: {
  windows: StageWindowState[];
  active_window_id: string | null;
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
                  {state_label}
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
                <span className="block text-[9px] font-medium text-white/66">{app_label} · {state_label}</span>
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

const BackgroundWindowSummary = memo(function BackgroundWindowSummary({
  window,
}: {
  window: StageWindowState;
}) {
  const event = window.payload.event;
  const preview_text = window.payload.summary
    ?? event.summary
    ?? window.payload.target
    ?? window.target
    ?? event.target
    ?? event.title;

  return (
    <div className="flex h-full min-h-0 flex-col justify-between gap-3 rounded-[12px] border border-(--divider-subtle-color) bg-white/46 p-3">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-black tracking-[-0.02em] text-(--text-strong)">
          {event.tool_name ?? event.title}
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-(--text-soft)">
          {String(preview_text ?? "等待窗口内容")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-(--text-soft)">
        <span className="truncate">{window.target ?? event.target ?? window.title}</span>
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

function format_elapsed(
  started_at: number | undefined,
  ended_at: number | null | undefined,
  updated_at: number,
): string {
  const start = normalize_timestamp(started_at ?? updated_at);
  const end = normalize_timestamp(ended_at ?? updated_at);
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining_seconds = seconds % 60;
  return `${minutes}m ${remaining_seconds}s`;
}

function normalize_timestamp(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

function collect_completion_artifacts(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): CompletionArtifact[] {
  const artifacts: CompletionArtifact[] = [];
  const seen = new Set<string>();

  const push_artifact = (artifact: CompletionArtifact) => {
    const key = `${artifact.type}:${artifact.value}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    artifacts.push(artifact);
  };

  collect_completion_workspace_artifacts(event, snapshot).slice(0, 4).forEach((item) => {
    push_artifact({
      id: `workspace:${item.id}`,
      label: item.status === "deleted" ? "已删除文件" : item.status === "writing" ? "写入中的文件" : "工作区文件",
      value: item.path,
      type: "workspace",
      Icon: window_kind_for_artifact_path(item.path),
    });
  });

  const evidence_items = [
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ];
  evidence_items.slice(0, 8).forEach((item, index) => {
    const value = item.value ?? item.label;
    if (!value) {
      return;
    }
    push_artifact({
      id: `evidence:${index}:${value}`,
      label: item.label || evidence_type_label(item.type),
      value,
      type: item.type,
      Icon: icon_for_evidence_type(item.type, value),
    });
  });

  if (artifacts.length === 0 && event.target) {
    push_artifact({
      id: `target:${event.id}`,
      label: event.surface === "terminal" ? "执行目标" : "当前目标",
      value: event.target,
      type: event.surface === "terminal" ? "terminal" : "status",
      Icon: event.surface === "terminal" ? Terminal : icon_for_operation_kind(event.kind),
    });
  }

  return artifacts.slice(0, 4);
}

function collect_completion_workspace_artifacts(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationSnapshot["workspace_events"] {
  const workspace_items = snapshot?.workspace_events ?? [];
  if (!workspace_items.length) {
    return [];
  }

  const round_events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const round_tool_use_ids = new Set(
    round_events
      .map((item) => item.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );
  const round_targets = new Set(
    round_events
      .map((item) => item.target)
      .filter((target): target is string => Boolean(target)),
  );

  return workspace_items.filter((item) => (
    Boolean(item.tool_use_id && round_tool_use_ids.has(item.tool_use_id)) ||
    round_targets.has(item.path)
  ));
}

function collect_archive_capsules({
  event,
  events,
  snapshot,
  windows,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  snapshot: NexusOperationSnapshot | null;
  windows: StageWindowState[];
}): ArchiveCapsuleItem[] {
  const artifacts = collect_completion_artifacts(event, snapshot);
  const terminal_count = events.filter((item) => item.surface === "terminal").length;
  const evidence_count = (event.evidence?.length ?? 0) + (snapshot?.recent_evidence.length ?? 0);
  const window_count = windows.filter((window) => window.phase !== "closed").length;
  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");

  return [
    {
      id: "archive-windows",
      label: "窗口现场",
      value: `${window_count} 个窗口`,
      meta: "布局已保存",
      tone: has_error ? "warning" : "success",
      Icon: FolderTree,
    },
    {
      id: "archive-artifacts",
      label: artifacts.length ? "关键产物" : "上下文产物",
      value: artifacts[0]?.value ?? event.target ?? event.title,
      meta: artifacts.length ? `${artifacts.length} 项` : "上下文",
      tone: artifacts.length ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      id: "archive-trace",
      label: "执行轨迹",
      value: `${events.length} 步`,
      meta: terminal_count || evidence_count ? `${terminal_count + evidence_count} 条证据` : "时间线",
      tone: has_error ? "warning" : "success",
      Icon: ListChecks,
    },
  ];
}

function collect_handoff_items({
  artifacts,
  events,
  evidence_count,
  file_count,
  has_error,
  narrative,
  terminal_count,
}: {
  artifacts: CompletionArtifact[];
  events: NexusOperationEvent[];
  evidence_count: number;
  file_count: number;
  has_error: boolean;
  narrative: StageNarrativeState;
  terminal_count: number;
}): HandoffItem[] {
  const settled_count = events.filter((item) => (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;
  const running_count = events.filter((item) => item.phase === "running" || item.phase === "waiting").length;

  return [
    {
      label: narrative.phase === "settling" ? "落盘中" : "轨迹归档",
      value: `${settled_count}/${events.length} 步`,
      tone: has_error ? "warning" : narrative.phase === "completed" ? "success" : "neutral",
      Icon: has_error ? AlertTriangle : CheckCircle2,
    },
    {
      label: "产物",
      value: artifacts.length ? `${artifacts.length} 项` : file_count ? `${file_count} 个文件` : "无",
      tone: artifacts.length || file_count ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      label: running_count ? "仍在现场" : "可继续",
      value: running_count ? `${running_count} 个活动` : `${terminal_count + evidence_count} 条证据`,
      tone: running_count ? "warning" : "neutral",
      Icon: running_count ? Loader2 : Activity,
    },
  ];
}

function collect_handoff_checklist({
  artifacts,
  events,
  evidence_count,
  has_error,
}: {
  artifacts: CompletionArtifact[];
  events: NexusOperationEvent[];
  evidence_count: number;
  has_error: boolean;
}): HandoffChecklistItem[] {
  const waiting_count = events.filter((item) => item.phase === "waiting").length;
  const running_count = events.filter((item) => item.phase === "running").length;
  const failed_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const completed_count = events.filter((item) => item.phase === "done").length;

  return [
    {
      label: failed_count ? "需要回看异常" : "工具轨迹已归档",
      value: failed_count ? `${failed_count} 个异常` : `${completed_count}/${events.length}`,
      tone: failed_count ? "warning" : "success",
      Icon: failed_count ? AlertTriangle : CheckCircle2,
    },
    {
      label: artifacts.length ? "关键产物可打开" : "未形成独立产物",
      value: artifacts.length ? `${artifacts.length} 项` : "仅上下文",
      tone: artifacts.length ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      label: evidence_count ? "证据可追溯" : "证据来自现场窗口",
      value: evidence_count ? `${evidence_count} 条证据` : "窗口状态",
      tone: evidence_count ? "success" : "neutral",
      Icon: evidence_count ? ListChecks : Activity,
    },
    {
      label: waiting_count ? "等待用户确认" : running_count ? "仍有执行窗口" : "可以继续对话",
      value: waiting_count ? `${waiting_count} 个关卡` : running_count ? `${running_count} 个活动` : "就绪",
      tone: waiting_count || running_count || has_error ? "warning" : "neutral",
      Icon: waiting_count ? ShieldQuestion : running_count ? Loader2 : Activity,
    },
  ];
}

function evidence_type_label(type: OperationEvidence["type"]): string {
  if (type === "file" || type === "diff") {
    return "文件证据";
  }
  if (type === "terminal") {
    return "终端输出";
  }
  if (type === "url") {
    return "浏览器记录";
  }
  if (type === "artifact") {
    return "产物";
  }
  if (type === "error") {
    return "错误证据";
  }
  return "执行证据";
}

function icon_for_evidence_type(type: OperationEvidence["type"], value: string): LucideIcon {
  if (type === "terminal") {
    return Terminal;
  }
  if (type === "url") {
    return Globe2;
  }
  if (type === "error") {
    return AlertTriangle;
  }
  if (type === "permission") {
    return ShieldQuestion;
  }
  if (type === "task" || type === "status") {
    return Activity;
  }
  if (type === "file" || type === "diff" || type === "artifact") {
    return window_kind_for_artifact_path(value);
  }
  return CheckCircle2;
}

function window_kind_for_artifact_path(path: string): LucideIcon {
  if (/\.(tsx?|jsx?|json|ya?ml|toml|css|scss|html?)$/i.test(path)) {
    return FileCode2;
  }
  if (/\.(csv|xlsx?|ods)$/i.test(path)) {
    return FileSpreadsheet;
  }
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(path)) {
    return ImageIcon;
  }
  return FileText;
}

function order_windows_for_reveal(
  windows: StageWindowState[],
  active_window_id: string | null,
): StageWindowState[] {
  return [...windows].sort((left, right) => {
    const left_rank = window_reveal_rank(left, active_window_id);
    const right_rank = window_reveal_rank(right, active_window_id);
    if (left_rank !== right_rank) {
      return left_rank - right_rank;
    }
    return right.z - left.z;
  });
}

function window_reveal_rank(window: StageWindowState, active_window_id: string | null): number {
  if (window.id === active_window_id || window.phase === "focused") {
    return 0;
  }
  if (window.kind === "terminal" || window.kind === "browser" || window.kind === "code_editor") {
    return 1;
  }
  if (window.kind === "runtime_handoff" || window.kind === "run_manifest") {
    return 1;
  }
  if (window.kind === "finder" || window.layout === "artifact") {
    return 2;
  }
  if (window.kind === "evidence" || window.kind === "permission_wait") {
    return 3;
  }
  return 2;
}

function useRevealedWindowCount({
  event_key,
  minimum_count,
  phase,
  window_count,
}: {
  event_key: string;
  minimum_count: number;
  phase: StageNarrativePhase;
  window_count: number;
}): number {
  const [revealed_count, set_revealed_count] = useState(window_count);

  useEffect(() => {
    if (window_count <= 0) {
      set_revealed_count(0);
      return;
    }
    if (phase === "completed" || phase === "settling") {
      set_revealed_count(window_count);
      return;
    }

    set_revealed_count(minimum_count);
    const hidden_count = Math.max(0, window_count - minimum_count);
    const timers = Array.from({ length: hidden_count }).map((_, index) => (
      window.setTimeout(() => {
        set_revealed_count((current) => Math.max(current, minimum_count + index + 1));
      }, 620 + index * 320)
    ));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [event_key, minimum_count, phase, window_count]);

  return Math.min(revealed_count, window_count);
}

function minimum_revealed_window_count({
  event_count,
  phase,
  window_count,
}: {
  event_count: number;
  phase: StageNarrativePhase;
  window_count: number;
}): number {
  if (window_count <= 0) {
    return 0;
  }
  if (phase === "completed" || phase === "settling") {
    return window_count;
  }
  return Math.min(window_count, Math.max(1, event_count));
}

function build_stage_narrative(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): StageNarrativeState {
  const events = collect_narrative_events(event, snapshot);
  const phase = derive_operation_stage_experience_phase(event, snapshot);
  if (phase === "awakening") {
    return {
      phase: "awakening",
      label: "唤醒工作台",
      detail: "nexus 字符场正在展开为执行现场",
    };
  }
  if (event.phase === "waiting") {
    return {
      phase: "running",
      label: "等待确认",
      detail: "工具已暂停，等待用户确认后继续",
    };
  }
  if (phase === "running") {
    if (event.surface === "conversation") {
      return {
        phase: "running",
        label: "运行接入",
        detail: "运行时正在装载上下文，等待第一个工具事件",
      };
    }
    return {
      phase: "running",
      label: "现场执行",
      detail: `${events.length} 个工具动作正在形成工作台轨迹`,
    };
  }
  if (
    phase === "completed" ||
    (phase === "settling" && (event.phase === "done" || event.phase === "cancelled"))
  ) {
    return {
      phase,
      label: phase === "completed" ? "完成沉淀" : "结果落盘",
      detail: "工具窗口已收束为可回看的执行现场",
    };
  }
  return {
    phase: "settling",
    label: "异常回看",
    detail: "执行现场保留错误证据与上下文",
  };
}

function collect_narrative_events(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationEvent[] {
  const events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [];
  const merged = events.some((item) => item.id === event.id) ? events : [...events, event];
  const sorted = [...merged].sort((left, right) => left.updated_at - right.updated_at);
  const active_index = sorted.findIndex((item) => item.id === event.id);
  if (active_index < 0) {
    return sorted.slice(-10);
  }
  return sorted.slice(0, active_index + 1).slice(-10);
}

function icon_for_operation_kind(kind: OperationKind): LucideIcon {
  if (kind === "workspace_inspect") {
    return ListTree;
  }
  if (kind === "workspace_search") {
    return Search;
  }
  if (kind === "workspace_read") {
    return FileText;
  }
  if (kind === "workspace_edit" || kind === "artifact_update") {
    return Edit3;
  }
  if (kind === "command_run" || kind === "command_stop") {
    return Terminal;
  }
  if (kind === "web_research") {
    return Globe2;
  }
  if (kind === "task_delegate" || kind === "task_progress") {
    return Activity;
  }
  if (kind === "plan_update") {
    return Code2;
  }
  return CheckCircle2;
}

function icon_for_window_kind(kind: StageWindowKind): LucideIcon {
  if (kind === "finder") {
    return FolderTree;
  }
  if (kind === "terminal") {
    return Terminal;
  }
  if (kind === "browser") {
    return Globe2;
  }
  if (kind === "task_board") {
    return Activity;
  }
  if (kind === "runtime_handoff") {
    return RadioTower;
  }
  if (kind === "run_manifest") {
    return ListChecks;
  }
  if (kind === "evidence") {
    return CheckCircle2;
  }
  if (kind === "permission_wait") {
    return ShieldQuestion;
  }
  if (kind === "spreadsheet") {
    return FileSpreadsheet;
  }
  if (kind === "image_viewer") {
    return ImageIcon;
  }
  if (kind === "code_editor") {
    return FileCode2;
  }
  return FileText;
}

function stage_app_label_for_window_kind(kind: StageWindowKind): string {
  if (kind === "finder") {
    return "文件";
  }
  if (kind === "terminal") {
    return "终端";
  }
  if (kind === "browser") {
    return "浏览器";
  }
  if (kind === "task_board") {
    return "任务";
  }
  if (kind === "runtime_handoff") {
    return "运行接入";
  }
  if (kind === "run_manifest") {
    return "执行清单";
  }
  if (kind === "evidence") {
    return "证据";
  }
  if (kind === "permission_wait") {
    return "授权";
  }
  if (kind === "spreadsheet") {
    return "表格";
  }
  if (kind === "image_viewer") {
    return "图片";
  }
  if (kind === "code_editor") {
    return "编辑器";
  }
  if (kind === "markdown_reader" || kind === "word_reader" || kind === "pdf_reader") {
    return "阅读器";
  }
  return "工具";
}

function position_for_window(window: StageWindowState, narrative_phase: StageNarrativePhase): string {
  const is_review_layout = narrative_phase === "completed";
  if (window.layout === "terminal") {
    if (is_review_layout) {
      return window.phase === "focused"
        ? "left-[29%] top-[24%] h-[48%] w-[38%]"
        : "left-[24%] bottom-[7%] h-[24%] w-[40%]";
    }
    return window.phase === "focused"
      ? "left-[19%] top-[24%] h-[48%] w-[52%]"
      : "left-[24%] bottom-[7%] h-[24%] w-[42%]";
  }
  if (window.layout === "inspector") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[33%] bottom-[8%] h-16 w-[18%]" : "right-[6%] bottom-[8%] h-16 w-[20%]"
      : is_review_layout ? "right-[33%] bottom-[7%] h-[22%] w-[22%]" : "right-[5%] bottom-[7%] h-[23%] w-[25%]";
  }
  if (window.layout === "secondary") {
    return "left-[4%] top-[15%] h-[43%] w-[22%]";
  }
  if (window.kind === "permission_wait") {
    return window.phase === "minimized"
      ? "left-[36%] bottom-[8%] h-16 w-[28%]"
      : is_review_layout ? "left-[31%] top-[20%] h-[46%] w-[38%]" : "left-[30%] top-[22%] h-[46%] w-[40%]";
  }
  if (window.layout === "artifact") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[33%] bottom-[8%] h-16 w-[22%]" : "right-[6%] bottom-[8%] h-16 w-[25%]"
      : is_review_layout ? "right-[33%] top-[17%] h-[44%] w-[25%]" : "right-[7%] top-[17%] h-[44%] w-[28%]";
  }
  if (window.kind === "browser") {
    return window.phase === "focused"
      ? is_review_layout ? "right-[31%] top-[12%] h-[64%] w-[42%]" : "right-[5%] top-[12%] h-[64%] w-[46%]"
      : is_review_layout ? "right-[35%] top-[16%] h-[48%] w-[30%]" : "right-[6%] top-[16%] h-[48%] w-[34%]";
  }
  if (window.kind === "task_board") {
    return is_review_layout ? "left-[25%] top-[15%] h-[50%] w-[40%]" : "left-[27%] top-[15%] h-[50%] w-[42%]";
  }
  if (window.kind === "runtime_handoff") {
    return "left-[24%] top-[18%] h-[52%] w-[46%]";
  }
  if (window.kind === "run_manifest") {
    return is_review_layout ? "left-[23%] top-[13%] h-[59%] w-[45%]" : "left-[27%] top-[14%] h-[56%] w-[43%]";
  }
  if (window.kind === "summary") {
    return is_review_layout ? "left-[28%] top-[16%] h-[50%] w-[38%]" : "left-[31%] top-[16%] h-[50%] w-[40%]";
  }
  return "left-[28%] top-[11%] h-[58%] w-[41%]";
}
