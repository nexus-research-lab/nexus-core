import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { StageHandoffSummary } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "../operation-types";
import { display_stage_event_title } from "../operation-stage-labels";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import { build_operation_event_io_summary } from "../operation-event-io";
import {
  collect_manifest_artifacts,
  format_manifest_duration,
  icon_for_manifest_artifact,
  PHASE_LABEL,
} from "./run-manifest-data";

export function HandoffSurface({
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
  const source_events = related_events.length ? related_events : [event];
  const tool_events = source_events.filter((item) => item.surface !== "conversation");
  const completed_count = tool_events.filter((item) => item.phase === "done").length;
  const artifacts = collect_manifest_artifacts(event, source_events, snapshot, evidence);
  const duration = format_manifest_duration(tool_events.length ? tool_events : source_events);
  const resume_prompt = handoff_summary?.resume_prompt ?? event.summary ?? "本轮执行已经归档，可以继续打开产物或回看工具现场。";

  return (
    <div className="flex h-full min-h-[340px] overflow-hidden bg-[#f7faf8] text-(--text-default)">
      <aside className="soft-scrollbar w-[230px] shrink-0 overflow-auto border-r border-(--divider-subtle-color) bg-white/68 p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">交付归档</p>
            <p className="truncate text-[10px] text-(--text-soft)">round {event.round_id}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <HandoffMetric icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="完成" value={`${completed_count}/${tool_events.length || 1}`} />
          <HandoffMetric icon={<Clock3 className="h-3.5 w-3.5" />} label="耗时" value={duration} />
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
          <FolderOpen className="h-3 w-3" />
          <span>产物</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {(artifacts.length ? artifacts : [{
            id: "summary",
            label: "执行摘要",
            value: event.target ?? event.title,
            type: "status" as const,
          }]).slice(0, 7).map((artifact) => {
            const Icon = icon_for_manifest_artifact(artifact.type, artifact.value);
            const related_event = source_events.find((item) => item.target === artifact.value);
            return (
              <button
                className="flex w-full min-w-0 items-center gap-2 rounded-[11px] border border-white/58 bg-white/48 px-2.5 py-2 text-left transition hover:bg-white/74 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,184,132,0.32)]"
                disabled={!related_event || !on_focus_event}
                key={artifact.id}
                onClick={() => related_event && on_focus_event?.(related_event)}
                title={artifact.value}
                type="button"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10.5px] font-black text-(--text-strong)">{artifact.label}</span>
                  <span className="block truncate text-[9.5px] text-(--text-soft)">{artifact.value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white/76">
        <div className="border-b border-(--divider-subtle-color) px-5 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-(--text-soft)">Delivery</p>
          <h2 className="mt-1 truncate text-[22px] font-black tracking-normal text-(--text-strong)">
            {event.title || "本轮任务已完成"}
          </h2>
          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-(--text-soft)">
            {resume_prompt}
          </p>
        </div>

        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-4">
          <div className="grid gap-3">
            {tool_events.slice(-5).map((item, index) => {
              const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
              const io_summary = build_operation_event_io_summary(item);
              return (
                <button
                  className={cn(
                    "grid grid-cols-[32px_minmax(0,1fr)_86px] items-center gap-3 rounded-[13px] border border-(--divider-subtle-color) bg-white/62 px-3 py-2.5 text-left transition",
                    on_focus_event && "hover:bg-[rgba(91,114,255,0.055)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  type="button"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-black text-(--text-strong)">
                      {display_stage_event_title(item, profile.action_label)}
                    </span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-(--text-soft)">
                      {io_summary.output_label || io_summary.input_detail || item.summary || item.target || profile.action_label}
                    </span>
                  </span>
                  <span className="justify-self-end rounded-full bg-[rgba(47,184,132,0.10)] px-2 py-1 text-[10px] font-black text-[color:var(--success)]">
                    {PHASE_LABEL[item.phase]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-t border-(--divider-subtle-color) bg-white/66 px-4 py-3 text-[10.5px] font-bold text-(--text-soft)">
          <span className="truncate">现场已收束，历史应用保留在左侧缩略片与 Dock 中。</span>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-(--divider-subtle-color) bg-white/62 px-3 text-(--text-strong)" type="button">
            <RotateCcw className="h-3.5 w-3.5" />
            回看
          </button>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--primary)] px-3 text-white" type="button">
            <FileText className="h-3.5 w-3.5" />
            继续
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}

function HandoffMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[11px] border border-white/58 bg-white/44 p-2">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-(--text-soft)">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-[13px] font-black text-(--text-strong)">{value}</p>
    </div>
  );
}
