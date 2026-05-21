"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  FolderTree,
  Globe2,
  Loader2,
  MessageSquare,
  ShieldQuestion,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { WorkspaceSurfaceToolbarAction } from "@/shared/ui/workspace/surface/workspace-surface-header";
import { WorkspaceSurfaceView } from "@/shared/ui/workspace/surface/workspace-surface-view";
import type { AgentConversationIdentity } from "@/types/agent/agent-conversation";

import {
  build_operation_stage_key,
  useOperationStageStore,
} from "./operation-store";
import { derive_operation_stage_experience_phase } from "./operation-stage-experience";
import { OperationStageDesktop } from "./stage/operation-stage-desktop";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationPhase,
  OperationSurface,
} from "./operation-types";

interface OperationStagePanelProps {
  identity: AgentConversationIdentity | null;
  agent_name?: string | null;
  header_action?: ReactNode;
  presentation?: "panel" | "stage";
}

interface SurfaceMeta {
  label: string;
  Icon: LucideIcon;
  accent_class_name: string;
}

interface PhaseMeta {
  label: string;
  Icon: LucideIcon;
  class_name: string;
}

interface IdleParticle {
  x: number;
  y: number;
  alpha: number;
  drift: number;
  glyph: string;
  phase: number;
  size: number;
}

type StageTransitionIntent =
  | "browser"
  | "editor"
  | "permission"
  | "summary"
  | "task"
  | "terminal"
  | "workspace";

type StageTransitionPhase = "idle" | "priming" | "materializing" | "handoff" | "live";

interface StageTransitionState {
  intent: StageTransitionIntent;
  phase: StageTransitionPhase;
  sequence: number;
}

const IDLE_PARTICLE_GLYPHS = ["{", "}", "<", ">", "/", "\\", "0", "1", "n", "x", "+", "·", ";", ":"];

const SURFACE_META: Record<OperationSurface, SurfaceMeta> = {
  workspace: {
    label: "工作区",
    Icon: FolderTree,
    accent_class_name: "from-[rgba(91,114,255,0.24)] via-[rgba(91,114,255,0.12)] to-transparent",
  },
  editor: {
    label: "编辑器",
    Icon: Code2,
    accent_class_name: "from-[rgba(79,162,159,0.24)] via-[rgba(79,162,159,0.12)] to-transparent",
  },
  terminal: {
    label: "终端",
    Icon: Terminal,
    accent_class_name: "from-[rgba(47,184,132,0.22)] via-[rgba(47,184,132,0.1)] to-transparent",
  },
  web: {
    label: "浏览器",
    Icon: Globe2,
    accent_class_name: "from-[rgba(223,157,46,0.22)] via-[rgba(223,157,46,0.1)] to-transparent",
  },
  knowledge: {
    label: "知识库",
    Icon: FileText,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  task: {
    label: "任务",
    Icon: Activity,
    accent_class_name: "from-[rgba(223,157,46,0.2)] via-[rgba(91,114,255,0.1)] to-transparent",
  },
  conversation: {
    label: "运行时",
    Icon: MessageSquare,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(255,255,255,0.08)] to-transparent",
  },
  summary: {
    label: "交接",
    Icon: CheckCircle2,
    accent_class_name: "from-[rgba(47,184,132,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  fallback: {
    label: "操作",
    Icon: Sparkles,
    accent_class_name: "from-[rgba(117,131,149,0.18)] via-[rgba(255,255,255,0.08)] to-transparent",
  },
};

const PHASE_META: Record<OperationPhase, PhaseMeta> = {
  queued: {
    label: "排队中",
    Icon: Clock3,
    class_name: "chip-pill text-(--text-muted)",
  },
  running: {
    label: "执行中",
    Icon: Loader2,
    class_name: "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  },
  waiting: {
    label: "等待确认",
    Icon: ShieldQuestion,
    class_name: "border-[rgba(223,157,46,0.28)] bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]",
  },
  done: {
    label: "已完成",
    Icon: CheckCircle2,
    class_name: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.09)] text-[color:var(--success)]",
  },
  error: {
    label: "失败",
    Icon: AlertTriangle,
    class_name: "border-[rgba(223,93,98,0.26)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
  },
  cancelled: {
    label: "已中断",
    Icon: XCircle,
    class_name: "chip-pill text-(--text-muted)",
  },
};

