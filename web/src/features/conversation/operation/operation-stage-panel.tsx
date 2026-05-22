"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bug } from "lucide-react";

import { cn } from "@/lib/utils";
import { WorkspaceSurfaceToolbarAction } from "@/shared/ui/workspace/surface/workspace-surface-header";
import { WorkspaceSurfaceView } from "@/shared/ui/workspace/surface/workspace-surface-view";
import type { AgentConversationIdentity } from "@/types/agent/agent-conversation";

import {
  build_operation_stage_key,
  useOperationStageStore,
} from "./operation-store";
import {
  derive_operation_stage_experience_phase,
} from "./operation-stage-experience";
import {
  EmptyStage,
  StageEventSignal,
} from "./operation-stage-idle";
import {
  PHASE_META,
  SURFACE_META,
} from "./operation-stage-panel-style";
import {
  build_stage_transition_style,
} from "./operation-stage-transition";
import type { StageTransitionIntent } from "./operation-stage-transition";
import { OperationStageDesktop } from "./stage/operation-stage-desktop";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "./operation-types";

interface OperationStagePanelProps {
  identity: AgentConversationIdentity | null;
  agent_name?: string | null;
  header_action?: ReactNode;
  presentation?: "panel" | "stage";
}

type StageTransitionPhase = "idle" | "priming" | "materializing" | "handoff" | "live";

interface StageTransitionState {
  intent: StageTransitionIntent;
  phase: StageTransitionPhase;
  sequence: number;
}

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
                    snapshot={snapshot}
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
              <EmptyStage snapshot={snapshot} subtitle={subtitle} />
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
