import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageHandoffSummary } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "../operation-types";
import {
  build_operation_input_rows,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
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
  const status_label = event.phase === "error"
    ? "需要回看"
    : event.phase === "cancelled"
      ? "已中断"
      : "已归档";

  return (
    <div className="grid h-full min-h-[330px] min-w-0 grid-cols-[minmax(220px,0.38fr)_minmax(0,1fr)] gap-3 max-md:grid-cols-1">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-[rgba(47,184,132,0.20)] bg-[rgba(255,255,255,0.70)] shadow-[inset_0_1px_0_rgba(255,255,255,0.58)]">
        <div className="border-b border-white/54 px-3 py-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
                failed_count
                  ? "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                  : "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
              )}>
                {failed_count ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black text-(--text-strong)">执行清单</p>
                <p className="truncate text-[10.5px] text-(--text-soft)">run-manifest.md</p>
              </div>
            </div>
            <span className={cn(
              "shrink-0 rounded-full border px-2 py-1 text-[9px] font-black",
              failed_count
                ? "border-[rgba(223,93,98,0.22)] bg-[rgba(223,93,98,0.09)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.09)] text-[color:var(--success)]",
            )}>
              {status_label}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-(--text-muted)">
            {result_text || event.summary || event.target || "本轮执行已归档为可回看的工作现场。"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 border-b border-white/52 p-2 text-[10px]">
          <ManifestMetric label="步骤" value={events.length} />
          <ManifestMetric label="完成" value={`${completed_count}/${events.length}`} />
          <ManifestMetric label="产物" value={artifacts.length} />
          <ManifestMetric label="耗时" value={duration} />
        </div>

        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-3">
          <ManifestActionMap events={events} />

          {handoff_summary ? (
            <section className={cn(
              "mb-3 overflow-hidden rounded-[13px] border p-2.5",
              failed_count
                ? "border-[rgba(223,157,46,0.22)] bg-[rgba(223,157,46,0.08)]"
                : "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.07)]",
            )}>
              <div className="flex min-w-0 items-start gap-2">
                <span className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border",
                  failed_count
                    ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
                    : "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
                )}>
                  {failed_count ? <AlertTriangle className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-[10.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                      {handoff_summary.status_label}
                    </p>
                    <span className="shrink-0 rounded-full bg-white/58 px-1.5 py-px text-[8.5px] font-bold text-(--text-soft)">
                      交接
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-muted)">
                    {handoff_summary.status_detail}
                  </p>
                  <p className="mt-2 rounded-[9px] border border-white/46 bg-white/40 px-2 py-1.5 text-[10px] font-semibold leading-4 text-(--text-strong)">
                    {handoff_summary.resume_prompt}
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 max-sm:grid-cols-2">
                {handoff_summary.checkpoints.map((checkpoint) => (
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
            </section>
          ) : null}

          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
            <span>交付物</span>
            <span>{artifacts.length}</span>
          </div>
          <div className="space-y-1.5">
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
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-(--divider-subtle-color) bg-white/72">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-(--divider-subtle-color) px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">执行回放</p>
            <p className="truncate text-[10px] text-(--text-soft)">工具调用、证据和结果按时间沉淀</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/62 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            round {event.round_id}
          </span>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">
            {events.map((item, index) => {
              const profile = resolve_operation_tool_profile(item.tool_name, item.kind, item.surface);
              const Icon = ACTION_ICON[profile.action];
              const can_focus_event = Boolean(on_focus_event);
              const input_row = build_operation_input_rows(item.input_preview, profile.target_keys, 1)[0] ?? null;
              const output_label = extract_manifest_event_output(item);
              return (
                <button
                  aria-label={`查看执行步骤 ${index + 1}：${profile.action_label} ${item.tool_name ?? item.title}`}
                  className={cn(
                    "grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 rounded-[12px] border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.36)]",
                    can_focus_event && "cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.06)]",
                    item.id === event.id
                      ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.08)]"
                      : "border-white/50 bg-white/36",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
                  title={`${profile.action_label} · ${item.tool_name ?? item.title}`}
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
                      {String(index + 1).padStart(2, "0")} · {profile.action_label} · {item.tool_name ?? item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-(--text-soft)">
                      {item.target ?? item.summary ?? profile.title}
                    </span>
                    {input_row || output_label ? (
                      <span className="mt-1 grid min-w-0 grid-cols-2 gap-1.5 max-sm:grid-cols-1">
                        {input_row ? (
                          <ManifestEventIOPill label="输入" value={`${input_row.label}: ${input_row.value}`} />
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

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 border-t border-(--divider-subtle-color) bg-white/48 p-2 max-sm:grid-cols-1">
          <ManifestFooterPanel
            Icon={Terminal}
            label="终端"
            value={terminal_events.length ? `${terminal_events.length} 条命令` : "无命令"}
          />
          <ManifestFooterPanel
            Icon={ClipboardList}
            label="证据"
            value={evidence.length ? `${evidence.length} 条证据` : "窗口状态"}
          />
        </div>
      </section>
    </div>
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
    <section className="mb-3 rounded-[13px] border border-white/52 bg-white/34 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-(--text-soft)">
        <span>工具类型</span>
        <span>{groups.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {groups.map((group) => {
          const Icon = ACTION_ICON[group.action];
          return (
            <div
              className={cn(
                "min-w-0 rounded-[10px] border px-2 py-1.5",
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
              <p className="mt-0.5 truncate text-[8.5px] font-semibold opacity-75">{group.title}</p>
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

function ManifestMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/48 bg-white/42 px-2 py-1.5">
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-(--text-soft)">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-black text-(--text-strong)">{value}</p>
    </div>
  );
}

function ManifestFooterPanel({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[11px] border border-white/50 bg-white/42 px-2.5 py-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-white/62 text-(--icon-muted)">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black text-(--text-strong)">{label}</span>
        <span className="block truncate text-[9.5px] text-(--text-soft)">{value}</span>
      </span>
    </div>
  );
}