function OperationStageMotionStyles() {
  return (
    <style>
      {`
        @keyframes nexus-operation-window-enter {
          0% { opacity: 0; transform: translate3d(0, 14px, 0) scale(0.985); filter: blur(3px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        @keyframes nexus-operation-window-float {
          0%, 100% {
            translate:
              var(--operation-window-drag-x, 0px)
              var(--operation-window-drag-y, 0px);
          }
          50% {
            translate:
              var(--operation-window-drag-x, 0px)
              calc(var(--operation-window-drag-y, 0px) - 3px);
          }
        }

        @keyframes nexus-operation-preview-line {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes nexus-operation-scan {
          0% { transform: translateY(-18px); opacity: 0; }
          12% { opacity: 0.85; }
          100% { transform: translateY(180px); opacity: 0; }
        }

        @keyframes nexus-operation-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes nexus-operation-caret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        @keyframes nexus-operation-pulse-width {
          0%, 100% { transform: scaleX(0.86); opacity: 0.7; }
          50% { transform: scaleX(1); opacity: 1; }
        }

        @keyframes nexus-operation-focus-dot {
          0%, 100% { transform: translate(-50%, -50%) scale(0.72); opacity: 0.52; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
        }

        @keyframes nexus-operation-scene-enter {
          0% {
            opacity: 0.12;
            transform:
              translate3d(
                var(--operation-scene-enter-x, 0),
                var(--operation-scene-enter-y, 14px),
                0
              )
              scale(.992);
            filter: blur(5px);
          }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes nexus-operation-idle-exit {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          46% { opacity: .68; filter: blur(.5px); }
          100% {
            opacity: 0;
            transform:
              translate3d(
                var(--operation-idle-exit-x, 0),
                var(--operation-idle-exit-y, 0),
                0
              )
              scale(var(--operation-idle-exit-scale, 1.035));
            filter: blur(var(--operation-idle-exit-blur, 4px));
          }
        }

        @keyframes nexus-operation-idle-particles-yield {
          0% { opacity: .94; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          38% { opacity: .82; transform: translate3d(0, -2px, 0) scale(.99); filter: blur(.2px); }
          100% {
            opacity: 0;
            transform:
              translate3d(
                calc(var(--operation-idle-exit-x, 0) * .42),
                calc(var(--operation-idle-exit-y, 0) * .42),
                0
              )
              scale(.86);
            filter: blur(2.5px);
          }
        }

        @keyframes nexus-operation-idle-pulse {
          0%, 100% { opacity: .9; transform: translate3d(0, 0, 0) scale(1); }
          50% { opacity: 1; transform: translate3d(0, -2px, 0) scale(1.006); }
        }

        @keyframes nexus-operation-boot-signal {
          0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(.985); filter: blur(4px); }
          42% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: .88; transform: translate3d(0, -4px, 0) scale(1.006); filter: blur(.2px); }
        }

        @keyframes nexus-operation-boot-line {
          0% { transform: scaleX(.12); opacity: .3; }
          48% { transform: scaleX(.76); opacity: .88; }
          100% { transform: scaleX(1); opacity: .72; }
        }

        @keyframes nexus-operation-event-signal {
          0% { opacity: 0; transform: translate3d(-50%, -10px, 0) scale(.985); filter: blur(3px); }
          20% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); filter: blur(0); }
          78% { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate3d(-50%, -4px, 0) scale(1.006); filter: blur(.8px); }
        }

        .operation-stage-window {
          animation:
            nexus-operation-window-enter 420ms cubic-bezier(.18,.88,.24,1) both,
            nexus-operation-window-float 7.5s ease-in-out infinite;
          animation-delay: var(--operation-delay, 0ms), calc(var(--operation-delay, 0ms) + 420ms);
          transform-origin: 50% 60%;
        }

        .operation-stage-window-focus {
          box-shadow:
            0 32px 82px rgba(34,48,72,.18),
            0 0 0 1px rgba(255,255,255,.72),
            0 0 24px rgba(91,114,255,.12);
        }

        .operation-stage-window-dragging {
          animation-play-state: paused;
          box-shadow:
            0 36px 90px rgba(34,48,72,.22),
            0 0 0 1px rgba(255,255,255,.78),
            0 0 28px rgba(91,114,255,.14);
        }

        .operation-stage-narrative-awakening .operation-stage-aura {
          opacity: .36;
          transform: translate(-50%, -50%) scale(.82);
        }

        .operation-stage-narrative-running .operation-stage-light {
          opacity: .88;
        }

        .operation-stage-narrative-settling .operation-stage-window,
        .operation-stage-narrative-completed .operation-stage-window {
          animation-duration: 420ms, 11s;
        }

        .operation-preview-line {
          animation: nexus-operation-preview-line 320ms ease-out both;
          animation-delay: var(--operation-delay, 0ms);
        }

        .operation-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 42px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(91,114,255,.46), rgba(79,162,159,.36), transparent);
          animation: nexus-operation-scan 2.6s ease-in-out infinite;
        }

        .operation-stage-gridlines {
          background-image:
            linear-gradient(rgba(71,85,105,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(71,85,105,.045) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at 50% 45%, black, transparent 72%);
        }

        .operation-stage-light {
          position: absolute;
          left: 50%;
          top: -130px;
          width: 560px;
          height: 430px;
          border-radius: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(255,255,255,.74), rgba(91,114,255,.12) 38%, transparent 70%);
          filter: blur(10px);
          pointer-events: none;
        }

        .operation-desktop-shadow {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 48px;
          height: 32px;
          border-radius: 50%;
          background: rgba(66,80,102,.16);
          filter: blur(22px);
          pointer-events: none;
        }

        .operation-terminal-caret {
          display: inline-block;
          width: 7px;
          height: 14px;
          margin-left: 2px;
          background: #d9ffe5;
          animation: nexus-operation-caret 1s step-end infinite;
        }

        .operation-web-loading {
          position: relative;
          overflow: hidden;
        }

        .operation-web-loading::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.18) 42%, transparent 62%);
          transform: translateX(-120%);
          animation: nexus-operation-shimmer 2.2s ease-in-out infinite;
        }

        .operation-diff-bar {
          height: 10px;
          border-radius: 999px;
          transform-origin: left center;
          animation: nexus-operation-pulse-width 1.8s ease-in-out infinite;
        }

        .operation-phase-meter {
          animation: nexus-operation-pulse-width 1.6s ease-in-out infinite;
          transform-origin: left center;
        }

        .operation-focus-dot {
          animation: nexus-operation-focus-dot 1.8s ease-in-out infinite;
        }

        .operation-stage-scene-enter {
          animation: nexus-operation-scene-enter 920ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-idle-stage-exit {
          animation: nexus-operation-idle-exit 920ms cubic-bezier(.16,.84,.24,1) both;
          background: transparent !important;
        }

        .operation-idle-stage-exit .operation-idle-sky,
        .operation-idle-stage-exit .operation-idle-grid,
        .operation-idle-stage-exit .operation-idle-dotfield {
          opacity: 0;
          transition: opacity 180ms ease-out;
        }

        .operation-idle-stage-exit .operation-idle-particle-canvas {
          animation: nexus-operation-idle-particles-yield 920ms cubic-bezier(.16,.84,.24,1) both;
        }

        .operation-idle-stage-exit .operation-idle-agent-pill,
        .operation-idle-stage-exit .operation-idle-status-card,
        .operation-idle-stage-exit .operation-idle-clock {
          opacity: 0;
          transition: opacity 220ms ease-out;
        }

        .operation-idle-particle-canvas {
          animation: nexus-operation-idle-pulse 8.5s ease-in-out infinite;
        }

        .operation-boot-signal {
          animation: nexus-operation-boot-signal 1040ms cubic-bezier(.2,.8,.2,1) both;
        }

        .operation-boot-line {
          animation: nexus-operation-boot-line 1040ms cubic-bezier(.2,.8,.2,1) both;
          transform-origin: left center;
        }

        .operation-event-signal {
          animation: nexus-operation-event-signal 1400ms cubic-bezier(.16,.84,.24,1) both;
        }

        @media (max-width: 767px) {
          .operation-stage-mobile-panel {
            left: auto !important;
            right: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            transform: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .operation-stage-window,
          .operation-preview-line,
          .operation-scan-line,
          .operation-stage-light,
          .operation-terminal-caret,
          .operation-web-loading::after,
          .operation-diff-bar,
          .operation-phase-meter,
          .operation-focus-dot,
          .operation-stage-scene-enter,
          .operation-idle-stage-exit,
          .operation-idle-stage-exit .operation-idle-particle-canvas,
          .operation-idle-particle-canvas,
          .operation-boot-signal,
          .operation-boot-line,
          .operation-event-signal {
            animation: none !important;
          }
        }
      `}
    </style>
  );
}

