"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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
  PauseCircle,
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

const SURFACE_META: Record<OperationSurface, SurfaceMeta> = {
  workspace: {
    label: "Workspace",
    Icon: FolderTree,
    accent_class_name: "from-[rgba(91,114,255,0.24)] via-[rgba(91,114,255,0.12)] to-transparent",
  },
  editor: {
    label: "Editor",
    Icon: Code2,
    accent_class_name: "from-[rgba(79,162,159,0.24)] via-[rgba(79,162,159,0.12)] to-transparent",
  },
  terminal: {
    label: "Terminal",
    Icon: Terminal,
    accent_class_name: "from-[rgba(47,184,132,0.22)] via-[rgba(47,184,132,0.1)] to-transparent",
  },
  web: {
    label: "Web",
    Icon: Globe2,
    accent_class_name: "from-[rgba(223,157,46,0.22)] via-[rgba(223,157,46,0.1)] to-transparent",
  },
  knowledge: {
    label: "Knowledge",
    Icon: FileText,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  task: {
    label: "Task",
    Icon: Activity,
    accent_class_name: "from-[rgba(223,157,46,0.2)] via-[rgba(91,114,255,0.1)] to-transparent",
  },
  conversation: {
    label: "Conversation",
    Icon: MessageSquare,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(255,255,255,0.08)] to-transparent",
  },
  summary: {
    label: "Summary",
    Icon: CheckCircle2,
    accent_class_name: "from-[rgba(47,184,132,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  fallback: {
    label: "Operation",
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
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -3px; }
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

        @media (prefers-reduced-motion: reduce) {
          .operation-stage-window,
          .operation-preview-line,
          .operation-scan-line,
          .operation-stage-light,
          .operation-terminal-caret,
          .operation-web-loading::after,
          .operation-diff-bar,
          .operation-phase-meter,
          .operation-focus-dot {
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
      eyebrow="Operation"
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

  return (
    <section className={cn(
      "relative flex h-full min-h-[420px] min-w-0 flex-1 overflow-hidden text-(--text-strong)",
      is_stage
        ? "rounded-[24px] border border-[color:color-mix(in_srgb,var(--divider-subtle-color)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-panel-background)_78%,transparent)] p-2 shadow-[0_24px_80px_rgba(18,28,42,0.12)]"
        : "surface-panel rounded-[22px] border border-(--surface-panel-border) bg-(--surface-panel-background) shadow-(--surface-panel-shadow)",
    )}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_30%_at_10%_8%,rgba(91,114,255,0.065),transparent_70%),radial-gradient(36%_34%_at_90%_92%,rgba(79,162,159,0.075),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={cn("min-h-0 min-w-0 flex-1", is_stage ? "p-0" : "px-4 pb-4 pt-4")}>
          <div className={cn(
            "relative h-full min-h-[300px] min-w-0 overflow-hidden border border-white/60 bg-[rgba(245,248,252,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_30px_76px_rgba(55,70,90,0.14)]",
            is_stage ? "rounded-[20px]" : "rounded-[22px]",
          )}>
            {active_event ? (
              <StageScene
                event={active_event}
                snapshot={snapshot}
              />
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

function EmptyStage({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <div className="max-w-[320px] text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-(--divider-subtle-color) bg-white/72 text-(--icon-muted) shadow-[0_18px_42px_rgba(18,28,42,0.10)]">
          <PauseCircle className="h-5 w-5" />
        </div>
        <h4 className="text-[19px] font-black tracking-[-0.035em] text-(--text-strong)">等待工具事件</h4>
        <p className="mt-2 truncate text-[12px] leading-5 text-(--text-soft)">{subtitle}</p>
      </div>
    </div>
  );
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
