import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Cpu,
  HardDrive,
  Loader2,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationPhase,
} from "../operation-types";
import type { OperationToolProfile } from "../operation-tool-catalog";
import {
  build_operation_input_rows,
  extract_operation_input_value,
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import {
  build_editor_preview_lines,
  format_operation_time,
  get_preview_lines,
} from "../operation-preview";
import { ACTION_ICON, ACTION_TONE_CLASS } from "./operation-action-style";
import { BrowserSurface } from "./browser-surface";
import { DocumentPreview } from "./document-preview-surface";
import { RuntimeHandoffSurface } from "./runtime-handoff-surface";
import { OperationReviewPanel, PermissionCheckpointPanel } from "./operation-review-panels";
import { RunManifestSurface } from "./run-manifest-surface";
import { TerminalSession } from "./terminal-session";
import { WorkspaceFinder } from "./workspace-finder-surface";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export function StageWindowContent({
  window,
  on_focus_event,
}: {
  window: StageWindowState;
  on_focus_event?: (event: NexusOperationEvent) => void;
}) {
  const { event, snapshot } = window.payload;
  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);

  if (window.kind === "finder") {
    const workspace_items = window.payload.workspace_items ?? [];
    return (
      <div className="flex h-full min-h-[240px] flex-col">
        <WorkspaceFinder
          active_path={window.payload.target ?? event.target}
          event={event}
          items={workspace_items}
        />
      </div>
    );
  }

  if (window.kind === "terminal") {
    const lines = window.payload.lines?.length
      ? window.payload.lines
      : [
        window.payload.command ? `$ ${window.payload.command}` : "$",
        ...get_preview_lines(event.result_preview ?? event.summary, 10),
      ];
    return (
      <TerminalSession
        command={window.payload.command ?? event.target ?? ""}
        event={event}
        lines={lines}
        related_events={window.payload.related_events ?? []}
      />
    );
  }

  if (window.kind === "browser") {
    const query = window.payload.query ?? event.target ?? "web";
    const lines = window.payload.lines ?? get_preview_lines(event.result_preview ?? event.summary, 7);
    return (
      <div className="flex h-full min-h-[280px] min-w-0 max-w-full flex-col">
        <BrowserSurface
          event={event}
          lines={lines}
          preview={window.payload.srcdoc ?? window.payload.preview}
          query={query}
          target={window.payload.target ?? event.target}
        />
      </div>
    );
  }

  if (window.kind === "task_board") {
    return (
      <TaskBoardSurface
        event={event}
        lines={window.payload.lines ?? []}
        snapshot={snapshot}
      />
    );
  }

  if (window.kind === "runtime_handoff") {
    return (
      <RuntimeHandoffSurface
        event={event}
        related_events={window.payload.related_events ?? []}
        summary={window.payload.summary}
      />
    );
  }

  if (window.kind === "run_manifest") {
    return (
      <RunManifestSurface
        event={event}
        evidence={window.payload.evidence ?? []}
        handoff_summary={window.payload.handoff_summary}
        on_focus_event={on_focus_event}
        related_events={window.payload.related_events ?? []}
        snapshot={snapshot}
      />
    );
  }

  if (window.kind === "evidence" || window.kind === "permission_wait") {
    if (window.kind === "permission_wait") {
      return (
        <PermissionCheckpointPanel
          compact={window.phase === "minimized"}
          event={event}
          evidence={window.payload.evidence}
          snapshot={snapshot}
        />
      );
    }
    return (
      <OperationReviewPanel
        compact={window.phase === "minimized"}
        event={event}
        evidence={window.payload.evidence}
        mode="evidence"
        snapshot={snapshot}
      />
    );
  }

  if (window.kind === "summary") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <ToolActionHeader event={event} profile={profile} target={event.target} />
        <div className="min-h-0 flex-1">
          <DocumentPreview
            summary={event.summary ?? event.target ?? "暂无摘要"}
            target="run-summary.md"
            value={window.payload.preview ?? event.result_preview ?? event.summary ?? event.target}
          />
        </div>
      </div>
    );
  }

  if (is_file_app_window(window.kind)) {
    return (
      <DocumentPreview
        diff_stats={window.payload.diff_stats}
        fallback_lines={build_editor_preview_lines(event, get_preview_lines(window.payload.preview, 12))}
        summary={window.payload.summary ?? event.summary ?? event.title}
        target={window.payload.target ?? window.target ?? event.target}
        value={window.payload.preview ?? event.result_preview ?? event.input_preview ?? event.summary}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ToolActionHeader
        event={event}
        profile={profile}
        target={window.payload.target ?? window.target ?? event.target}
      />
      <div className="min-h-0 flex-1">
        <DocumentPreview
          diff_stats={window.payload.diff_stats}
          fallback_lines={build_editor_preview_lines(event, get_preview_lines(window.payload.preview, 12))}
          summary={window.payload.summary ?? event.summary ?? event.title}
          target={window.payload.target ?? window.target ?? event.target}
          value={window.payload.preview ?? event.result_preview ?? event.input_preview ?? event.summary}
        />
      </div>
    </div>
  );
}