export function OperationStagePanel({
  identity,
  agent_name,
  header_action,
  presentation = "panel",
}: OperationStagePanelProps) {
  const [is_debug_open, set_is_debug_open] = useState(false);
  const stage_key = build_operation_stage_key(identity);
  const snapshot = useOperationStageStore((state) => (
    stage_key ? state.snapshots[stage_key] : null
  ));
  const display_event = snapshot?.active_event ?? snapshot?.events.at(-1) ?? null;
  const phase_meta = display_event ? PHASE_META[display_event.phase] : null;
  const PhaseIcon = phase_meta?.Icon;
  const subtitle = display_event
    ? `${agent_name || display_event.agent_id || "Agent"} / ${SURFACE_META[display_event.surface].label}`
    : agent_name || "Agent";
  const stage_surface = (
    <>
      <OperationStageMotionStyles />
      <StageSurface
        active_event={display_event}
        header_action={header_action}
        is_debug_open={is_debug_open}
        presentation={presentation}
        snapshot={snapshot ?? null}
        subtitle={subtitle}
        on_toggle_debug={() => set_is_debug_open((value) => !value)}
      />
    </>
  );

  if (presentation === "stage") {
    return stage_surface;
  }

  return (
    <WorkspaceSurfaceView
      action={(
        <div className="flex items-center gap-2">
          <WorkspaceSurfaceToolbarAction onClick={() => set_is_debug_open((value) => !value)}>
            <Bug className="h-3.5 w-3.5" />
            证据
          </WorkspaceSurfaceToolbarAction>
          {header_action}
        </div>
      )}
      body_class_name="px-2 py-2 sm:px-3 xl:px-4"
      body_scrollable={false}
      content_class_name="flex h-full min-h-0 max-w-none"
      eyebrow="操作"
      max_width_class_name="max-w-none"
      show_eyebrow={false}
      title="操作舞台"
      title_trailing={phase_meta && PhaseIcon ? (
        <span className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold",
          phase_meta.class_name,
        )}>
          <PhaseIcon className={cn("h-3.5 w-3.5", display_event?.phase === "running" && "animate-spin")} />
          {phase_meta.label}
        </span>
      ) : null}
    >
      {stage_surface}
    </WorkspaceSurfaceView>
  );
}

