import {
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
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { format_operation_time } from "../operation-preview";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationPhase,
} from "../operation-types";
import { PHASE_LABELS } from "../operation-tool-catalog";
import { DocumentPreview } from "./document-preview-surface";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export function ActivityMonitorSurface({
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
  const cpu_load = cpu_load_for_activity(running_count, finished_count);

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
        <div className="border-t border-(--divider-subtle-color) bg-white/58 p-2 text-[10px] text-(--text-muted)">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-black text-(--text-strong)">CPU Load</span>
            <span className="font-mono">{running_count ? "Active" : "Idle"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(117,131,149,0.14)]">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,rgba(47,184,132,0.86),rgba(91,114,255,0.74))]"
              style={{ width: `${cpu_load.total}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <ActivityMetric label="System" value={`${cpu_load.system}%`} />
            <ActivityMetric label="User" value={`${cpu_load.user}%`} />
            <ActivityMetric label="Proc" value={task_events.length} />
          </div>
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

function ActivityMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="min-w-0 truncate rounded-[8px] bg-white/64 px-2 py-1.5">
      {label} <span className="font-mono font-black text-(--text-strong)">{value}</span>
    </span>
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

function cpu_load_for_activity(running_count: number, finished_count: number): {
  system: number;
  total: number;
  user: number;
} {
  const user = Math.min(72, running_count ? 18 + running_count * 14 : Math.max(3, finished_count * 2));
  const system = Math.min(24, running_count ? 7 + running_count * 3 : 2);
  return {
    system,
    total: Math.min(96, user + system),
    user,
  };
}

function ActivityMonitorButton({
  active = false,
  children,
  label,
}: {
  active?: boolean;
  children: ReactNode;
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
