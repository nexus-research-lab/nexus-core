import {
  Activity,
  AlertTriangle,
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
  ListTree,
  Loader2,
  PauseCircle,
  Search,
  ShieldQuestion,
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
import { plan_operation_desktop } from "../operation-scene-planner";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationKind,
  OperationPhase,
  OperationSurface,
} from "../operation-types";
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
  workspace: "Workspace",
  editor: "Editor",
  terminal: "Terminal",
  web: "Web",
  knowledge: "Knowledge",
  task: "Task",
  conversation: "Conversation",
  summary: "Summary",
  fallback: "Operation",
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
  const [window_overrides, set_window_overrides] = useState<Record<string, StageWindowOverride>>({});

  useEffect(() => {
    set_focused_window_id(null);
    set_window_overrides({});
  }, [event.round_id]);

  const window_states = useMemo(() => (
    desktop.windows
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
      .sort((left, right) => {
        const left_z = left.id === focused_window_id ? 100 : left.z;
        const right_z = right.id === focused_window_id ? 100 : right.z;
        return left_z - right_z;
      })
  ), [desktop.windows, focused_window_id, window_overrides]);

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

  return (
    <DynamicStageFrame event={event}>
      <StageStatusBar
        active_window={active_window}
        event={event}
        snapshot={snapshot}
        visible_window_count={visible_windows.length}
        window_count={desktop.windows.length}
      />
      {visible_windows.length ? visible_windows.map((window, index) => {
        const is_active = active_window_id === window.id && window.phase !== "minimized";
        return (
          <OperationStageWindow
            delay_ms={Math.min(index * 70, 280)}
            dimmed={!is_active && window.phase !== "minimized"}
            focus={is_active}
            icon={icon_for_window_kind(window.kind)}
            key={window.id}
            mobile_hidden={!is_active}
            minimized={window.phase === "minimized"}
            on_close={() => close_window(window.id)}
            on_focus={() => focus_window(window.id)}
            on_minimize={() => minimize_window(window.id)}
            position_class_name={position_for_window(window)}
            title={window.title}
            tone={window.kind === "terminal" ? "terminal" : "default"}
          >
            {is_active ? (
              <StageWindowContent window={window} />
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
      {active_window?.kind === "terminal" ? null : <StageFocusBeam />}
    </DynamicStageFrame>
  );
}

function DynamicStageFrame({
  event,
  children,
}: {
  event: NexusOperationEvent;
  children: ReactNode;
}) {
  return (
    <div className="operation-stage-frame relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,247,251,0.86)_42%,rgba(234,239,247,0.92))] p-4 max-md:w-full max-md:min-w-0 max-md:max-w-[calc(100vw-24px)] max-md:overflow-auto">
      <div
        className={cn(
          "operation-stage-aura absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br opacity-[0.28] blur-3xl",
          SURFACE_ACCENT_CLASS_NAME[event.surface],
        )}
      />
      <div className="operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.32]" />
      <div className="operation-stage-light" />
      <div className="operation-desktop-shadow" />
      <div className="relative h-full min-h-[280px] max-md:flex max-md:h-auto max-md:min-h-0 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:flex-col max-md:gap-3">
        {children}
      </div>
    </div>
  );
}

function StageStatusBar({
  event,
  snapshot,
  active_window,
  visible_window_count,
  window_count,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
  active_window: StageWindowState | null;
  visible_window_count: number;
  window_count: number;
}) {
  const phase_meta = PHASE_STATUS_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const round_event_count = snapshot?.events.filter((item) => item.round_id === event.round_id).length ?? 1;
  const elapsed = format_elapsed(event.started_at, event.ended_at, event.updated_at);

  return (
    <div className="absolute left-4 top-4 z-30 flex max-w-[min(420px,calc(100%-2rem))] items-start gap-3 max-md:relative max-md:left-auto max-md:top-auto max-md:mb-3 max-md:max-w-none">
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
          <span>{SURFACE_LABEL[event.surface]}</span>
          <span>{round_event_count} actions</span>
          <span>{visible_window_count}/{window_count} windows</span>
          <span>{elapsed}</span>
          <span>{format_operation_time(event.updated_at)}</span>
        </div>
        {event.target || active_window?.title ? (
          <p className="mt-1.5 truncate text-[11px] text-(--text-muted)">
            {event.target ?? active_window?.title}
          </p>
        ) : null}
      </div>
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

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 flex justify-center max-md:relative max-md:inset-x-auto max-md:bottom-auto max-md:mt-3">
      <div className="operation-window-dock soft-scrollbar flex max-w-full items-end gap-1 overflow-x-auto rounded-[22px] border border-white/70 bg-white/58 px-2 py-1.5 shadow-[0_22px_54px_rgba(18,28,42,0.18)] backdrop-blur-2xl">
        {windows.map((window) => {
          const Icon = icon_for_window_kind(window.kind);
          const is_active = active_window_id === window.id && window.phase !== "closed" && window.phase !== "minimized";
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
                "group relative grid h-10 w-10 shrink-0 place-items-center rounded-[16px] border transition duration-200 ease-out hover:-translate-y-1 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)]",
                is_active
                  ? "border-[rgba(91,114,255,0.32)] bg-[rgba(91,114,255,0.16)] text-[color:var(--primary)] shadow-[0_10px_24px_rgba(91,114,255,0.18)]"
                  : window.phase === "closed" || window.phase === "minimized"
                    ? "border-transparent bg-white/28 text-(--icon-muted) opacity-72 hover:bg-white/62 hover:text-(--text-strong) hover:opacity-100"
                    : "border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/72 hover:text-(--text-strong)",
              )}
              key={window.id}
              onClick={() => on_restore(window.id)}
              title={`${state_label}：${window.title}`}
              type="button"
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className={cn(
                "absolute bottom-1 h-1 w-1 rounded-full transition",
                is_active
                  ? "bg-[color:var(--primary)]"
                  : window.phase === "minimized"
                    ? "bg-[rgba(223,157,46,0.70)]"
                    : window.phase === "closed"
                      ? "bg-[rgba(117,131,149,0.42)]"
                      : "bg-transparent",
              )} />
              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 hidden max-w-[190px] -translate-x-1/2 whitespace-nowrap rounded-[10px] border border-white/70 bg-[rgba(20,28,38,0.82)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_30px_rgba(18,28,42,0.22)] backdrop-blur-xl group-hover:block group-focus-visible:block">
                <span className="block max-w-[160px] truncate">{window.title}</span>
                <span className="block text-[9px] font-medium text-white/66">{state_label}</span>
              </span>
            </button>
          );
        })}
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

function position_for_window(window: StageWindowState): string {
  if (window.layout === "terminal") {
    return window.phase === "focused"
      ? "left-[19%] top-[24%] h-[48%] w-[52%]"
      : "left-[24%] bottom-[7%] h-[24%] w-[42%]";
  }
  if (window.layout === "inspector") {
    return window.phase === "minimized"
      ? "right-[6%] bottom-[8%] h-16 w-[20%]"
      : "right-[5%] bottom-[7%] h-[23%] w-[25%]";
  }
  if (window.layout === "secondary") {
    return "left-[4%] top-[15%] h-[43%] w-[22%]";
  }
  if (window.layout === "artifact") {
    return window.phase === "minimized"
      ? "right-[6%] bottom-[8%] h-16 w-[25%]"
      : "right-[7%] top-[17%] h-[44%] w-[28%]";
  }
  if (window.kind === "browser") {
    return window.phase === "focused"
      ? "right-[5%] top-[12%] h-[64%] w-[46%]"
      : "right-[6%] top-[16%] h-[48%] w-[34%]";
  }
  if (window.kind === "task_board") {
    return "left-[27%] top-[15%] h-[50%] w-[42%]";
  }
  if (window.kind === "summary" || window.kind === "permission_wait") {
    return "left-[31%] top-[16%] h-[50%] w-[40%]";
  }
  return "left-[28%] top-[11%] h-[58%] w-[41%]";
}