function StageSurface({
  active_event,
  snapshot,
  subtitle,
  presentation,
  header_action,
  is_debug_open,
  on_toggle_debug,
}: {
  active_event: NexusOperationEvent | null;
  snapshot: NexusOperationSnapshot | null;
  subtitle: string;
  presentation: "panel" | "stage";
  header_action?: ReactNode;
  is_debug_open: boolean;
  on_toggle_debug: () => void;
}) {
  const is_stage = presentation === "stage";
  const stage_transition = useStageTransition(active_event);
  const is_scene_entering = stage_transition.phase === "priming" || stage_transition.phase === "materializing";
  const is_event_handoff = stage_transition.phase === "handoff";
  const experience_phase = derive_operation_stage_experience_phase(active_event, snapshot);
  const transition_style = build_stage_transition_style(stage_transition.intent);
  const round_event_count = active_event && snapshot
    ? snapshot.events.filter((item) => item.round_id === active_event.round_id).length
    : active_event ? 1 : 0;

  return (
    <section className={cn(
      "relative flex h-full min-h-[420px] w-full max-w-full min-w-0 flex-1 overflow-hidden text-(--text-strong)",
      is_stage
        ? "rounded-[24px] border border-[color:color-mix(in_srgb,var(--divider-subtle-color)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-panel-background)_78%,transparent)] p-2 shadow-[0_24px_80px_rgba(18,28,42,0.12)]"
        : "surface-panel rounded-[22px] border border-(--surface-panel-border) bg-(--surface-panel-background) shadow-(--surface-panel-shadow)",
    )}
    data-stage-experience-phase={experience_phase}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_30%_at_10%_8%,rgba(91,114,255,0.065),transparent_70%),radial-gradient(36%_34%_at_90%_92%,rgba(79,162,159,0.075),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />

      <div className="relative z-10 flex min-h-0 min-w-0 max-w-full flex-1 flex-col">
        <div className={cn("min-h-0 min-w-0 max-w-full flex-1", is_stage ? "p-0" : "px-4 pb-4 pt-4")}>
          <div className={cn(
            "relative h-full min-h-[300px] min-w-0 max-w-full overflow-hidden border border-white/60 bg-[rgba(245,248,252,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_30px_76px_rgba(55,70,90,0.14)]",
            is_stage ? "rounded-[20px]" : "rounded-[22px]",
          )}>
            {active_event ? (
              <>
                {is_scene_entering ? (
                  <EmptyStage
                    active_event={active_event}
                    exiting
                    key={`idle-exit-${stage_transition.sequence}`}
                    subtitle={subtitle}
                    transition_intent={stage_transition.intent}
                  />
                ) : null}
                <div
                  className={cn("h-full min-h-0", is_scene_entering && "operation-stage-scene-enter")}
                  key={is_scene_entering ? `scene-enter-${stage_transition.sequence}` : "scene-live"}
                  style={is_scene_entering ? transition_style : undefined}
                >
                  <StageScene
                    event={active_event}
                    snapshot={snapshot}
                  />
                </div>
                {is_event_handoff ? (
                  <StageEventSignal
                    event={active_event}
                    intent={stage_transition.intent}
                    round_event_count={round_event_count}
                    sequence={stage_transition.sequence}
                  />
                ) : null}
              </>
            ) : (
              <EmptyStage subtitle={subtitle} />
            )}
          </div>
        </div>
      </div>

      {is_stage ? (
        <StageOverlayControls
          header_action={header_action}
          is_debug_open={is_debug_open}
          on_toggle_debug={on_toggle_debug}
        />
      ) : null}

      {is_debug_open ? (
        <DebugOverlay
          event={active_event}
          presentation={presentation}
          snapshot={snapshot}
        />
      ) : null}
    </section>
  );
}

