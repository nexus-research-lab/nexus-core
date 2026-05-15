import {
  Activity,
  CheckCircle2,
  Code2,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Globe2,
  ImageIcon,
  ListTree,
  Search,
  ShieldQuestion,
  Terminal,
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
  OperationSurface,
} from "../operation-types";
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

  const windows = useMemo(() => (
    desktop.windows
      .filter((window) => !window_overrides[window.id]?.closed)
      .map((window): StageWindowState => {
        const override = window_overrides[window.id];
        return override?.minimized
          ? { ...window, phase: "minimized" }
          : window;
      })
      .sort((left, right) => {
        const left_z = left.id === focused_window_id ? 100 : left.z;
        const right_z = right.id === focused_window_id ? 100 : right.z;
        return left_z - right_z;
      })
  ), [desktop.windows, focused_window_id, window_overrides]);

  const active_window_id = useMemo(() => {
    if (focused_window_id && windows.some((window) => (
      window.id === focused_window_id && window.phase !== "minimized"
    ))) {
      return focused_window_id;
    }
    const explicit_active = windows.find((window) => (
      window.id === desktop.active_window_id && window.phase !== "minimized"
    ));
    const focused = explicit_active ?? windows.find((window) => window.phase === "focused");
    return (focused ?? windows.find((window) => window.phase !== "minimized") ?? windows.at(-1) ?? null)?.id ?? null;
  }, [desktop.active_window_id, focused_window_id, windows]);

  const close_window = (window_id: string) => {
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
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: true,
      },
    }));
  };

  return (
    <DynamicStageFrame event={event}>
      {windows.map((window, index) => {
        const is_active = active_window_id === window.id && window.phase !== "minimized";
        return (
          <OperationStageWindow
            delay_ms={Math.min(index * 70, 280)}
            dimmed={!is_active && window.phase !== "minimized"}
            focus={is_active}
            icon={icon_for_window_kind(window.kind)}
            key={window.id}
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
      })}
      <StageFocusBeam />
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
    <div className="operation-stage-frame relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,247,251,0.86)_42%,rgba(234,239,247,0.92))] p-4 max-md:overflow-auto">
      <div
        className={cn(
          "operation-stage-aura absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br opacity-[0.28] blur-3xl",
          SURFACE_ACCENT_CLASS_NAME[event.surface],
        )}
      />
      <div className="operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.32]" />
      <div className="operation-stage-light" />
      <div className="operation-desktop-shadow" />
      <div className="relative h-full min-h-[280px] max-md:flex max-md:h-auto max-md:min-h-0 max-md:flex-col max-md:gap-3">
        {children}
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
