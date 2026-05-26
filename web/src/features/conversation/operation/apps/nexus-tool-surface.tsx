import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  ListTree,
  RadioTower,
  Settings2,
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

  return (
    <div className="grid h-full min-h-[320px] min-w-0 grid-cols-[168px_minmax(0,1fr)] overflow-hidden bg-[#f6f8fb] max-md:grid-cols-1">
      <aside className="soft-scrollbar min-h-0 border-r border-(--divider-subtle-color) bg-[#edf2f7]/82 p-2 max-md:hidden">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/72 bg-white/70 text-[color:var(--primary)] shadow-[0_8px_20px_rgba(18,28,42,0.06)]">
            <Settings2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black text-(--text-strong)">Nexus 实用工具</p>
            <p className="truncate text-[10px] text-(--text-soft)">工具会话</p>
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
        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-(--divider-subtle-color) bg-white/68 px-4 py-3">
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
                {session.display_target}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-black text-(--text-muted)">
            {PHASE_LABELS[event.phase]}
          </span>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]">
          <div className="border-b border-(--divider-subtle-color) bg-white/42 px-4 py-3">
            <section className="min-w-0">
              <PaneTitle icon={FileText} title="请求" subtitle={event.summary ?? "工具输入"} />
              <div className="mt-3 overflow-hidden rounded-[10px] border border-(--divider-subtle-color) bg-white/72">
                {session.input_rows.length ? session.input_rows.map((row) => (
                  <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] border-b border-(--divider-subtle-color) text-[10px] last:border-b-0" key={row.key}>
                    <span className="bg-[#f2f5f8] px-2.5 py-1.5 font-black text-(--text-strong)">{row.label}</span>
                    <span className="truncate px-2.5 py-1.5 font-mono leading-4 text-(--text-muted)" title={row.value}>{row.value}</span>
                  </div>
                )) : (
                  <p className="px-3 py-2 text-[11px] leading-5 text-(--text-muted)">{session.display_target}</p>
                )}
              </div>
            </section>
          </div>

          <section className="soft-scrollbar min-h-0 overflow-auto bg-[#fbfcfe] p-4">
            <PaneTitle icon={RadioTower} title="响应" subtitle="工具输出" />
            <pre className="mt-3 min-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-(--divider-subtle-color) bg-[#111820] px-3 py-2 font-mono text-[11px] leading-5 text-[#dbe7ee]">
              {session.output_text}
            </pre>
          </section>

          <footer className="border-t border-(--divider-subtle-color) bg-white/72 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-(--text-soft)">Events</p>
              <p className="text-[10px] font-semibold text-(--text-soft)">{output_lines.length || 1} 行输出</p>
            </div>
            <div className="mt-1.5 grid max-h-[72px] gap-1 overflow-auto">
              {session.timeline.slice(-3).map((item, index) => (
                <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] px-2 py-1.5 text-[10px] text-(--text-muted)" key={item.id}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
                  <span className="truncate font-semibold text-(--text-strong)">{index + 1}. {item.label}</span>
                  <span className="shrink-0 font-black">{item.phase_label}</span>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function PaneTitle({
  icon: Icon,
  subtitle,
  title,
}: {
  icon: LucideIcon;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-(--divider-subtle-color) bg-white/70 text-(--icon-default)">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black text-(--text-strong)">{title}</p>
        <p className="truncate text-[10px] text-(--text-soft)">{subtitle}</p>
      </div>
    </div>
  );
}

function SidebarIcon({ index }: { index: number }) {
  const icons = [Settings2, FileText, CircleDot, Clock3, ListTree];
  const Icon = icons[index] ?? ListTree;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}
