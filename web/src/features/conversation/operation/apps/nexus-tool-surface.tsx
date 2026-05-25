import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Settings2,
} from "lucide-react";

import {
  build_operation_input_rows,
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import {
  format_operation_time,
  get_preview_lines,
  safe_json_stringify,
} from "../operation-preview";
import type { NexusOperationEvent } from "../operation-types";
import { ACTION_ICON, ACTION_TONE_CLASS } from "./operation-action-style";

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
  const rows = build_operation_input_rows(event.input_preview, profile.target_keys, 8);
  const output_lines = get_preview_lines(preview ?? event.result_preview ?? event.summary, 10);
  const display_target = target ?? event.target ?? event.tool_name ?? profile.title;

  return (
    <div className="grid h-full min-h-[320px] min-w-0 grid-cols-[180px_minmax(0,1fr)] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,249,253,0.88))] max-md:grid-cols-1">
      <aside className="border-r border-(--divider-subtle-color) bg-white/46 p-3 max-md:border-b max-md:border-r-0">
        <div className="mb-3 flex items-center gap-2 rounded-[11px] border border-white/62 bg-white/74 px-2.5 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]">
            <Settings2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">Nexus</p>
            <p className="truncate text-[10px] text-(--text-soft)">工具应用</p>
          </div>
        </div>
        {[
          { label: "当前工具", value: profile.title, Icon: ActionIcon },
          { label: "目标", value: display_target, Icon: FileText },
          { label: "状态", value: PHASE_LABELS[event.phase], Icon: CircleDot },
          { label: "更新时间", value: format_operation_time(event.updated_at), Icon: Clock3 },
        ].map((item, index) => (
          <div
            className="mb-1.5 min-w-0 rounded-[10px] px-2.5 py-2 text-[10px]"
            key={`${item.label}:${index}`}
          >
            <div className="flex items-center gap-1.5 font-black text-(--text-soft)">
              <item.Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
            <p className="mt-1 truncate font-semibold text-(--text-strong)">{item.value}</p>
          </div>
        ))}
      </aside>

      <section className="soft-scrollbar min-h-0 min-w-0 overflow-auto p-4">
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-(--divider-subtle-color) pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border px-2.5 text-[11px] font-black ${ACTION_TONE_CLASS[profile.action]}`}>
              <ActionIcon className="h-4 w-4" />
              {profile.action_label}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black tracking-[-0.03em] text-(--text-strong)">
                {event.tool_name ?? profile.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-(--text-muted)">
                {event.summary ?? display_target}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/72 px-2.5 py-1 text-[10px] font-black text-(--text-muted)">
            {PHASE_LABELS[event.phase]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          <div className="min-w-0 rounded-[14px] border border-white/64 bg-white/72 p-3">
            <p className="text-[11px] font-black text-(--text-strong)">输入</p>
            <div className="mt-2 space-y-1.5">
              {rows.length ? rows.map((row) => (
                <div className="rounded-[9px] bg-[rgba(248,250,252,0.86)] px-2.5 py-2 text-[10px]" key={row.key}>
                  <p className="font-black text-(--text-strong)">{row.label}</p>
                  <p className="mt-0.5 break-words font-mono leading-4 text-(--text-muted)">{row.value}</p>
                </div>
              )) : (
                <p className="rounded-[9px] bg-[rgba(248,250,252,0.86)] px-2.5 py-2 text-[10px] text-(--text-muted)">
                  {display_target}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[14px] border border-white/64 bg-[rgba(18,28,42,0.04)] p-3">
            <p className="text-[11px] font-black text-(--text-strong)">输出</p>
            <pre className="mt-2 max-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-[rgba(18,28,42,0.06)] px-3 py-2 font-mono text-[11px] leading-5 text-(--text-strong)">
              {output_lines.length ? output_lines.join("\n") : safe_json_stringify(preview ?? event.result_preview ?? event.summary ?? "等待工具结果")}
            </pre>
          </div>
        </div>

        <div className="mt-4 rounded-[14px] border border-white/64 bg-white/64 p-3">
          <p className="text-[11px] font-black text-(--text-strong)">事件轨迹</p>
          <div className="mt-2 space-y-1.5">
            {(related_events.length ? related_events : [event]).slice(-4).map((item) => (
              <div className="flex min-w-0 items-center gap-2 rounded-[10px] bg-white/68 px-2.5 py-2 text-[10px]" key={item.id}>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
                <span className="truncate font-black text-(--text-strong)">{item.tool_name ?? item.title}</span>
                <span className="ml-auto shrink-0 text-(--text-soft)">{PHASE_LABELS[item.phase]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
