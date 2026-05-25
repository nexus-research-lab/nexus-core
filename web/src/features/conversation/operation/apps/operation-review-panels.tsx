import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileText,
  Globe2,
  LockKeyhole,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  build_operation_input_rows,
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import { format_operation_time, safe_json_stringify } from "../operation-preview";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "../operation-types";

export function PermissionCheckpointPanel({
  compact = false,
  event,
  evidence: payload_evidence,
  snapshot,
}: {
  compact?: boolean;
  event: NexusOperationEvent;
  evidence?: OperationEvidence[];
  snapshot: NexusOperationSnapshot | null;
}) {
  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const rows = build_operation_input_rows(event.input_preview, profile.target_keys, compact ? 4 : 8);
  const evidence = dedupe_evidence([
    ...(payload_evidence ?? []),
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ]).slice(0, compact ? 4 : 7);
  const lead = event.summary ?? event.target ?? event.title ?? event.tool_name ?? "等待用户确认";
  const request_target = event.target ?? rows[0]?.value ?? event.tool_name ?? "pending request";

  return (
    <div className="flex h-full min-h-[320px] min-w-0 max-w-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.88))]">
      <div className="border-b border-(--divider-subtle-color) px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[rgba(223,157,46,0.13)] text-[color:var(--warning)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="mt-1 truncate text-[15px] font-black tracking-[-0.03em] text-(--text-strong)">
                Privacy & Security
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-(--text-muted)">
                {lead}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[rgba(223,157,46,0.12)] px-2.5 py-1 text-[10px] font-black text-[color:var(--warning)]">
            {PHASE_LABELS[event.phase]}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[170px_minmax(0,1fr)] max-md:grid-cols-1">
        <aside className="border-r border-(--divider-subtle-color) bg-white/46 p-2.5 max-md:border-b max-md:border-r-0">
          <div className="mb-2 flex items-center gap-1.5 rounded-[9px] border border-(--divider-subtle-color) bg-white/70 px-2 py-1.5 text-[10px] text-(--text-soft)">
            <Search className="h-3 w-3 shrink-0" />
            <span className="truncate">Search Settings</span>
          </div>
          {[
            { label: "Privacy", Icon: ShieldCheck },
            { label: "Automation", Icon: Settings2 },
            { label: "Files", Icon: FileText },
            { label: "Network", Icon: Globe2 },
          ].map((item, index) => (
            <div
              className={cn(
                "mb-1 flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[11px] font-bold",
                index === 1 ? "bg-white/82 text-(--text-strong)" : "text-(--text-soft)",
              )}
              key={item.label}
            >
              <item.Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </aside>

        <section className="soft-scrollbar min-h-0 min-w-0 overflow-auto p-4">
          <div className="rounded-[14px] border border-(--divider-subtle-color) bg-white/76">
            <div className="flex items-start justify-between gap-3 border-b border-(--divider-subtle-color) px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-black text-(--text-strong)">Automation</p>
                <p className="mt-1 text-[11px] leading-5 text-(--text-muted)">
                  Nexus wants to control an app or file on this desktop.
                </p>
              </div>
              <span className="relative h-5 w-9 shrink-0 rounded-full bg-[rgba(47,184,132,0.22)] p-0.5 shadow-[inset_0_1px_2px_rgba(18,28,42,0.10)]">
                <span className="block h-4 w-4 translate-x-4 rounded-full bg-white shadow-[0_2px_6px_rgba(18,28,42,0.20)]" />
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="flex min-w-0 items-center gap-3 rounded-[12px] bg-[rgba(248,250,252,0.82)] px-3 py-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]">
                  <Settings2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-(--text-strong)">{profile.title}</p>
                  <p className="truncate text-[10px] text-(--text-soft)">{request_target}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[rgba(223,157,46,0.12)] px-2 py-1 text-[10px] font-black text-[color:var(--warning)]">
                  Pending
                </span>
              </div>
              <pre className="mt-3 max-h-[128px] overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-[rgba(18,28,42,0.05)] px-3 py-2 font-mono text-[11px] leading-5 text-(--text-strong)">
                {request_target}
              </pre>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-(--divider-subtle-color) pt-3">
                <button
                  className="h-7 rounded-[7px] border border-(--divider-subtle-color) bg-white/80 px-3 text-[11px] font-semibold text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition hover:bg-white"
                  type="button"
                >
                  Deny
                </button>
                <button
                  className="h-7 rounded-[7px] border border-[rgba(91,114,255,0.28)] bg-[rgba(91,114,255,0.92)] px-3 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(91,114,255,0.20)] transition hover:bg-[color:var(--primary)]"
                  type="button"
                >
                  Allow
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] max-sm:grid-cols-1">
            {[
              { label: "暂停点", value: "permission", Icon: Clock3 },
              { label: "工具", value: profile.title, Icon: Play },
              { label: "更新", value: format_operation_time(event.updated_at), Icon: RefreshCw },
            ].map((item) => (
              <div className="min-w-0 rounded-[11px] border border-white/64 bg-white/62 px-2.5 py-2" key={item.label}>
                <div className="flex items-center gap-1.5 text-(--text-soft)">
                  <item.Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-black">{item.label}</span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-(--text-strong)">{item.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">Details</p>
          <div className="mt-2 space-y-1.5">
            {rows.length ? rows.map((row) => (
              <div className="rounded-[10px] border border-white/62 bg-white/70 px-2.5 py-2 text-[10px]" key={row.key}>
                <p className="font-black text-(--text-strong)">{row.label}</p>
                <p className="mt-0.5 break-words font-mono leading-4 text-(--text-muted)">{row.value}</p>
              </div>
            )) : (
              <div className="rounded-[10px] border border-white/62 bg-white/70 px-2.5 py-2 text-[10px] text-(--text-muted)">
                {event.target ?? event.tool_name ?? "No additional details"}
              </div>
            )}
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">Recent Activity</p>
          <div className="mt-2 space-y-1.5">
            {(evidence.length ? evidence : [{
              type: "permission",
              label: "waiting",
              value: lead,
            } satisfies OperationEvidence]).map((item, index) => {
              const Icon = icon_for_evidence(item.type);
              return (
                <div
                  className="flex min-w-0 items-start gap-2 rounded-[10px] border border-white/62 bg-white/68 px-2.5 py-2 text-[10px]"
                  key={`${item.type}:${item.label}:${item.value ?? ""}:${index}`}
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[7px] bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-(--text-strong)">{item.label}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-(--text-muted)">{item.value ?? item.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export function OperationReviewPanel({
  compact = false,
  event,
  evidence: payload_evidence,
  mode,
  snapshot,
}: {
  compact?: boolean;
  event: NexusOperationEvent;
  evidence?: OperationEvidence[];
  mode: "evidence" | "permission";
  snapshot: NexusOperationSnapshot | null;
}) {
  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const evidence = dedupe_evidence([
    ...(payload_evidence ?? []),
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ]).slice(0, compact ? 4 : 8);
  const rows = build_operation_input_rows(event.input_preview, profile.target_keys, compact ? 3 : 6);
  const waiting = event.phase === "waiting" || mode === "permission";
  const lead = event.summary ?? event.title ?? event.target ?? event.tool_name ?? "操作";

  return (
    <div className="flex h-full min-h-[260px] min-w-0 max-w-full flex-col overflow-hidden rounded-[13px] border border-(--divider-subtle-color) bg-white/76">
      <div className={cn(
        "border-b border-(--divider-subtle-color) px-3 py-3",
        waiting
          ? "bg-[linear-gradient(135deg,rgba(223,157,46,0.13),rgba(255,255,255,0.76))]"
          : "bg-[linear-gradient(135deg,rgba(91,114,255,0.10),rgba(255,255,255,0.78))]",
      )}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">
              {waiting ? "授权检查点" : "证据检查器"}
            </p>
            <h3 className="mt-1 truncate text-[14px] font-black tracking-[-0.03em] text-(--text-strong)">
              {waiting ? "等待用户确认" : "执行证据"}
            </h3>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
            waiting
              ? "bg-[rgba(223,157,46,0.14)] text-[color:var(--warning)]"
              : "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]",
          )}>
            {PHASE_LABELS[event.phase]}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-(--text-muted)">{lead}</p>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_180px] gap-0 max-md:grid-cols-1">
        <div className="soft-scrollbar min-h-0 min-w-0 overflow-auto p-3">
          <div className="space-y-2">
            {(evidence.length ? evidence : [{
              type: waiting ? "permission" : "status",
              label: waiting ? "request" : "status",
              value: lead,
            } satisfies OperationEvidence]).map((item, index) => {
              const Icon = icon_for_evidence(item.type);
              return (
                <div
                  className="flex min-w-0 gap-2 rounded-[11px] border border-(--divider-subtle-color) bg-white/70 px-2.5 py-2 text-[11px]"
                  key={`${item.type}:${item.label}:${item.value ?? ""}:${index}`}
                >
                  <span className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[8px]",
                    item.type === "error" && "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
                    item.type === "permission" && "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]",
                    item.type !== "error" && item.type !== "permission" && "bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 font-black text-(--text-strong)">{item.label}</span>
                      <span className="min-w-0 flex-1 truncate text-(--text-muted)">{item.value ?? item.type}</span>
                    </div>
                    {item.preview != null ? (
                      <pre className="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-words rounded-[8px] bg-[rgba(18,28,42,0.05)] px-2 py-1.5 font-mono text-[10px] leading-4 text-(--text-soft)">
                        {safe_json_stringify(item.preview)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="soft-scrollbar min-h-0 overflow-auto border-l border-(--divider-subtle-color) bg-white/45 p-3 max-md:max-h-[220px] max-md:border-l-0 max-md:border-t">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">request</p>
          <div className="mt-2 space-y-1.5">
            {rows.length ? rows.map((row) => (
              <div className="rounded-[9px] bg-white/70 px-2 py-1.5 text-[10px]" key={row.key}>
                <p className="font-black text-(--text-strong)">{row.label}</p>
                <p className="mt-0.5 break-words text-(--text-muted)">{row.value}</p>
              </div>
            )) : (
              <div className="rounded-[9px] bg-white/70 px-2 py-1.5 text-[10px] text-(--text-muted)">
                {event.target ?? event.tool_name ?? "No additional details"}
              </div>
            )}
          </div>
          {waiting ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
              <span className="rounded-[7px] border border-(--divider-subtle-color) bg-white/80 px-2 py-1.5 text-center text-(--text-strong)">
                Deny
              </span>
              <span className="rounded-[7px] border border-[rgba(91,114,255,0.26)] bg-[rgba(91,114,255,0.92)] px-2 py-1.5 text-center text-white">
                Allow
              </span>
            </div>
          ) : null}
          <div className="mt-2 rounded-[9px] bg-white/70 px-2 py-1.5 text-[10px] text-(--text-muted)">
            updated {format_operation_time(event.updated_at)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function dedupe_evidence(items: OperationEvidence[]): OperationEvidence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.label}:${item.value ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function icon_for_evidence(type: OperationEvidence["type"]): LucideIcon {
  if (type === "file" || type === "diff") {
    return FileText;
  }
  if (type === "terminal") {
    return Play;
  }
  if (type === "url") {
    return Globe2;
  }
  if (type === "task") {
    return ClipboardList;
  }
  if (type === "permission") {
    return CircleHelp;
  }
  if (type === "error") {
    return AlertTriangle;
  }
  if (type === "skill") {
    return Sparkles;
  }
  return CheckCircle2;
}