function StageOverlayControls({
  header_action,
  is_debug_open,
  on_toggle_debug,
}: {
  header_action?: ReactNode;
  is_debug_open: boolean;
  on_toggle_debug: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-full border border-white/70 bg-white/72 p-1 text-(--icon-default) opacity-75 shadow-[0_14px_34px_rgba(18,28,42,0.12)] backdrop-blur-xl transition-opacity hover:opacity-100 focus-within:opacity-100">
      <button
        aria-label="切换证据摘要"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-(--icon-default) transition hover:bg-(--surface-interactive-hover-background) hover:text-(--text-strong)",
          is_debug_open && "bg-(--surface-interactive-active-background) text-(--text-strong)",
        )}
        onClick={on_toggle_debug}
        type="button"
      >
        <Bug className="h-3.5 w-3.5" />
      </button>
      {header_action ? (
        <div className="[&_button]:h-7 [&_button]:w-7 [&_button]:gap-0 [&_button]:rounded-full [&_button]:border-transparent [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[0px] [&_button]:shadow-none [&_svg]:h-3.5 [&_svg]:w-3.5">
          {header_action}
        </div>
      ) : null}
    </div>
  );
}

function StageScene({
  event,
  snapshot,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
}) {
  return <OperationStageDesktop event={event} snapshot={snapshot} />;
}

function useStageTransition(active_event: NexusOperationEvent | null): StageTransitionState {
  const [transition, set_transition] = useState<StageTransitionState>(() => ({
    intent: active_event ? resolve_stage_transition_intent(active_event) : "summary",
    phase: active_event ? "live" : "idle",
    sequence: 0,
  }));
  const previous_event_key_ref = useRef<string | null>(active_event ? build_stage_event_key(active_event) : null);

  useEffect(() => {
    if (!active_event) {
      previous_event_key_ref.current = null;
      set_transition((current) => ({
        intent: current.intent,
        phase: "idle",
        sequence: current.sequence,
      }));
      return;
    }

    const next_event_key = build_stage_event_key(active_event);
    const next_intent = resolve_stage_transition_intent(active_event);
    const is_idle_entry = previous_event_key_ref.current === null;
    const is_same_event_state = previous_event_key_ref.current === next_event_key;
    previous_event_key_ref.current = next_event_key;

    if (is_same_event_state) {
      return;
    }

    if (!is_idle_entry) {
      let cancelled = false;
      set_transition((current) => ({
        intent: next_intent,
        phase: "handoff",
        sequence: current.sequence + 1,
      }));

      const live_timer = window.setTimeout(() => {
        if (!cancelled) {
          set_transition((current) => ({
            ...current,
            phase: "live",
          }));
        }
      }, 1400);

      return () => {
        cancelled = true;
        window.clearTimeout(live_timer);
      };
    }

    let cancelled = false;
    set_transition((current) => ({
      intent: next_intent,
      phase: "priming",
      sequence: current.sequence + 1,
    }));

    const materialize_timer = window.setTimeout(() => {
      if (!cancelled) {
        set_transition((current) => ({
          ...current,
          phase: "materializing",
        }));
      }
    }, 120);
    const live_timer = window.setTimeout(() => {
      if (!cancelled) {
        set_transition((current) => ({
          ...current,
          phase: "live",
        }));
      }
    }, 1120);

    return () => {
      cancelled = true;
      window.clearTimeout(materialize_timer);
      window.clearTimeout(live_timer);
    };
  }, [active_event]);

  return transition;
}

function build_stage_event_key(event: NexusOperationEvent): string {
  return `${event.id}:${event.phase}`;
}

function resolve_stage_transition_intent(event: NexusOperationEvent): StageTransitionIntent {
  if (event.phase === "waiting" || event.surface === "conversation" || event.kind === "human_gate") {
    return "permission";
  }
  if (event.surface === "terminal") {
    return "terminal";
  }
  if (event.surface === "web") {
    return "browser";
  }
  if (event.surface === "task") {
    return "task";
  }
  if (event.surface === "workspace") {
    return "workspace";
  }
  if (event.surface === "editor" || event.surface === "knowledge") {
    return "editor";
  }
  return "summary";
}

function build_stage_transition_style(intent: StageTransitionIntent): CSSProperties {
  const map: Record<StageTransitionIntent, Record<string, string>> = {
    browser: {
      "--operation-idle-exit-x": "16%",
      "--operation-idle-exit-y": "-2%",
      "--operation-idle-exit-scale": "1.06",
      "--operation-scene-enter-x": "28px",
      "--operation-scene-enter-y": "4px",
    },
    editor: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "-5%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "18px",
    },
    permission: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "0",
      "--operation-idle-exit-scale": "1.015",
      "--operation-idle-exit-blur": "4px",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "0",
    },
    summary: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "-2%",
      "--operation-idle-exit-scale": "1.03",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "12px",
    },
    task: {
      "--operation-idle-exit-x": "2%",
      "--operation-idle-exit-y": "-8%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "10px",
      "--operation-scene-enter-y": "8px",
    },
    terminal: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "14%",
      "--operation-idle-exit-scale": ".96",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "34px",
    },
    workspace: {
      "--operation-idle-exit-x": "-14%",
      "--operation-idle-exit-y": "-1%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "-24px",
      "--operation-scene-enter-y": "8px",
    },
  };

  return map[intent] as CSSProperties;
}

