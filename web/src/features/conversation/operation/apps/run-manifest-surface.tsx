import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { StageHandoffSummary } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "../operation-types";
import { build_operation_event_io_summary } from "../operation-event-io";
import {
  display_stage_event_target,
  display_stage_event_title,
} from "../operation-stage-labels";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import { ACTION_ICON, ACTION_TONE_CLASS } from "./operation-action-style";
import {
  collect_manifest_artifacts,
  extract_manifest_event_output,
  extract_manifest_result_text,
  format_manifest_duration,
  icon_for_manifest_artifact,
  PHASE_LABEL,
} from "./run-manifest-data";

export function RunManifestSurface({
  event,
  evidence,
  handoff_summary,
  on_focus_event,
  related_events,
  snapshot,
}: {
  event: NexusOperationEvent;
  evidence: OperationEvidence[];
  handoff_summary?: StageHandoffSummary;
  on_focus_event?: (event: NexusOperationEvent) => void;
  related_events: NexusOperationEvent[];
  snapshot: NexusOperationSnapshot | null;
}) {
  const events = related_events.length ? related_events : [event];
  const artifacts = collect_manifest_artifacts(event, events, snapshot, evidence);
  const terminal_events = events.filter((item) => item.surface === "terminal");
  const failed_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const completed_count = events.filter((item) => item.phase === "done").length;
  const duration = format_manifest_duration(events);
  const result_text = extract_manifest_result_text(event);

  return (
    <div className="flex h-full min-h-[330px] min-w-0 overflow-hidden bg-[#f6f8fb] text-(--text-default) max-md:flex-col">
      <aside className="soft-scrollbar flex w-[210px] shrink-0 flex-col overflow-auto border-r border-(--divider-subtle-color) bg-white/58 p-2.5 max-md:w-full max-md:border-b max-md:border-r-0">
        <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
          <span className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-[9px]",
            failed_count ? "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]" : "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
            {failed_count ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-(--text-strong)">Run Console</p>
            <p className="truncate text-[9.5px] text-(--text-soft)">round {event.round_id}</p>
          </div>
        </div>

        <ManifestActionMap events={events} />

        <div className="mt-2 space-y-1 rounded-[10px] bg-white/58 p-1.5 text-[10px]">
          <ManifestSidebarRow label="Events" value={events.length} />
          <ManifestSidebarRow label="Done" value={`${completed_count}/${events.length}`} />
          <ManifestSidebarRow label="Commands" value={terminal_events.length} />
          <ManifestSidebarRow label="Duration" value={duration} />
        </div>

        <div className="mt-3 px-1 text-[9px] font-black uppercase tracking-[0.12em] text-(--text-soft)">Artifacts</div>
        <div className="mt-1.5 space-y-1.5">
            {(artifacts.length ? artifacts : [{
              id: "context-only",
              label: "上下文记录",
              value: event.target ?? event.title,
              type: "status" as const,
            }]).slice(0, 6).map((artifact) => {
              const Icon = icon_for_manifest_artifact(artifact.type, artifact.value);
              return (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-[11px] border border-white/52 bg-white/42 px-2.5 py-2"
                  key={artifact.id}
                  title={artifact.value}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[9px] bg-white/62 text-(--icon-muted)">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
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
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/74">
        <div className="border-b border-(--divider-subtle-color) bg-white/70 px-3 py-2.5">
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <ConsoleToolbarButton label="过滤">
              <Filter className="h-3.5 w-3.5" />
            </ConsoleToolbarButton>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[8px] border border-(--divider-subtle-color) bg-white/74 px-2 py-1 text-[10px] text-(--text-soft)">
              <Search className="h-3 w-3 shrink-0" />
              <span className="truncate">Search all messages</span>
            </div>
            <ConsoleToolbarButton label="清空显示">
              <Trash2 className="h-3.5 w-3.5" />
            </ConsoleToolbarButton>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">All Messages</p>
            <p className="truncate text-[10px] text-(--text-soft)">
              {result_text || event.summary || handoff_summary?.resume_prompt || "Execution log retained for replay."}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-(--text-soft)">{PHASE_LABEL[event.phase]}</span>
          </div>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">
            {events.map((item, index) => {
              const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
              const Icon = ACTION_ICON[profile.action];
              const can_focus_event = Boolean(on_focus_event);
              const io_summary = build_operation_event_io_summary(item);
              const input_label = io_summary.input_detail;
              const output_label = extract_manifest_event_output(item);
              const event_title = display_stage_event_title(item, profile.action_label);
              const event_target = display_stage_event_target(item, profile.action_label);
              return (
                <button
                  aria-label={`查看执行步骤 ${index + 1}：${profile.action_label} ${event_title}`}
                  className={cn(
                    "grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 rounded-[12px] border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.36)]",
                    can_focus_event && "cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.06)]",
                    item.id === event.id
                      ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.08)]"
                      : "border-white/50 bg-white/36",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${profile.action_label} · ${event_title}`}
                  type="button"
                >
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-[10px] border",
                    ACTION_TONE_CLASS[profile.action],
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black text-(--text-strong)">
                      {String(index + 1).padStart(2, "0")} · {profile.action_label} · {event_title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-(--text-soft)">
                      {event_target}
                    </span>
                    {input_label || output_label ? (
                      <span className="mt-1 grid min-w-0 grid-cols-2 gap-1.5 max-sm:grid-cols-1">
                        {input_label ? (
                          <ManifestEventIOPill label="输入" value={input_label} />
                        ) : null}
                        {output_label ? (
                          <ManifestEventIOPill label="输出" value={output_label} />
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                  <span className={cn(
                    "shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold",
                    item.phase === "error" || item.phase === "cancelled"
                      ? "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                      : item.phase === "done"
                        ? "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                        : "bg-white/60 text-(--text-soft)",
                  )}>
                    {PHASE_LABEL[item.phase]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-(--divider-subtle-color) bg-white/62 px-3 py-2 text-[10px] text-(--text-soft)">
          <span className="truncate">{handoff_summary?.status_detail ?? `${evidence.length} evidence records`}</span>
          <span className="shrink-0 font-mono">{events.length} events</span>
        </div>
      </section>
    </div>
  );
}

function ConsoleToolbarButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-(--divider-subtle-color) bg-white/64 text-(--icon-muted) transition hover:bg-white hover:text-(--text-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]"
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ManifestEventIOPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 overflow-hidden rounded-[8px] border border-white/46 bg-white/38 px-1.5 py-1">
      <span className="mr-1 shrink-0 font-black text-(--text-soft)">{label}</span>
      <span className="truncate font-semibold text-(--text-muted)">{value}</span>
    </span>
  );
}

function ManifestActionMap({ events }: { events: NexusOperationEvent[] }) {
  const groups = collect_manifest_action_groups(events);

  if (!groups.length) {
    return null;
  }

  return (
    <section className="rounded-[10px] bg-white/58 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 px-1 text-[9px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
        <span>Sources</span>
        <span>{groups.length}</span>
      </div>
      <div className="space-y-1">
        {groups.map((group) => {
          const Icon = ACTION_ICON[group.action];
          return (
            <div
              className={cn(
                "min-w-0 rounded-[8px] border px-2 py-1.5",
                ACTION_TONE_CLASS[group.action],
              )}
              key={group.action}
              title={group.title}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-[10px] font-black">{group.label}</span>
                </span>
                <span className="shrink-0 text-[10px] font-black">{group.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function collect_manifest_action_groups(events: NexusOperationEvent[]) {
  const groups = new Map<string, {
    action: ReturnType<typeof resolve_operation_tool_profile>["action"];
    count: number;
    label: string;
    title: string;
  }>();

  for (const event of events) {
    const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
    const existing = groups.get(profile.action);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(profile.action, {
      action: profile.action,
      count: 1,
      label: profile.action_label,
      title: profile.title,
    });
  }

  return [...groups.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function ManifestSidebarRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-[8px] px-2 py-1.5">
      <span className="truncate font-semibold text-(--text-soft)">{label}</span>
      <span className="shrink-0 font-mono font-black text-(--text-strong)">{value}</span>
    </div>
  );
}
