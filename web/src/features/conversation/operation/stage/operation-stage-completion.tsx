import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  ListTree,
} from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { build_operation_continuation_brief } from "../operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "../operation-types";
import { format_operation_time } from "../operation-preview";
import {
  collect_archive_capsules,
  collect_completion_artifacts,
  collect_handoff_checklist,
  collect_handoff_items,
  icon_for_operation_kind,
} from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";
import { PHASE_STATUS_META, SURFACE_LABEL } from "./operation-stage-style";

export function StageCompletionLedger({
  active_event_id,
  event,
  events,
  narrative,
  on_focus_event,
  snapshot,
}: {
  active_event_id: string;
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  on_focus_event?: (event: NexusOperationEvent) => void;
  snapshot: NexusOperationSnapshot | null;
}) {
  if (!events.length) {
    return null;
  }

  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");
  const artifacts = collect_completion_artifacts(event, snapshot);
  const completed_count = events.filter((item) => item.phase === "done").length;
  const interrupted_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const visible_events = events.slice(-5);
  const active_index = events.findIndex((item) => item.id === active_event_id);
  const active_replay_event = active_index >= 0 ? events[active_index] : event;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[76px] left-4 z-30 w-[min(360px,calc(100%-2rem))] max-md:relative max-md:bottom-auto max-md:left-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="rounded-[18px] border border-white/70 bg-white/58 p-3 shadow-[0_22px_56px_rgba(18,28,42,0.13)] backdrop-blur-2xl">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border",
              has_error
                ? "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
            )}>
              {has_error ? <AlertTriangle className="h-4.5 w-4.5" /> : <ListChecks className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-black text-(--text-strong)">工作台交接账本</p>
              <p className="mt-0.5 truncate text-[10.5px] text-(--text-soft)">
                {has_error ? "保留异常证据，等待回看处理" : "现场已转成可追溯记录，可以继续对话"}
              </p>
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9.5px] font-bold",
            has_error
              ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
              : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
            {active_index >= 0 ? `${active_index + 1}/${events.length}` : has_error ? "回看" : "就绪"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <CompletionLedgerMetric
            label="步骤"
            tone={has_error ? "warning" : "success"}
            value={`${completed_count}/${events.length}`}
          />
          <CompletionLedgerMetric
            label="产物"
            tone={artifacts.length ? "success" : "neutral"}
            value={`${artifacts.length}`}
          />
          <CompletionLedgerMetric
            label={interrupted_count ? "异常" : "状态"}
            tone={interrupted_count ? "warning" : "neutral"}
            value={interrupted_count ? `${interrupted_count}` : narrative.phase === "completed" ? "完成" : "落盘"}
          />
        </div>

        <div className="mt-3 rounded-[13px] border border-white/52 bg-white/36 p-2">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold text-(--text-soft)">
            <span>执行回放轨迹</span>
            <span>{format_operation_time(active_replay_event.updated_at)}</span>
          </div>
          <div className="space-y-1">
            {visible_events.map((item, index) => {
              const Icon = icon_for_operation_kind(item.kind);
              const phase_meta = PHASE_STATUS_META[item.phase];
              const PhaseIcon = phase_meta.Icon;
              const is_active = item.id === active_event_id;
              return (
                <button
                  aria-label={`回看交接记录 ${index + 1}：${item.tool_name ?? item.title}`}
                  className={cn(
                    "grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                    is_active
                      ? "border-[rgba(91,114,255,0.26)] bg-[rgba(91,114,255,0.10)]"
                      : "border-white/46 bg-white/30",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${item.tool_name ?? item.title} · ${item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}`}
                  type="button"
                >
                  <span className={cn(
                    "grid h-[22px] w-[22px] place-items-center rounded-[8px]",
                    is_active ? "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]" : "bg-white/58 text-(--icon-muted)",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
                      {item.tool_name ?? item.title}
                    </span>
                    <span className="block truncate text-[9.5px] text-(--text-soft)">
                      {item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}
                    </span>
                  </span>
                  <span className={cn(
                    "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[8.5px] font-bold",
                    phase_meta.class_name,
                  )}>
                    <PhaseIcon className={cn("h-3 w-3", item.phase === "running" && "animate-spin")} />
                    {phase_meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[13px] border border-white/52 bg-white/34 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10.5px] font-black text-(--text-strong)">
              {has_error ? "错误上下文已保留" : "交接完成，回到对话"}
            </p>
            <p className="truncate text-[9.5px] text-(--text-soft)">
              {artifacts[0]?.value ?? event.summary ?? event.target ?? "本轮工作台记录可随时回看"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/60 px-2 py-1 text-[9px] font-bold text-(--text-soft)">
            {narrative.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompletionLedgerMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "success" | "warning";
  value: string;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[11px] border px-2 py-2",
      tone === "warning"
        ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
        : tone === "success"
          ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
          : "border-white/48 bg-white/34",
    )}>
      <div className="truncate text-[12px] font-black text-(--text-strong)">{value}</div>
      <div className="mt-0.5 truncate text-[8.5px] font-bold uppercase tracking-normal text-(--text-soft)">
        {label}
      </div>
    </div>
  );
}

export function StageOutcomeSummary({
  event,
  events,
  narrative,
  snapshot,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}) {
  const terminal_count = events.filter((item) => item.surface === "terminal").length;
  const file_count = events.filter((item) => item.surface === "workspace" || item.surface === "editor").length;
  const evidence_count = (event.evidence?.length ?? 0) + (snapshot?.recent_evidence.length ?? 0);
  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");
  const artifacts = useMemo(() => collect_completion_artifacts(event, snapshot), [event, snapshot]);
  const handoff_items = useMemo(() => collect_handoff_items({
    artifacts,
    events,
    evidence_count,
    file_count,
    has_error,
    narrative,
    terminal_count,
  }), [artifacts, events, evidence_count, file_count, has_error, narrative, terminal_count]);
  const checklist_items = useMemo(() => collect_handoff_checklist({
    artifacts,
    events,
    evidence_count,
    has_error,
  }), [artifacts, events, evidence_count, has_error]);
  const continuation_brief = useMemo(() => (
    build_operation_continuation_brief(event, events, snapshot)
  ), [event, events, snapshot]);
  const reel_events = events.slice(-5);

  return (
    <div className="absolute right-4 top-4 z-20 w-[min(370px,calc(100%-2rem))] rounded-[16px] border border-white/66 bg-white/60 p-3 shadow-[0_22px_54px_rgba(18,28,42,0.13)] backdrop-blur-xl max-md:relative max-md:right-auto max-md:top-auto max-md:mt-3 max-md:w-full">
      <div className="flex items-center gap-2">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
          has_error
            ? "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
            : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
          {has_error ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-black text-(--text-strong)">
            {has_error ? "执行需要回看" : narrative.phase === "settling" ? "结果正在落盘" : "执行已沉淀"}
          </p>
          <p className="truncate text-[10.5px] text-(--text-soft)">
            {narrative.detail || event.summary || event.target || event.title}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {handoff_items.map((item) => {
          const Icon = item.Icon;
          return (
            <div
              className={cn(
                "min-w-0 rounded-[11px] border px-2 py-2 text-center",
                item.tone === "warning"
                  ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.09)]"
                  : item.tone === "success"
                    ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.09)]"
                    : "border-white/48 bg-white/34",
              )}
              key={item.label}
            >
              <Icon className={cn(
                "mx-auto h-3.5 w-3.5",
                item.tone === "warning" && "text-[color:var(--warning)]",
                item.tone === "success" && "text-[color:var(--success)]",
                item.tone === "neutral" && "text-(--icon-muted)",
              )} />
              <p className="mt-1 truncate text-[9.5px] font-black text-(--text-strong)">{item.label}</p>
              <p className="mt-0.5 truncate text-[8.5px] font-semibold text-(--text-soft)">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className={cn(
        "mt-3 overflow-hidden rounded-[13px] border p-2.5",
        has_error
          ? "border-[rgba(223,157,46,0.22)] bg-[rgba(223,157,46,0.08)]"
          : "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.07)]",
      )}>
        <div className="flex min-w-0 items-start gap-2">
          <span className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border",
            has_error
              ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
              : "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
          )}>
            {has_error ? <AlertTriangle className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                {continuation_brief.status_label}
              </p>
              <span className="shrink-0 rounded-full bg-white/58 px-1.5 py-px text-[8.5px] font-bold text-(--text-soft)">
                下一步
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-muted)">
              {continuation_brief.status_detail}
            </p>
            <p className="mt-2 rounded-[9px] border border-white/46 bg-white/42 px-2 py-1.5 text-[10px] font-semibold leading-4 text-(--text-strong)">
              {continuation_brief.resume_prompt}
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {continuation_brief.checkpoints.map((checkpoint) => (
            <div
              className={cn(
                "min-w-0 rounded-[9px] border px-1.5 py-1.5",
                checkpoint.tone === "warning"
                  ? "border-[rgba(223,157,46,0.18)] bg-[rgba(223,157,46,0.08)]"
                  : checkpoint.tone === "success"
                    ? "border-[rgba(47,184,132,0.17)] bg-[rgba(47,184,132,0.08)]"
                    : "border-white/44 bg-white/34",
              )}
              key={checkpoint.label}
            >
              <p className="truncate text-[8.5px] font-bold text-(--text-soft)">{checkpoint.label}</p>
              <p className="mt-0.5 truncate text-[10px] font-black text-(--text-strong)">{checkpoint.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-(--text-soft)">
          <span>执行胶片</span>
          <span>{reel_events.length}/{events.length}</span>
        </div>
        <div className="space-y-1">
          {reel_events.map((item, index) => {
            const Icon = icon_for_operation_kind(item.kind);
            const phase_meta = PHASE_STATUS_META[item.phase];
            return (
              <div
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border border-white/48 bg-white/34 px-2 py-1.5 text-[10px]"
                key={item.id}
              >
                <span className={cn(
                  "grid h-5 w-5 place-items-center rounded-full border",
                  item.id === event.id
                    ? "border-[rgba(91,114,255,0.25)] bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                    : "border-white/58 bg-white/52 text-(--icon-muted)",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-(--text-strong)">
                    {index + Math.max(events.length - reel_events.length, 0) + 1}. {item.tool_name ?? item.title}
                  </span>
                  <span className="block truncate text-[9.5px] text-(--text-soft)">
                    {item.target ?? item.summary ?? SURFACE_LABEL[item.surface]}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-white/54 px-1.5 py-px font-semibold text-(--text-soft)">
                  {phase_meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-(--text-soft)">
          <span>关键产物</span>
          <span>{artifacts.length}</span>
        </div>
        {artifacts.length ? (
          <div className="grid gap-1">
            {artifacts.map((artifact) => {
              const Icon = artifact.Icon;
              return (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-[10px] border border-white/48 bg-white/34 px-2 py-1.5"
                  key={artifact.id}
                  title={artifact.value}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/58 text-(--icon-muted)">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-(--text-strong)">
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
        ) : (
          <div className="rounded-[10px] border border-white/48 bg-white/30 px-2 py-2 text-[10px] font-semibold text-(--text-soft)">
            本轮没有独立文件或证据产物。
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <SummaryMetric label="步骤" value={events.length} />
        <SummaryMetric label="文件" value={file_count} />
        <SummaryMetric label="终端" value={terminal_count} />
        <SummaryMetric label="证据" value={evidence_count} />
      </div>

      <div className="mt-3 rounded-[12px] border border-white/50 bg-white/34 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold text-(--text-soft)">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 shrink-0" />
            <span>交接清单</span>
          </span>
          <span>{checklist_items.length} 项</span>
        </div>
        <div className="grid gap-1">
          {checklist_items.map((item) => {
            const Icon = item.Icon;
            return (
              <div
                className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[9px] bg-white/34 px-2 py-1.5 text-[9.5px]"
                key={item.label}
              >
                <span className={cn(
                  "grid h-[18px] w-[18px] place-items-center rounded-full",
                  item.tone === "warning"
                    ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                    : item.tone === "success"
                      ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                      : "bg-white/58 text-(--icon-muted)",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="truncate font-bold text-(--text-strong)">{item.label}</span>
                <span className="max-w-[120px] truncate text-(--text-soft)">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StageArchiveShelf({
  event,
  events,
  narrative,
  snapshot,
  windows,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
  windows: StageWindowState[];
}) {
  const archive_items = useMemo(() => collect_archive_capsules({
    event,
    events,
    snapshot,
    windows,
  }), [event, events, snapshot, windows]);
  const archived_count = events.filter((item) => (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[82px] left-1/2 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 max-md:relative max-md:bottom-auto max-md:left-auto max-md:mt-3 max-md:w-full max-md:translate-x-0">
      <div className="rounded-[18px] border border-white/68 bg-white/54 p-3 shadow-[0_20px_52px_rgba(18,28,42,0.12)] backdrop-blur-xl">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
              event.phase === "error"
                ? "border-[rgba(223,93,98,0.22)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
            )}>
              {event.phase === "error" ? <AlertTriangle className="h-4 w-4" /> : <ListTree className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">现场归档</p>
              <p className="truncate text-[10px] text-(--text-soft)">
                {narrative.phase === "settling" ? "窗口正在落盘为可回看的执行记录" : "工具窗口已沉淀为可追溯工作现场"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/56 bg-white/50 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            {archived_count}/{events.length} 已归档
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {archive_items.map((item, index) => {
            const Icon = item.Icon;
            return (
              <div
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-[13px] border px-2.5 py-2",
                  item.tone === "warning"
                    ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
                    : item.tone === "success"
                      ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/52 bg-white/36",
                )}
                key={item.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-[10px]",
                    item.tone === "warning"
                      ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                      : item.tone === "success"
                        ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                        : "bg-white/58 text-(--icon-muted)",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
                      {item.label}
                    </span>
                    <span className="block truncate text-[9px] font-semibold text-(--text-soft)">
                      {item.value}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-(--text-soft)">
                  <span>{item.meta}</span>
                  <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-white/54 bg-white/42 px-2 py-2">
      <div className="text-[13px] font-black text-(--text-strong)">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-normal text-(--text-soft)">{label}</div>
    </div>
  );
}