function EmptyStage({
  active_event = null,
  exiting = false,
  subtitle,
  transition_intent = "summary",
}: {
  active_event?: NexusOperationEvent | null;
  exiting?: boolean;
  subtitle: string;
  transition_intent?: StageTransitionIntent;
}) {
  const now = useStageClock();
  const time_label = format_stage_clock(now);
  const second_label = format_stage_seconds(now);
  const transition_style = build_stage_transition_style(transition_intent);

  return (
    <div className={cn(
      "relative h-full min-h-[300px] overflow-hidden bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(239,244,251,0.86))]",
      exiting && "pointer-events-none absolute inset-0 z-20 operation-idle-stage-exit",
    )}
    data-stage-experience-phase={exiting ? "awakening" : "idle"}
    style={exiting ? transition_style : undefined}
    >
      <div className="operation-idle-sky pointer-events-none absolute inset-0 bg-[radial-gradient(60%_48%_at_50%_43%,rgba(255,255,255,0.96),transparent_72%),radial-gradient(44%_30%_at_50%_62%,rgba(91,114,255,0.13),transparent_75%)]" />
      <div className="operation-idle-grid operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="operation-idle-dotfield pointer-events-none absolute inset-0 opacity-[0.32] [background-image:radial-gradient(rgba(91,114,255,0.16)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_78%,transparent)]" />

      <StageIdleParticles />

      <div className="operation-idle-clock pointer-events-none absolute bottom-8 left-8 z-10 flex items-end gap-2 max-sm:bottom-5 max-sm:left-5">
        <div className="font-mono text-[54px] font-semibold leading-none tracking-normal text-[rgba(32,43,58,0.88)] max-sm:text-[42px]">
          {time_label}
        </div>
        <div className="pb-1.5 font-mono text-[24px] font-semibold leading-none tracking-normal text-[rgba(32,43,58,0.28)] max-sm:text-[18px]">
          :{second_label}
        </div>
      </div>

      <div className="operation-idle-agent-pill pointer-events-none absolute right-8 top-7 z-10 flex max-w-[220px] justify-end max-sm:right-5 max-sm:top-5">
        <div className="min-w-0 rounded-full border border-white/72 bg-white/54 px-3 py-1.5 text-right text-[11px] font-semibold text-(--text-soft) shadow-[0_14px_34px_rgba(18,28,42,0.08)] backdrop-blur-xl">
          <span className="block truncate">{subtitle}</span>
        </div>
      </div>

      <IdleWorkstationStatus subtitle={subtitle} />

      {exiting && active_event ? (
        <StageBootSignal
          event={active_event}
          intent={transition_intent}
        />
      ) : null}
    </div>
  );
}

function IdleWorkstationStatus({ subtitle }: { subtitle: string }) {
  return (
    <div className="operation-idle-status-card pointer-events-none absolute left-8 top-7 z-10 w-[min(320px,calc(100%-4rem))] max-sm:left-5 max-sm:top-5 max-sm:w-[min(280px,calc(100%-2.5rem))]">
      <div className="rounded-[18px] border border-white/66 bg-white/46 p-3 shadow-[0_18px_46px_rgba(18,28,42,0.09)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">nexus 字符场</p>
              <p className="truncate text-[10px] font-semibold text-(--text-soft)">{subtitle}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.10)] px-2 py-1 text-[9.5px] font-bold text-[color:var(--success)]">
            待机
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <IdleStatusMetric label="状态" value="就绪" />
          <IdleStatusMetric label="现场" value="空" />
          <IdleStatusMetric label="轨迹" value="0" />
        </div>
      </div>
    </div>
  );
}

function IdleStatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/42 bg-white/32 px-2 py-1.5">
      <p className="truncate text-[10.5px] font-black text-(--text-strong)">{value}</p>
      <p className="mt-0.5 truncate text-[8.5px] font-semibold text-(--text-soft)">{label}</p>
    </div>
  );
}