function is_file_app_window(kind: StageWindowState["kind"]): boolean {
  return kind === "code_editor"
    || kind === "markdown_reader"
    || kind === "word_reader"
    || kind === "pdf_reader"
    || kind === "spreadsheet"
    || kind === "image_viewer"
    || kind === "generic_tool";
}

function ToolActionHeader({
  event,
  profile,
  target,
  tone = "default",
}: {
  event: NexusOperationEvent;
  profile: OperationToolProfile;
  target?: string | null;
  tone?: "default" | "terminal";
}) {
  const Icon = ACTION_ICON[profile.action];
  const primary = extract_operation_input_value(event.input_preview, profile.target_keys);
  const rows = build_operation_input_rows(event.input_preview, profile.target_keys, 3);
  const display_target = primary?.value ?? target ?? event.target ?? event.summary ?? event.title;
  const is_terminal = tone === "terminal";

  return (
    <div className={cn(
      "min-w-0 max-w-full rounded-[13px] border p-3",
      is_terminal
        ? "border-white/10 bg-white/[0.035] text-[#d8e8e2]"
        : "border-(--divider-subtle-color) bg-white/72 text-(--text-default)",
    )}>
      <div className="flex min-w-0 items-center justify-between gap-3 max-md:flex-col max-md:items-start">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <span className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[10px] font-black",
            is_terminal ? "border-white/12 bg-white/[0.04] text-[#8de0ad]" : ACTION_TONE_CLASS[profile.action],
          )}>
            <Icon className="h-3.5 w-3.5" />
            {profile.action_label}
          </span>
          <div className="min-w-0">
            <p className={cn(
              "truncate text-[12px] font-black tracking-[-0.02em]",
              is_terminal ? "text-[#e8f6f0]" : "text-(--text-strong)",
            )}>
              {profile.title}
            </p>
            <p className={cn(
              "mt-0.5 truncate text-[11px]",
              is_terminal ? "text-[#8aa09b]" : "text-(--text-soft)",
            )}>
              {display_target}
            </p>
          </div>
        </div>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold max-md:ml-[34px]",
          is_terminal ? "bg-white/[0.05] text-[#8de0ad]" : "bg-white/70 text-(--text-muted)",
        )}>
          {PHASE_LABELS[event.phase]}
        </span>
      </div>
      {rows.length > 1 ? (
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {rows.slice(0, 2).map((row) => (
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-[9px] px-2 py-1.5 text-[10px]",
                is_terminal ? "bg-black/12 text-[#99b0aa]" : "bg-white/62 text-(--text-soft)",
              )}
              key={row.key}
            >
              <span className="font-semibold">{row.label}</span>
              <span className="ml-1 break-words">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskBoardSurface({
  event,
  snapshot,
  lines,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
  lines: string[];
}) {
  const task_events = collect_task_events(event, snapshot);
  const steps = task_events.map((item, index) => ({
    event: item,
    label: item.target ?? item.summary ?? item.tool_name ?? `step ${index + 1}`,
    status: PHASE_LABEL[item.phase],
  }));
  const active_index = Math.max(0, steps.findIndex((step) => step.event.id === event.id));
  const preview_value = lines.join("\n") || event.result_preview || event.input_preview || event.summary;
  const finished_count = task_events.filter((item) => item.phase === "done").length;
  const running_count = task_events.filter((item) => item.phase === "running" || item.phase === "waiting").length;

  return (
    <div className="flex h-full min-h-[320px] min-w-0 max-w-full overflow-hidden bg-[#f7f9fb] max-md:flex-col">
      <section className="flex min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-r border-(--divider-subtle-color) bg-white/62 max-md:w-full max-md:border-b max-md:border-r-0">
        <div className="border-b border-(--divider-subtle-color) bg-white/72 px-3 py-2.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">Activity Monitor</p>
              <p className="mt-0.5 truncate text-[10px] text-(--text-soft)">
                {running_count ? `${running_count} running` : `${finished_count}/${Math.max(task_events.length, 1)} complete`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ActivityMonitorButton label="CPU" active>
                <Cpu className="h-3.5 w-3.5" />
              </ActivityMonitorButton>
              <ActivityMonitorButton label="Memory">
                <HardDrive className="h-3.5 w-3.5" />
              </ActivityMonitorButton>
            </div>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-1.5 rounded-[8px] border border-(--divider-subtle-color) bg-white/72 px-2 py-1 text-[10px] text-(--text-soft)">
            <Search className="h-3 w-3 shrink-0" />
            <span className="truncate">Filter processes</span>
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_42px_38px] gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.10em] text-(--text-soft)">
            <span>Process Name</span>
            <span>PID</span>
            <span>%CPU</span>
          </div>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-1.5">
          {steps.map((step, index) => {
            const Icon = icon_for_task_phase(step.event.phase);
            const active = index === active_index;
            const pid_label = task_pid_label(step.event.id);
            const cpu_label = task_cpu_label(step.event.phase, index);
            return (
              <div
                className={cn(
                  "mb-1 grid min-w-0 grid-cols-[22px_minmax(0,1fr)_42px_38px] items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11px]",
                  active
                    ? "bg-[rgba(91,114,255,0.10)] text-(--text-strong)"
                    : "text-(--text-muted) hover:bg-white/64",
                )}
                key={step.event.id}
              >
                <span className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-[7px]",
                  step.event.phase === "done" && "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]",
                  step.event.phase === "running" && "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]",
                  step.event.phase === "waiting" && "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]",
                  (step.event.phase === "error" || step.event.phase === "cancelled") && "bg-[rgba(223,93,98,0.12)] text-[color:var(--destructive)]",
                  step.event.phase === "queued" && "bg-white/70 text-(--icon-muted)",
                )}>
                  <Icon className={cn("h-3.5 w-3.5", step.event.phase === "running" && "animate-spin")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{step.label}</p>
                  <p className="mt-0.5 truncate text-[10px] text-(--text-soft)">
                    {step.status} · {format_operation_time(step.event.updated_at)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-(--text-soft)">{pid_label}</span>
                <span className={cn(
                  "shrink-0 rounded px-1 py-px text-right font-mono text-[9px]",
                  step.event.phase === "running"
                    ? "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
                    : "text-(--text-soft)",
                )}>
                  {cpu_label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-1 border-t border-(--divider-subtle-color) bg-white/54 p-2 text-[10px] text-(--text-muted)">
          <span className="truncate rounded-[8px] bg-white/64 px-2 py-1.5">CPU {running_count ? "active" : "idle"}</span>
          <span className="truncate rounded-[8px] bg-white/64 px-2 py-1.5">Proc {task_events.length}</span>
          <span className="truncate rounded-[8px] bg-white/64 px-2 py-1.5">Done {finished_count}</span>
        </div>
      </section>
      <section className="min-h-0 min-w-0 flex-1">
        <DocumentPreview
          summary={event.summary ?? event.title}
          target="task-output.md"
          value={preview_value}
        />
      </section>
    </div>
  );
}

function collect_task_events(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationEvent[] {
  const events = (snapshot?.events ?? [])
    .filter((item) => item.surface === "task" || item.kind === "task_delegate" || item.kind === "task_progress")
    .filter((item) => item.round_id === event.round_id || item.id === event.id);
  if (!events.some((item) => item.id === event.id)) {
    events.push(event);
  }
  return events
    .sort((a, b) => (a.started_at ?? a.updated_at) - (b.started_at ?? b.updated_at))
    .slice(-8);
}

function ActivityMonitorButton({
  active = false,
  children,
  label,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-[8px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]",
        active
          ? "border-(--divider-subtle-color) bg-white text-(--text-strong)"
          : "border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/76 hover:text-(--text-strong)",
      )}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function task_pid_label(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) >>> 0;
  }
  return String(120 + (hash % 8800));
}

function task_cpu_label(phase: OperationPhase, index: number): string {
  if (phase === "running") {
    return `${(12 + index * 3.7).toFixed(1)}`;
  }
  if (phase === "waiting") {
    return "1.2";
  }
  if (phase === "done") {
    return "0.0";
  }
  if (phase === "error" || phase === "cancelled") {
    return "0.1";
  }
  return "0.0";
}

function icon_for_task_phase(phase: OperationPhase): LucideIcon {
  if (phase === "done") {
    return CheckCircle2;
  }
  if (phase === "running") {
    return Loader2;
  }
  if (phase === "waiting") {
    return CircleHelp;
  }
  if (phase === "error" || phase === "cancelled") {
    return AlertTriangle;
  }
  return Clock3;
}
