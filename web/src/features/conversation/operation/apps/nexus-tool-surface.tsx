import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  GalleryVerticalEnd,
  ListTree,
  Play,
  RadioTower,
  Settings2,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import type { NexusOperationEvent } from "../operation-types";
import { ACTION_ICON, ACTION_TONE_CLASS } from "./operation-action-style";
import { build_nexus_tool_session_view } from "./nexus-tool-session";

export function NexusToolSurface({
  event,
  preview,
  related_events,
  target,
}: {
  event: NexusOperationEvent;
  preview: unknown;
  related_events: NexusOperationEvent[];
  target?: string | null;
}) {
  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const ActionIcon = ACTION_ICON[profile.action];
  const session = build_nexus_tool_session_view({
    event,
    preview,
    related_events,
    target,
  });
  const output_lines = session.output_text.split("\n").filter(Boolean);
  const workflow_steps = build_workflow_steps(session);

  return (
    <div className="grid h-full min-h-[320px] min-w-0 grid-cols-[168px_minmax(0,1fr)] overflow-hidden bg-[#f4f6fa] max-md:grid-cols-1">
      <aside className="soft-scrollbar min-h-0 border-r border-(--divider-subtle-color) bg-[#eef2f7]/90 p-2 max-md:hidden">
        <div className="flex items-center gap-2 rounded-[10px] bg-white/58 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/72 bg-white/78 text-[color:var(--primary)] shadow-[0_8px_20px_rgba(18,28,42,0.06)]">
            <Workflow className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">{session.app_intent.app_label}</p>
            <p className="truncate text-[10px] text-(--text-soft)">{session.app_intent.detail_label}</p>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          {session.sidebar_items.map((item, index) => (
            <div
              className={cn(
                "grid w-full min-w-0 grid-cols-[16px_minmax(0,1fr)] items-center gap-1.5 rounded-[7px] px-2 py-1.5 text-left text-[10px] transition",
                index === 0 ? "bg-white/86 text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]" : "text-(--text-muted) hover:bg-white/54",
              )}
              title={`${item.label}: ${item.value}`}
              key={item.key}
            >
              <SidebarIcon index={index} />
              <span className="min-w-0">
                <span className="block truncate font-black">{item.label}</span>
                <span className="block truncate font-semibold text-(--text-soft)">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-(--divider-subtle-color) bg-white/72 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border px-2.5 text-[11px] font-black ${ACTION_TONE_CLASS[profile.action]}`}>
              <ActionIcon className="h-4 w-4" />
              {profile.action_label}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-black tracking-normal text-(--text-strong)">
                {session.tool_name}
              </h3>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-(--text-soft)">
                {session.app_intent.group_label} · {session.display_target}
              </p>
            </div>
          </div>
          <button
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black transition",
              event.phase === "running"
                ? "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                : "border-(--divider-subtle-color) bg-white/72 text-(--text-soft)",
            )}
            type="button"
          >
            <Play className={cn("h-3.5 w-3.5", event.phase === "running" && "animate-pulse")} />
            {PHASE_LABELS[event.phase]}
          </button>
        </header>

        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#fbfcfe_0%,#f1f4f8_100%)] px-5 py-4">
          <section className="mx-auto max-w-[760px]">
            <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
              <PaneTitle icon={GalleryVerticalEnd} title="工作流" subtitle={event.summary ?? session.display_target} />
              <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black text-(--text-soft)">
                {workflow_steps.length} 步
              </span>
            </div>

            <div className="space-y-2.5">
              {workflow_steps.map((step, index) => (
                <WorkflowStepCard
                  index={index + 1}
                  key={step.id}
                  label={step.label}
                  tone={step.tone}
                  value={step.value}
                />
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-[13px] border border-(--divider-subtle-color) bg-[#111820] shadow-[0_18px_44px_rgba(18,28,42,0.16)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
                <PaneTitle compact icon={RadioTower} title="结果" subtitle={`${output_lines.length || 1} 行输出`} />
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8de0ad]" />
              </div>
              <pre className="soft-scrollbar max-h-[180px] overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-[#dbe7ee]">
                {session.output_text}
              </pre>
            </div>
          </section>
        </div>

        <footer className="grid min-h-[42px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-(--divider-subtle-color) bg-white/74 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {session.timeline.slice(-4).map((item, index) => (
              <span
                className="inline-flex min-w-0 max-w-[120px] items-center gap-1.5 rounded-full bg-white/66 px-2 py-1 text-[10px] font-bold text-(--text-soft)"
                key={item.id}
                title={`${item.label} · ${item.phase_label}`}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0 text-[color:var(--success)]" />
                <span className="truncate">{index + 1}. {item.label}</span>
              </span>
            ))}
          </div>
          <span className="shrink-0 text-[10px] font-black text-(--text-muted)">运行记录</span>
        </footer>
      </section>
    </div>
  );
}

function build_workflow_steps(session: ReturnType<typeof build_nexus_tool_session_view>) {
  const input_steps = session.input_rows.length
    ? session.input_rows.slice(0, 4).map((row) => ({
      id: `input:${row.key}`,
      label: row.label,
      tone: "input" as const,
      value: row.value,
    }))
    : [{
      id: "input:target",
      label: "目标",
      tone: "input" as const,
      value: session.display_target,
    }];

  return [
    ...input_steps,
    {
      id: "action:tool",
      label: session.tool_name,
      tone: "action" as const,
      value: session.app_intent.detail_label,
    },
  ];
}

function WorkflowStepCard({
  index,
  label,
  tone,
  value,
}: {
  index: number;
  label: string;
  tone: "input" | "action";
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-start gap-3 rounded-[13px] border border-(--divider-subtle-color) bg-white/76 px-3 py-2.5 shadow-[0_12px_30px_rgba(18,28,42,0.055)]">
      <span className={cn(
        "grid h-8 w-8 place-items-center rounded-[10px] text-[12px] font-black",
        tone === "action"
          ? "bg-[rgba(91,114,255,0.13)] text-[color:var(--primary)]"
          : "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]",
      )}>
        {index}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-black text-(--text-strong)">{label}</span>
        <span className="mt-0.5 block break-words font-mono text-[10.5px] leading-5 text-(--text-soft)">{value}</span>
      </span>
    </div>
  );
}

function PaneTitle({
  compact = false,
  icon: Icon,
  subtitle,
  title,
}: {
  compact?: boolean;
  icon: LucideIcon;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn(
        "grid shrink-0 place-items-center rounded-[8px] border border-(--divider-subtle-color) bg-white/70 text-(--icon-default)",
        compact ? "h-6 w-6" : "h-7 w-7",
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className={cn("truncate font-black", compact ? "text-[10px] text-[#dbe7ee]" : "text-[11px] text-(--text-strong)")}>{title}</p>
        <p className={cn("truncate text-[10px]", compact ? "text-[#8aa0ad]" : "text-(--text-soft)")}>{subtitle}</p>
      </div>
    </div>
  );
}

function SidebarIcon({ index }: { index: number }) {
  const icons = [Settings2, FileText, CircleDot, Clock3, ListTree];
  const Icon = icons[index] ?? ListTree;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}