function StageBootSignal({
  event,
  intent,
}: {
  event: NexusOperationEvent;
  intent: StageTransitionIntent;
}) {
  const meta = surface_meta_for_transition(event, intent);
  const Icon = meta.Icon;
  const phase_meta = PHASE_META[event.phase];
  const PhaseIcon = phase_meta.Icon;

  return (
    <div className="operation-boot-signal pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(420px,calc(100%-2.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-white/72 bg-white/66 p-3 shadow-[0_28px_70px_rgba(18,28,42,0.16)] backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-gradient-to-br text-[color:var(--primary)]",
          meta.accent_class_name,
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-black tracking-[-0.025em] text-(--text-strong)">
              唤醒 {meta.label}
            </span>
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold",
              phase_meta.class_name,
            )}>
              <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
              {phase_meta.label}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold text-(--text-muted)">
            {event.tool_name ?? event.title} · {event.target ?? event.summary ?? event.title}
          </p>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-full bg-[rgba(91,114,255,0.10)]">
        <div className="operation-boot-line h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(91,114,255,0.68),rgba(79,162,159,0.62),rgba(47,184,132,0.58))]" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[9.5px] font-semibold text-(--text-soft)">
        <span>nexus 字符场</span>
        <span>执行现场</span>
      </div>
    </div>
  );
}

function StageEventSignal({
  event,
  intent,
  round_event_count,
  sequence,
}: {
  event: NexusOperationEvent;
  intent: StageTransitionIntent;
  round_event_count: number;
  sequence: number;
}) {
  const meta = surface_meta_for_transition(event, intent);
  const Icon = meta.Icon;
  const phase_meta = PHASE_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const incoming_label = event.tool_name ?? event.title;
  const next_window_label = stage_transition_window_label(intent);
  const completed_count = Math.max(0, round_event_count - 1);

  return (
    <div
      className="operation-event-signal pointer-events-none absolute left-1/2 top-5 z-30 w-[min(420px,calc(100%-2rem))] rounded-[16px] border border-white/72 bg-white/70 p-2.5 shadow-[0_22px_54px_rgba(18,28,42,0.14)] backdrop-blur-2xl"
      key={`event-signal-${sequence}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border bg-gradient-to-br text-[color:var(--primary)]",
          meta.accent_class_name,
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12px] font-black text-(--text-strong)">
              第 {round_event_count} 个工具接入 · {meta.label}
            </span>
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold",
              phase_meta.class_name,
            )}>
              <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
              {phase_meta.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-muted)">
            {incoming_label} · {event.target ?? event.summary ?? event.title}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <StageSignalMetric label="已沉淀" value={`${completed_count}`} />
        <StageSignalMetric label="接入中" value={incoming_label} strong />
        <StageSignalMetric label="窗口" value={next_window_label} />
      </div>
    </div>
  );
}

function StageSignalMetric({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[10px] border px-2 py-1.5",
      strong
        ? "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)]"
        : "border-white/50 bg-white/34",
    )}>
      <p className="truncate text-[9.5px] font-black text-(--text-strong)">{value}</p>
      <p className="mt-0.5 truncate text-[8px] font-semibold text-(--text-soft)">{label}</p>
    </div>
  );
}

function stage_transition_window_label(intent: StageTransitionIntent): string {
  if (intent === "terminal") {
    return "终端窗口";
  }
  if (intent === "browser") {
    return "浏览器窗口";
  }
  if (intent === "workspace") {
    return "文件窗口";
  }
  if (intent === "editor") {
    return "编辑窗口";
  }
  if (intent === "task") {
    return "任务面板";
  }
  if (intent === "permission") {
    return "确认面板";
  }
  return "交接面板";
}

function surface_meta_for_transition(
  event: NexusOperationEvent,
  intent: StageTransitionIntent,
): SurfaceMeta {
  if (event.surface !== "fallback") {
    return SURFACE_META[event.surface];
  }
  if (intent === "browser") {
    return SURFACE_META.web;
  }
  if (intent === "terminal") {
    return SURFACE_META.terminal;
  }
  if (intent === "workspace") {
    return SURFACE_META.workspace;
  }
  if (intent === "editor") {
    return SURFACE_META.editor;
  }
  if (intent === "task") {
    return SURFACE_META.task;
  }
  if (intent === "permission") {
    return SURFACE_META.conversation;
  }
  return SURFACE_META.summary;
}

function StageIdleParticles() {
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animation_frame = 0;
    let width = 0;
    let height = 0;
    let particles: IdleParticle[] = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const next_width = Math.max(1, Math.floor(rect.width));
      const next_height = Math.max(1, Math.floor(rect.height));
      if (next_width === width && next_height === height) {
        return;
      }

      width = next_width;
      height = next_height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = build_idle_particles(width, height);
    };

    const draw = (timestamp: number) => {
      resize();
      draw_idle_particles(context, particles, width, height, timestamp, reduced_motion);
      if (!reduced_motion) {
        animation_frame = window.requestAnimationFrame(draw);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    draw(0);

    return () => {
      observer.disconnect();
      if (animation_frame) {
        window.cancelAnimationFrame(animation_frame);
      }
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="operation-idle-particle-canvas pointer-events-none absolute inset-0 z-[1] h-full w-full"
      ref={canvas_ref}
    />
  );
}

function useStageClock(): Date {
  const [now, set_now] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => set_now(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function format_stage_clock(value: Date): string {
  return `${pad_clock_value(value.getHours())}:${pad_clock_value(value.getMinutes())}`;
}

function format_stage_seconds(value: Date): string {
  return pad_clock_value(value.getSeconds());
}

function pad_clock_value(value: number): string {
  return String(value).padStart(2, "0");
}

function build_idle_particles(width: number, height: number): IdleParticle[] {
  const mask_canvas = document.createElement("canvas");
  mask_canvas.width = width;
  mask_canvas.height = height;
  const mask_context = mask_canvas.getContext("2d", { willReadFrequently: true });
  if (!mask_context) {
    return [];
  }

  const font_size = width < 560
    ? Math.max(58, Math.min(width / 6.1, height / 5.4))
    : Math.max(118, Math.min(width / 3.35, height / 2.35));
  mask_context.clearRect(0, 0, width, height);
  mask_context.fillStyle = "#000";
  mask_context.font = `900 ${font_size}px Georgia, "Times New Roman", serif`;
  mask_context.textAlign = "center";
  mask_context.textBaseline = "middle";
  mask_context.fillText("nexus", width / 2, height * 0.55);

  const image = mask_context.getImageData(0, 0, width, height);
  const step = width >= 1100 ? 5 : 4;
  const particles: IdleParticle[] = [];
  const max_particles = width >= 1100 ? 15000 : 7600;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = image.data[(y * width + x) * 4 + 3];
      if (alpha < 28) {
        continue;
      }

      const noise = stable_noise(x, y);
      if (noise < 0.24) {
        continue;
      }

      const glyph_index = Math.floor(stable_noise(y, x) * IDLE_PARTICLE_GLYPHS.length) % IDLE_PARTICLE_GLYPHS.length;
      particles.push({
        x: x + (noise - 0.5) * 1.8,
        y: y + (stable_noise(x + 17, y + 31) - 0.5) * 2,
        alpha: 0.28 + (alpha / 255) * (0.46 + stable_noise(x + 3, y + 7) * 0.42),
        drift: 0.7 + stable_noise(x + 5, y + 11) * 1.8,
        glyph: IDLE_PARTICLE_GLYPHS[glyph_index],
        phase: stable_noise(x + 13, y + 19) * Math.PI * 2,
        size: 5.6 + stable_noise(x + 23, y + 29) * 3.6,
      });

      if (particles.length >= max_particles) {
        return particles;
      }
    }
  }

  return particles;
}

function draw_idle_particles(
  context: CanvasRenderingContext2D,
  particles: IdleParticle[],
  width: number,
  height: number,
  timestamp: number,
  reduced_motion: boolean,
) {
  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  const time = timestamp * 0.001;
  for (const particle of particles) {
    const wave = reduced_motion ? 0 : Math.sin(time * 0.85 + particle.phase) * particle.drift;
    const lift = reduced_motion ? 0 : Math.cos(time * 0.72 + particle.phase * 0.7) * particle.drift * 0.45;
    const shimmer = reduced_motion ? 0 : Math.sin(time * 1.8 + particle.phase * 1.3) * 0.18;
    context.globalAlpha = Math.max(0.16, Math.min(0.92, particle.alpha + shimmer));
    context.fillStyle = particle.phase > Math.PI
      ? "rgb(102,126,255)"
      : "rgb(126,150,255)";
    context.font = `${particle.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    context.fillText(particle.glyph, particle.x + wave, particle.y + lift);
  }

  context.globalAlpha = 1;
}

function stable_noise(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function DebugOverlay({
  event,
  presentation = "panel",
  snapshot,
}: {
  event: NexusOperationEvent | null;
  presentation?: "panel" | "stage";
  snapshot: NexusOperationSnapshot | null;
}) {
  return (
    <div className={cn(
      "surface-popover absolute right-4 z-20 w-[min(460px,calc(100%-2rem))] rounded-[16px] p-3",
      presentation === "stage" ? "top-14" : "top-4",
    )}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-(--text-strong)">
          <Bug className="h-3.5 w-3.5" />
          证据摘要
        </div>
        <span className="text-[10px] text-(--text-soft)">{snapshot?.events.length ?? 0} events</span>
      </div>
      <pre className="soft-scrollbar max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-(--divider-subtle-color) bg-white/70 p-3 text-[10.5px] leading-5 text-(--text-default)">
        {JSON.stringify({
          active: event,
          recent_evidence: snapshot?.recent_evidence ?? [],
        }, null, 2)}
      </pre>
    </div>
  );
}
