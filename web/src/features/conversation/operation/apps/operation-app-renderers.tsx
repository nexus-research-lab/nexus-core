import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  FilePenLine,
  FilePlus2,
  FileSpreadsheet,
  FileSearch,
  FileText,
  FolderOpen,
  Globe2,
  ImageIcon,
  ListTree,
  Loader2,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { get_workspace_file_raw_url } from "@/lib/api/agent-manage-api";
import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { StageHandoffSummary } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
  OperationPhase,
} from "../operation-types";
import type { OperationActionKind, OperationToolProfile } from "../operation-tool-catalog";
import {
  build_operation_input_rows,
  extract_operation_input_value,
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import {
  basename,
  build_editor_preview_lines,
  detect_preview_kind,
  format_operation_time,
  get_preview_lines,
  safe_json_stringify,
} from "../operation-preview";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

const RUNTIME_HANDOFF_STALLED_MS = 45_000;

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
      <div className="flex h-full min-h-[240px] flex-col gap-3">
        <ToolActionHeader event={event} profile={profile} target={window.payload.target ?? event.target} />
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
    const srcdoc = window.payload.srcdoc ?? (
      typeof window.payload.preview === "string" && looks_like_html(window.payload.preview)
        ? window.payload.preview
        : null
    );
    const raw_url = build_workspace_raw_url(event.agent_id, window.payload.target ?? event.target);
    const url = window.payload.url ?? (looks_like_url(query) ? query : null);
    const iframe_url = srcdoc ? null : raw_url ?? url;
    return (
      <div className="flex h-full min-h-[280px] min-w-0 max-w-full flex-col gap-3">
        <ToolActionHeader event={event} profile={profile} target={query} />
        <BrowserSurface
          event={event}
          iframe_url={iframe_url}
          lines={lines}
          query={query}
          srcdoc={srcdoc}
          target={window.payload.target ?? event.target}
        />
      </div>
    );
  }

  if (window.kind === "task_board") {
    return (
      <div className="flex h-full min-h-[320px] min-w-0 max-w-full flex-col gap-3">
        <ToolActionHeader event={event} profile={profile} target={event.target ?? event.tool_name} />
        <TaskBoardSurface
          event={event}
          lines={window.payload.lines ?? []}
          snapshot={snapshot}
        />
      </div>
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

const ACTION_ICON: Record<OperationActionKind, LucideIcon> = {
  read: BookOpen,
  list: ListTree,
  search: FileSearch,
  create: FilePlus2,
  edit: FilePenLine,
  run: Play,
  stop: Square,
  web_search: Search,
  web_fetch: Globe2,
  skill: Sparkles,
  task: ClipboardList,
  task_progress: ClipboardList,
  plan: ClipboardList,
  question: CircleHelp,
  summary: FileText,
  generic: FolderOpen,
};

const ACTION_TONE_CLASS: Record<OperationActionKind, string> = {
  read: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  list: "border-[rgba(79,162,159,0.22)] bg-[rgba(79,162,159,0.10)] text-[rgb(42,128,125)]",
  search: "border-[rgba(79,162,159,0.22)] bg-[rgba(79,162,159,0.10)] text-[rgb(42,128,125)]",
  create: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  edit: "border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.11)] text-[color:var(--warning)]",
  run: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  stop: "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
  web_search: "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]",
  web_fetch: "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]",
  skill: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  task: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  task_progress: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  plan: "border-[rgba(117,131,149,0.22)] bg-white/70 text-(--text-muted)",
  question: "border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.11)] text-[color:var(--warning)]",
  summary: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  generic: "border-(--divider-subtle-color) bg-white/70 text-(--text-muted)",
};

function BrowserSurface({
  event,
  iframe_url,
  lines,
  query,
  srcdoc,
  target,
}: {
  event: NexusOperationEvent;
  iframe_url: string | null;
  lines: string[];
  query: string;
  srcdoc: string | null;
  target?: string | null;
}) {
  const has_live_view = Boolean(srcdoc || iframe_url);
  const status = browser_status_for_event(event, has_live_view);
  const display_url = browser_display_url({ iframe_url, query, srcdoc, target });
  const source_label = srcdoc
    ? "srcdoc"
    : iframe_url?.startsWith("/nexus/")
      ? "workspace"
      : looks_like_url(display_url)
        ? "remote"
        : "preview";

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-[14px] border border-(--divider-subtle-color) bg-[#f7f9fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <div className="flex min-w-0 items-center gap-2 border-b border-(--divider-subtle-color) bg-white/78 px-3 py-2">
        <div className="flex shrink-0 items-center gap-1 text-(--icon-muted)">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-(--divider-subtle-color) bg-white/64">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <span className="grid h-6 w-6 place-items-center rounded-md border border-(--divider-subtle-color) bg-white/64">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="grid h-6 w-6 place-items-center rounded-md border border-(--divider-subtle-color) bg-white/64">
            {event.phase === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-(--divider-subtle-color) bg-white px-2.5 py-1.5 text-[11px] text-(--text-default)">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
          <span className="min-w-0 flex-1 truncate font-medium">{display_url}</span>
          <span className="shrink-0 rounded bg-[rgba(117,131,149,0.10)] px-1.5 py-px text-[9px] font-bold uppercase text-(--text-soft)">
            {source_label}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) bg-white/46 px-3 py-1.5 text-[10px] font-semibold text-(--text-soft)">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-1",
          status.tone === "loading" && "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
          status.tone === "ready" && "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          status.tone === "error" && "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
          status.tone === "idle" && "bg-white/70 text-(--text-muted)",
        )}>
          {status.tone === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {status.tone === "ready" ? <CheckCircle2 className="h-3 w-3" /> : null}
          {status.tone === "error" ? <AlertTriangle className="h-3 w-3" /> : null}
          {status.tone === "idle" ? <Clock3 className="h-3 w-3" /> : null}
          {status.label}
        </span>
        <span className="truncate">{format_operation_time(event.updated_at)}</span>
      </div>

      {has_live_view ? (
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            className="h-full w-full bg-white"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"
            src={iframe_url ?? undefined}
            srcDoc={iframe_url ? undefined : srcdoc ?? undefined}
            title={target ?? query}
          />
        </div>
      ) : (
        <BrowserPreviewFallback event={event} lines={lines} query={query} />
      )}
    </div>
  );
}

function BrowserPreviewFallback({
  event,
  lines,
  query,
}: {
  event: NexusOperationEvent;
  lines: string[];
  query: string;
}) {
  const display_lines = lines.length
    ? lines.slice(0, 5)
    : event.phase === "running"
      ? ["正在等待浏览器返回内容", "如果这是远程页面，加载完成后会保留摘要和证据。"]
      : [event.summary ?? query];

  return (
    <div className="soft-scrollbar min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#ffffff,#f3f6fa)] p-4">
      <div className="operation-web-loading mb-3 h-20 rounded-[14px] border border-[rgba(223,157,46,0.24)] bg-[linear-gradient(135deg,rgba(223,157,46,0.16),rgba(255,255,255,0.72),rgba(91,114,255,0.08))]" />
      <div className="space-y-2">
        {display_lines.map((line, index) => (
          <div className="rounded-[12px] border border-(--divider-subtle-color) bg-white/76 p-3 shadow-[0_10px_24px_rgba(18,28,42,0.05)]" key={`${line}:${index}`}>
            <p className="line-clamp-3 text-[12px] leading-5 text-(--text-default)">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceFinder({
  active_path,
  event,
  items,
}: {
  active_path?: string | null;
  event: NexusOperationEvent;
  items: NonNullable<StageWindowState["payload"]["workspace_items"]>;
}) {
  const display_items = items.length
    ? items
    : [{
      id: "empty",
      path: active_path ?? event.target ?? "workspace",
      status: event.phase === "running" ? "writing" as const : "idle" as const,
      updated_at: event.updated_at,
      agent_id: event.agent_id,
      version: 1,
      source: "unknown" as const,
      event_type: "file_write_end" as const,
    }];
  const changed_count = display_items.filter((item) => item.status === "updated" || item.status === "writing").length;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-[13px] border border-(--divider-subtle-color) bg-white/72">
      <div className="hidden w-24 shrink-0 border-r border-(--divider-subtle-color) bg-[#f4f7fb] p-2 text-[10px] font-bold text-(--text-soft) sm:block">
        <div className="rounded-[9px] bg-white/70 px-2 py-2 text-(--text-strong)">文件</div>
        <div className="mt-1 rounded-[9px] px-2 py-2">搜索</div>
        <div className="mt-1 rounded-[9px] px-2 py-2">变更</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-(--text-strong)">工作区</p>
            <p className="truncate text-[10px] text-(--text-soft)">
              {display_items.length} 个文件 · {changed_count} 个变更
            </p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
            event.phase === "running"
              ? "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
              : "bg-white/70 text-(--text-muted)",
          )}>
            {PHASE_LABEL[event.phase]}
          </span>
        </div>
        <div className="soft-scrollbar max-h-[calc(100%-48px)] overflow-auto p-2">
          {workspace_tree_rows(display_items.map((item) => item.path)).map((row) => (
            <WorkspaceTreeRow
              active={row.path === active_path}
              depth={row.depth}
              item={display_items.find((item) => item.path === row.path)}
              key={row.path}
              label={row.label}
              path={row.path}
              type={row.type}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceTreeRow({
  active,
  depth,
  item,
  label,
  path,
  type,
}: {
  active: boolean;
  depth: number;
  item?: NonNullable<StageWindowState["payload"]["workspace_items"]>[number];
  label: string;
  path: string;
  type: "folder" | "file";
}) {
  const status = item?.status;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11px]",
        active ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]" : "text-(--text-muted) hover:bg-white/70",
      )}
      title={path}
    >
      <span style={{ width: depth * 12 }} className="shrink-0" />
      {type === "folder" ? (
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className={cn("min-w-0 flex-1 truncate", type === "folder" && "font-bold text-(--text-strong)")}>
        {label}
      </span>
      {status ? (
        <span className={cn(
          "shrink-0 rounded px-1.5 py-px text-[9px] font-bold",
          status === "writing" && "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
          status === "updated" && "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          status === "deleted" && "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
          status === "idle" && "bg-white/70 text-(--text-soft)",
        )}>
          {status}
        </span>
      ) : null}
    </div>
  );
}

function workspace_tree_rows(paths: string[]): Array<{
  depth: number;
  label: string;
  path: string;
  type: "folder" | "file";
}> {
  const rows = new Map<string, { depth: number; label: string; path: string; type: "folder" | "file" }>();
  paths.forEach((path) => {
    const parts = path.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const current_path = parts.slice(0, index + 1).join("/");
      if (!rows.has(current_path)) {
        rows.set(current_path, {
          depth: index,
          label: part,
          path: current_path,
          type: index === parts.length - 1 ? "file" : "folder",
        });
      }
    });
  });
  return Array.from(rows.values()).sort((left, right) => {
    if (left.path === right.path) {
      return 0;
    }
    const left_parent = left.path.split("/").slice(0, -1).join("/");
    const right_parent = right.path.split("/").slice(0, -1).join("/");
    if (left_parent === right_parent && left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }
    return left.path.localeCompare(right.path);
  });
}

function browser_status_for_event(
  event: NexusOperationEvent,
  has_live_view: boolean,
): { label: string; tone: "loading" | "ready" | "error" | "idle" } {
  if (event.phase === "running") {
    return { label: has_live_view ? "页面运行中" : "正在加载", tone: "loading" };
  }
  if (event.phase === "error") {
    return { label: "加载失败", tone: "error" };
  }
  if (event.phase === "done") {
    return { label: has_live_view ? "页面已就绪" : "已生成摘要", tone: "ready" };
  }
  return { label: PHASE_LABEL[event.phase], tone: "idle" };
}

function browser_display_url({
  iframe_url,
  query,
  srcdoc,
  target,
}: {
  iframe_url: string | null;
  query: string;
  srcdoc: string | null;
  target?: string | null;
}): string {
  if (iframe_url) {
    return iframe_url;
  }
  if (srcdoc) {
    return target ?? query;
  }
  return query;
}

function TerminalSession({
  command,
  event,
  lines,
  related_events,
}: {
  command: string;
  event: NexusOperationEvent;
  lines: string[];
  related_events: NexusOperationEvent[];
}) {
  const entries = build_terminal_entries({
    command,
    event,
    fallback_lines: lines,
    related_events,
  });
  const has_running_entry = entries.some((entry) => entry.phase === "running");

  return (
    <div className="flex h-full min-h-[240px] min-w-0 flex-col overflow-hidden bg-[#080d12] font-mono text-[11px] leading-5 text-[#d9ffe5]">
      <div className="flex min-h-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0f171f] px-3 py-2 text-[10px] text-[#88a19a]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#17232c] text-[#8de0ad]">
            {has_running_entry ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          </span>
          <span className="truncate">nexus-shell</span>
          <span className="hidden text-[#536873] sm:inline">/workspace</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TerminalStatusPill event={event} />
          <span>{format_operation_time(event.updated_at)}</span>
        </div>
      </div>
      <div className="soft-scrollbar min-h-0 flex-1 overflow-auto px-4 py-3">
        {entries.map((entry, entry_index) => (
          <div className={entry_index > 0 ? "mt-4 border-t border-white/8 pt-3" : undefined} key={entry.id}>
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-[10px] text-[#60757f]">
              <span className="truncate">process {entry_index + 1}</span>
              <span className="shrink-0">{entry.duration_label}</span>
            </div>
            <TerminalCommandLine command={entry.command} />
            {entry.stdout.length || entry.stderr.length || entry.other.length ? (
              <div className="mt-1.5 space-y-0.5">
                {entry.stdout.map((line, index) => (
                  <TerminalOutputLine key={`stdout:${index}:${line}`} line={line} stream="stdout" />
                ))}
                {entry.stderr.map((line, index) => (
                  <TerminalOutputLine key={`stderr:${index}:${line}`} line={line} stream="stderr" />
                ))}
                {entry.other.map((line, index) => (
                  <TerminalOutputLine key={`other:${index}:${line}`} line={line} stream="output" />
                ))}
              </div>
            ) : (
              <div className="mt-1.5 text-[#6f827d]">
                {entry.phase === "running" ? "waiting for process output..." : "command completed without visible output"}
              </div>
            )}
            <TerminalExitLine entry={entry} />
          </div>
        ))}
        {has_running_entry ? (
          <div className="mt-2 flex min-w-0 items-start">
            <span className="operation-terminal-caret mt-[3px] shrink-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TerminalEntry {
  id: string;
  command: string;
  duration_label: string;
  exit_label: string;
  exit_tone: "success" | "error" | "running" | "muted";
  phase: OperationPhase;
  stdout: string[];
  stderr: string[];
  other: string[];
}

function TerminalCommandLine({ command }: { command: string }) {
  return (
    <div className="flex min-w-0 items-start">
      <span className="select-none text-[#526875]">$</span>
      <span className="ml-2 min-w-0 break-words text-[#f1fff7]">{command}</span>
    </div>
  );
}

function TerminalOutputLine({
  line,
  stream = "output",
}: {
  line: string;
  stream?: "stdout" | "stderr" | "output";
}) {
  if (line === "") {
    return <div className="h-5" />;
  }

  const prompt_match = line.match(/^(\s*[$>]\s?)(.*)$/);
  if (prompt_match) {
    return (
      <div className="flex min-w-0 items-start">
        <span className="select-none text-[#526875]">{prompt_match[1].trim()}</span>
        <span className="ml-2 min-w-0 break-words text-[#d9ffe5]">{prompt_match[2]}</span>
      </div>
    );
  }

  const is_error = /\b(error|failed|panic|exception|denied)\b/i.test(line);
  const is_success = /^(✓|done|success|passed)\b/i.test(line);
  const stream_label = stream === "stderr" ? "err" : stream === "stdout" ? "out" : "";

  return (
    <div className="flex min-w-0 items-start gap-2">
      {stream_label ? (
        <span className={cn(
          "mt-[2px] w-7 shrink-0 select-none rounded px-1 text-center text-[9px] leading-4",
          stream === "stderr" ? "bg-[#3b1b20] text-[#ff9d9d]" : "bg-[#10272b] text-[#80cbc4]",
        )}>
          {stream_label}
        </span>
      ) : null}
      <span className={cn(
        "min-w-0 break-words whitespace-pre-wrap",
        stream === "stderr" || is_error ? "text-[#ff8f8f]" : is_success ? "text-[#8de0ad]" : "text-[#b7cbc5]",
      )}>
        {line}
      </span>
    </div>
  );
}

function TerminalExitLine({ entry }: { entry: TerminalEntry }) {
  return (
    <div className={cn(
      "mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]",
      entry.exit_tone === "success" && "border-[#1f4b39] bg-[#0f211b] text-[#8de0ad]",
      entry.exit_tone === "error" && "border-[#55262b] bg-[#251217] text-[#ff9d9d]",
      entry.exit_tone === "running" && "border-[#45504a] bg-[#161d1b] text-[#cdd7d0]",
      entry.exit_tone === "muted" && "border-white/8 bg-white/[0.03] text-[#768982]",
    )}>
      {entry.exit_tone === "success" ? <CheckCircle2 className="h-3 w-3" /> : null}
      {entry.exit_tone === "error" ? <AlertTriangle className="h-3 w-3" /> : null}
      {entry.exit_tone === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {entry.exit_tone === "muted" ? <Clock3 className="h-3 w-3" /> : null}
      <span>{entry.exit_label}</span>
    </div>
  );
}

function TerminalStatusPill({ event }: { event: NexusOperationEvent }) {
  return (
    <span className={cn(
      "rounded-md px-1.5 py-0.5 font-semibold",
      event.phase === "running" && "bg-[#182822] text-[#8de0ad]",
      event.phase === "done" && "bg-[#17241e] text-[#8de0ad]",
      event.phase === "error" && "bg-[#2c1519] text-[#ff9d9d]",
      (event.phase === "queued" || event.phase === "waiting" || event.phase === "cancelled") && "bg-white/[0.05] text-[#8aa09b]",
    )}>
      {PHASE_LABEL[event.phase]}
    </span>
  );
}

function build_terminal_entries({
  command,
  event,
  fallback_lines,
  related_events,
}: {
  command: string;
  event: NexusOperationEvent;
  fallback_lines: string[];
  related_events: NexusOperationEvent[];
}): TerminalEntry[] {
  const terminal_events = related_events.length ? related_events : [event];
  const entries = terminal_events.map((item, index) => {
    const resolved_command = read_terminal_command(item, command, fallback_lines) || `command-${index + 1}`;
    const streams = extract_terminal_streams(item.result_preview);
    const fallback_output = fallback_lines
      .filter((line) => !terminal_line_matches_command(line, resolved_command))
      .slice(0, 24);
    const other = streams.other.length || streams.stdout.length || streams.stderr.length
      ? streams.other
      : item.summary
        ? split_terminal_text(item.summary).slice(0, 8)
        : fallback_output;
    const exit_code = read_exit_code(item.result_preview);
    const duration_label = format_terminal_duration(item);
    const exit_tone = terminal_exit_tone(item, exit_code);
    return {
      id: item.id,
      command: resolved_command,
      duration_label,
      exit_label: terminal_exit_label(item, exit_code),
      exit_tone,
      phase: item.phase,
      stdout: streams.stdout,
      stderr: streams.stderr,
      other,
    };
  });

  return entries.length ? entries : [{
    id: event.id,
    command: command.trim() || event.target || event.title,
    duration_label: format_terminal_duration(event),
    exit_label: event.phase === "running" ? "running" : "no output",
    exit_tone: event.phase === "running" ? "running" : "muted",
    phase: event.phase,
    stdout: [],
    stderr: [],
    other: fallback_lines,
  }];
}

function read_terminal_command(event: NexusOperationEvent, fallback_command: string, fallback_lines: string[]): string {
  return extract_terminal_input_string(event.input_preview, ["command", "cmd", "description"])
    ?? event.target
    ?? fallback_command.trim()
    ?? strip_terminal_prompt(fallback_lines[0] ?? "")
    ?? event.title;
}

function extract_terminal_streams(value: unknown): { stdout: string[]; stderr: string[]; other: string[] } {
  if (value == null) {
    return { stdout: [], stderr: [], other: [] };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { stdout: [], stderr: [], other: split_terminal_text(String(value)).slice(0, 24) };
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => extract_terminal_streams(item));
    return {
      stdout: parts.flatMap((item) => item.stdout).slice(0, 24),
      stderr: parts.flatMap((item) => item.stderr).slice(0, 24),
      other: parts.flatMap((item) => item.other).slice(0, 24),
    };
  }
  if (typeof value !== "object") {
    return { stdout: [], stderr: [], other: [String(value)] };
  }

  const record = value as Record<string, unknown>;
  const stdout = extract_terminal_text_fields(record, ["stdout", "out"]);
  const stderr = extract_terminal_text_fields(record, ["stderr", "err", "error"]);
  const other = extract_terminal_text_fields(record, ["output", "text", "content", "result", "message"]);
  if (stdout.length || stderr.length || other.length) {
    return { stdout: stdout.slice(0, 24), stderr: stderr.slice(0, 24), other: other.slice(0, 24) };
  }
  return { stdout: [], stderr: [], other: split_terminal_text(safe_json_stringify(value)).slice(0, 24) };
}

function extract_terminal_text_fields(record: Record<string, unknown>, keys: string[]): string[] {
  return keys.flatMap((key) => extract_terminal_text(record[key]));
}

function extract_terminal_text(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return split_terminal_text(String(value));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extract_terminal_text(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extract_terminal_text(record.text ?? record.content ?? record.value);
  }
  return [String(value)];
}

function read_exit_code(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const raw = record.exit_code ?? record.exitCode ?? record.code ?? record.status;
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
    return Number(raw);
  }
  if (record.is_error === false) {
    return 0;
  }
  return null;
}

function terminal_exit_tone(event: NexusOperationEvent, exit_code: number | null): TerminalEntry["exit_tone"] {
  if (event.phase === "running") {
    return "running";
  }
  if (event.phase === "error" || (exit_code != null && exit_code !== 0)) {
    return "error";
  }
  if (event.phase === "done" || exit_code === 0) {
    return "success";
  }
  return "muted";
}

function terminal_exit_label(event: NexusOperationEvent, exit_code: number | null): string {
  if (event.phase === "running") {
    return "process still running";
  }
  if (event.phase === "error") {
    return exit_code == null ? "process failed" : `exit ${exit_code}`;
  }
  if (event.phase === "cancelled") {
    return "process cancelled";
  }
  if (exit_code != null) {
    return `exit ${exit_code}`;
  }
  return event.phase === "done" ? "exit 0" : PHASE_LABEL[event.phase];
}

function format_terminal_duration(event: NexusOperationEvent): string {
  const started_at = normalize_terminal_timestamp(event.started_at ?? event.updated_at);
  const ended_at = normalize_terminal_timestamp(event.ended_at ?? event.updated_at);
  const ms = Math.max(0, ended_at - started_at);
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function normalize_terminal_timestamp(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

function terminal_line_matches_command(line: string, command: string): boolean {
  return line.replace(/^\s*[$>]\s?/, "").trim() === command.trim();
}

function strip_terminal_prompt(line: string): string {
  return line.replace(/^\s*[$>]\s?/, "").trim();
}

function split_terminal_text(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) {
    return [];
  }
  return normalized.split("\n").map((line) => line.trimEnd());
}

function extract_terminal_input_string(
  input: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!input) {
    return null;
  }
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }
  return null;
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

function DocumentPreview({
  target,
  summary,
  value,
  fallback_lines,
  diff_stats,
}: {
  target?: string | null;
  summary?: string | null;
  value: unknown;
  fallback_lines?: string[];
  diff_stats?: { additions: number; deletions: number } | null;
}) {
  const kind = detect_preview_kind(target);
  const raw_lines = get_preview_lines(value, 18);
  const lines = raw_lines.length ? raw_lines : (fallback_lines ?? []);
  const display_title = basename(target) || summary || "preview";

  if (kind === "markdown") {
    return (
      <div className="soft-scrollbar h-full overflow-auto rounded-[12px] border border-(--divider-subtle-color) bg-white/78 p-4">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) pb-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-[-0.02em] text-(--text-strong)">{display_title}</p>
            <p className="truncate text-[11px] text-(--text-soft)">{summary ?? "Markdown preview"}</p>
          </div>
          {diff_stats ? <DiffStatPill additions={diff_stats.additions} deletions={diff_stats.deletions} /> : null}
        </div>
        <div className="space-y-2.5 text-[12px] leading-5 text-(--text-default)">
          {(lines.length ? lines : ["# Markdown", "等待内容写入..."]).map((line, index) => (
            <MarkdownLine key={`${line}:${index}`} line={line} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "word" || kind === "pdf") {
    return (
      <div className="flex h-full min-h-[260px] items-start justify-center overflow-auto rounded-[12px] bg-[#e9eef3] p-4">
        <article className="min-h-full w-full max-w-[420px] rounded-[3px] bg-white px-8 py-7 shadow-[0_20px_52px_rgba(18,28,42,0.16)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-(--divider-subtle-color) pb-4">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-black tracking-[-0.025em] text-(--text-strong)">{display_title}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--text-soft)">
                {kind === "word" ? "Word document" : "PDF page"}
              </p>
            </div>
            <FileText className="h-4 w-4 shrink-0 text-(--icon-muted)" />
          </div>
          <div className="space-y-3">
            {(lines.length ? lines : [summary ?? "文档预览正在准备", "智能体打开文档后会在这里显示正文结构。"]).slice(0, 8).map((line, index) => (
              <p className={cn(
                "text-[12px] leading-6 text-(--text-default)",
                index === 0 && "text-[16px] font-black tracking-[-0.025em] text-(--text-strong)",
              )} key={`${line}:${index}`}>
                {line}
              </p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  if (kind === "spreadsheet") {
    const sheet_lines = lines.length ? lines : ["name,status,value", "file,updated,1", "tests,passed,3"];
    const rows = sheet_lines.slice(0, 6).map((line) => line.split(/,|\t/).slice(0, 4));
    return (
      <div className="overflow-hidden rounded-[12px] border border-(--divider-subtle-color) bg-white/82">
        <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) px-3 py-2">
          <p className="truncate text-[12px] font-bold text-(--text-strong)">{display_title}</p>
          <FileSpreadsheet className="h-4 w-4 text-(--icon-muted)" />
        </div>
        <div className="grid grid-cols-4 text-[11px] text-(--text-default)">
          {rows.flatMap((row, row_index) => (
            Array.from({ length: 4 }).map((_, column_index) => (
              <div
                className={cn(
                  "min-h-9 truncate border-b border-r border-(--divider-subtle-color) px-2 py-2",
                  row_index === 0 && "bg-[rgba(91,114,255,0.08)] font-bold text-(--text-strong)",
                )}
                key={`${row_index}:${column_index}`}
              >
                {row[column_index] ?? ""}
              </div>
            ))
          ))}
        </div>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="flex h-full min-h-[240px] flex-col rounded-[12px] border border-(--divider-subtle-color) bg-[linear-gradient(135deg,rgba(91,114,255,0.08),rgba(255,255,255,0.82),rgba(79,162,159,0.10))] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[12px] font-bold text-(--text-strong)">{display_title}</p>
          <ImageIcon className="h-4 w-4 text-(--icon-muted)" />
        </div>
        <div className="mt-4 grid min-h-0 flex-1 place-items-center rounded-[12px] border border-white/70 bg-white/48">
          <div className="h-24 w-36 rounded-[12px] border border-white/70 bg-[radial-gradient(circle_at_32%_30%,rgba(91,114,255,0.24),transparent_32%),linear-gradient(135deg,rgba(47,184,132,0.22),rgba(223,157,46,0.18))] shadow-[0_18px_36px_rgba(18,28,42,0.12)]" />
        </div>
      </div>
    );
  }

  if (kind === "folder") {
    return (
      <div className="space-y-2 rounded-[12px] border border-(--divider-subtle-color) bg-white/78 p-3">
        {(lines.length ? lines : [target ?? "workspace", "src/", "docs/", "package.json"]).slice(0, 9).map((line, index) => (
          <FileRow active={index === 0} key={`${line}:${index}`} label={line} />
        ))}
      </div>
    );
  }

  return (
    <EditorSurface
      diff_stats={diff_stats}
      lines={lines.length ? lines : (fallback_lines ?? [summary ?? "暂无预览"])}
      phase_label={summary ?? "Preview"}
      title={display_title}
    />
  );
}

function EditorSurface({
  diff_stats,
  phase_label,
  title,
  lines,
}: {
  diff_stats?: { additions: number; deletions: number } | null;
  phase_label: string;
  title: string;
  lines: string[];
}) {
  const extension = title.includes(".") ? title.slice(title.lastIndexOf(".") + 1).toUpperCase() : "TEXT";
  return (
    <div className="flex h-full min-h-[240px] flex-col overflow-hidden rounded-[12px] border border-[#1d2936] bg-[#101820] text-[#dce8ee]">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-[#151f29] px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f7c948]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#4fd1a5]" />
          <span className="ml-2 truncate text-[11px] font-bold text-[#e7eef5]">{title}</span>
        </div>
        <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-px text-[9px] font-bold text-[#8aa0ad]">
          {extension}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[132px] shrink-0 border-r border-white/10 bg-[#0c141c] p-2 text-[10px] text-[#7f94a3] sm:block">
          <div className="mb-2 truncate rounded-md bg-white/[0.06] px-2 py-1.5 font-bold text-[#dce8ee]">{title}</div>
          <div className="space-y-1">
            <div className="truncate rounded px-2 py-1">Outline</div>
            <div className="truncate rounded px-2 py-1">Problems</div>
            <div className="truncate rounded px-2 py-1">Timeline</div>
          </div>
        </div>
        <div className="soft-scrollbar min-w-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-5">
          <div className="mb-2 flex min-w-0 items-center gap-2 border-b border-white/10 pb-2 text-[10px] text-[rgba(220,232,238,0.52)]">
            <span className="truncate">{phase_label}</span>
            {diff_stats ? (
              <span className="shrink-0 rounded bg-[#10271e] px-1.5 py-px text-[#8de0ad]">
                +{diff_stats.additions} -{diff_stats.deletions}
              </span>
            ) : null}
          </div>
          {lines.map((line, index) => (
            <div className="flex min-w-0 gap-3" key={`${line}:${index}`}>
              <span className="w-8 shrink-0 select-none text-right text-[rgba(220,232,238,0.35)]">{index + 1}</span>
              <span className={cn(
                "min-w-0 whitespace-pre-wrap break-words",
                line.startsWith("+") && "text-[#8de0ad]",
                line.startsWith("-") && "text-[#ff9d9d]",
              )}>
                {line || " "}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/10 bg-[#0c141c] px-3 py-1.5 text-[10px] text-[#7f94a3]">
        <span className="truncate">UTF-8 · Spaces: 2</span>
        <span className="shrink-0">Ln {Math.max(lines.length, 1)}, Col 1</span>
      </div>
    </div>
  );
}

function MarkdownLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (trimmed.startsWith("# ")) {
    return <h3 className="text-[18px] font-black tracking-[-0.035em] text-(--text-strong)">{trimmed.slice(2)}</h3>;
  }
  if (trimmed.startsWith("## ")) {
    return <h4 className="pt-1 text-[14px] font-black tracking-[-0.02em] text-(--text-strong)">{trimmed.slice(3)}</h4>;
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <div className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" />
        <p>{trimmed.slice(2)}</p>
      </div>
    );
  }
  if (trimmed.startsWith("```")) {
    return <div className="h-px bg-(--divider-subtle-color)" />;
  }
  return <p className="whitespace-pre-wrap break-words">{line || " "}</p>;
}

function DiffStatPill({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="shrink-0 rounded-full border border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] px-2 py-1 text-[10px] font-semibold text-[color:var(--success)]">
      +{additions} -{deletions}
    </span>
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
    <div className="grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-[minmax(190px,0.44fr)_minmax(0,1fr)] gap-3 max-md:grid-cols-1">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[13px] border border-(--divider-subtle-color) bg-white/74">
        <div className="border-b border-(--divider-subtle-color) px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">Subtask control</p>
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[13px] font-black tracking-[-0.025em] text-(--text-strong)">
              {event.target ?? event.tool_name ?? "Task"}
            </span>
            <span className="shrink-0 rounded-full bg-[rgba(91,114,255,0.10)] px-2 py-1 text-[10px] font-bold text-[color:var(--primary)]">
              {finished_count}/{Math.max(task_events.length, 1)}
            </span>
          </div>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-2">
          {steps.map((step, index) => {
            const Icon = icon_for_task_phase(step.event.phase);
            const active = index === active_index;
            return (
              <div
                className={cn(
                  "mb-1.5 flex min-w-0 gap-2 rounded-[11px] border px-2.5 py-2 text-[11px]",
                  active
                    ? "border-[rgba(91,114,255,0.26)] bg-[rgba(91,114,255,0.10)] text-(--text-strong)"
                    : "border-transparent bg-white/42 text-(--text-muted)",
                )}
                key={step.event.id}
              >
                <span className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
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
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5 border-t border-(--divider-subtle-color) bg-white/52 p-2 text-[10px] text-(--text-muted)">
          <span className="rounded-[8px] bg-white/68 px-2 py-1.5">running {running_count}</span>
          <span className="rounded-[8px] bg-white/68 px-2 py-1.5">round {event.round_id}</span>
        </div>
      </section>
      <section className="min-h-0 min-w-0">
        <DocumentPreview
          summary={event.summary ?? event.title}
          target="task-output.md"
          value={preview_value}
        />
      </section>
    </div>
  );
}

function RunManifestSurface({
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
              return (
                <button
                  aria-label={`查看执行步骤 ${index + 1}：${item.tool_name ?? item.title}`}
                  className={cn(
                    "grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 rounded-[12px] border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.36)]",
                    can_focus_event && "cursor-pointer hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.06)]",
                    item.id === event.id
                      ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.08)]"
                      : "border-white/50 bg-white/36",
                  )}
                  key={item.id}
                  onClick={() => on_focus_event?.(item)}
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
                      {String(index + 1).padStart(2, "0")} · {item.tool_name ?? item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-(--text-soft)">
                      {item.target ?? item.summary ?? profile.title}
                    </span>
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

function collect_manifest_artifacts(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
  evidence: OperationEvidence[],
): Array<{
  id: string;
  label: string;
  value: string;
  type: OperationEvidence["type"];
}> {
  const artifacts = new Map<string, {
    id: string;
    label: string;
    value: string;
    type: OperationEvidence["type"];
  }>();
  const add_artifact = (artifact: {
    id: string;
    label: string;
    value: string;
    type: OperationEvidence["type"];
  }) => {
    const key = normalize_manifest_artifact_key(artifact.value);
    if (artifacts.has(key)) {
      return;
    }
    artifacts.set(key, artifact);
  };

  for (const item of events) {
    if (
      !item.target ||
      item.kind === "round_summary" ||
      item.surface === "terminal" ||
      item.surface === "conversation"
    ) {
      continue;
    }
    if ((item.surface === "workspace" || item.surface === "editor") && !looks_like_file_artifact(item.target)) {
      continue;
    }
    add_artifact({
      id: `event:${item.target}`,
      label: item.surface === "web" ? "浏览器现场" : item.surface === "task" ? "任务记录" : "工作区文件",
      value: item.target,
      type: item.surface === "web" ? "url" : item.surface === "task" ? "task" : "file",
    });
  }

  for (const item of collect_manifest_workspace_artifacts(event, events, snapshot)) {
    add_artifact({
      id: `workspace:${item.path}`,
      label: item.status === "deleted" ? "删除记录" : "文件快照",
      value: item.path,
      type: "file",
    });
  }

  for (const item of evidence) {
    if (!item.value || (item.type !== "file" && item.type !== "diff" && item.type !== "url" && item.type !== "artifact")) {
      continue;
    }
    if ((item.type === "file" || item.type === "diff" || item.type === "artifact") && !looks_like_file_artifact(item.value)) {
      continue;
    }
    add_artifact({
      id: `evidence:${item.type}:${item.value}`,
      label: item.label || evidence_type_label(item.type),
      value: item.value,
      type: item.type,
    });
  }

  if (event.target && artifacts.size === 0) {
    add_artifact({
      id: `event:${event.target}`,
      label: "执行目标",
      value: event.target,
      type: "status",
    });
  }

  return [...artifacts.values()].slice(0, 8);
}

function collect_manifest_workspace_artifacts(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): NexusOperationSnapshot["workspace_events"] {
  const workspace_items = snapshot?.workspace_events ?? [];
  if (!workspace_items.length) {
    return [];
  }

  const round_events = events.length
    ? events
    : snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const round_tool_use_ids = new Set(
    round_events
      .map((item) => item.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );
  const round_targets = new Set(
    round_events
      .map((item) => item.target)
      .filter((target): target is string => Boolean(target)),
  );

  return workspace_items.filter((item) => (
    Boolean(item.tool_use_id && round_tool_use_ids.has(item.tool_use_id)) ||
    round_targets.has(item.path)
  ));
}

function normalize_manifest_artifact_key(value: string): string {
  return value.trim().replace(/\\+/g, "/").toLowerCase();
}

function looks_like_file_artifact(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || normalized === "/" || normalized.endsWith("/")) {
    return false;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return true;
  }
  const basename = normalized.split(/[\\/]/).filter(Boolean).at(-1) ?? normalized;
  return /\.[a-z0-9]{1,12}$/i.test(basename);
}

function format_manifest_duration(events: NexusOperationEvent[]): string {
  const started = events
    .map((item) => item.started_at ?? item.updated_at)
    .filter((value): value is number => Number.isFinite(value));
  const ended = events
    .map((item) => item.ended_at ?? item.updated_at)
    .filter((value): value is number => Number.isFinite(value));
  if (!started.length || !ended.length) {
    return "--";
  }
  const duration_seconds = Math.max(0, Math.round((Math.max(...ended) - Math.min(...started)) / 1000));
  if (duration_seconds < 60) {
    return `${duration_seconds}s`;
  }
  const minutes = Math.floor(duration_seconds / 60);
  const seconds = duration_seconds % 60;
  return `${minutes}m ${seconds}s`;
}

function extract_manifest_result_text(event: NexusOperationEvent): string | null {
  if (typeof event.result_preview === "string" && event.result_preview.trim()) {
    return event.result_preview.trim();
  }
  if (event.result_preview && typeof event.result_preview === "object") {
    const record = event.result_preview as Record<string, unknown>;
    for (const key of ["result", "content", "message", "error"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

function icon_for_manifest_artifact(type: OperationEvidence["type"], value: string): LucideIcon {
  if (type === "terminal") {
    return Terminal;
  }
  if (type === "url") {
    return Globe2;
  }
  if (type === "task") {
    return ClipboardList;
  }
  if (type === "error") {
    return AlertTriangle;
  }
  if (type === "file" || type === "diff" || type === "artifact") {
    return icon_for_file_path(value);
  }
  return FileText;
}

function evidence_type_label(type: OperationEvidence["type"]): string {
  if (type === "file" || type === "diff") {
    return "文件证据";
  }
  if (type === "terminal") {
    return "终端输出";
  }
  if (type === "url") {
    return "浏览器记录";
  }
  if (type === "artifact") {
    return "产物";
  }
  if (type === "task") {
    return "任务记录";
  }
  if (type === "permission") {
    return "权限记录";
  }
  if (type === "error") {
    return "错误证据";
  }
  return "执行证据";
}

function icon_for_file_path(value: string): LucideIcon {
  if (/\.(csv|xlsx?|ods)$/i.test(value)) {
    return FileSpreadsheet;
  }
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(value)) {
    return ImageIcon;
  }
  if (/\.(md|mdx|txt|docx?|pdf)$/i.test(value)) {
    return FileText;
  }
  return FileText;
}

function RuntimeHandoffSurface({
  event,
  related_events,
  summary,
}: {
  event: NexusOperationEvent;
  related_events: NexusOperationEvent[];
  summary?: string | null;
}) {
  const now = useRuntimeClock(event.phase === "running");
  const handoff_started_at = event.started_at ?? event.updated_at;
  const elapsed_ms = Math.max(0, now - handoff_started_at);
  const is_stalled = event.phase === "running" && elapsed_ms >= RUNTIME_HANDOFF_STALLED_MS && related_events.length <= 1;
  const is_retrying = is_runtime_retry_event(event);
  const prompt = read_prompt_from_preview(event.input_preview) ?? summary ?? event.target ?? "等待运行时接入";
  const markers = [
    {
      label: "请求已接收",
      detail: format_operation_time(handoff_started_at),
      active: true,
    },
    {
      label: "上下文装载",
      detail: "会话、工作区、权限配置",
      active: true,
    },
    {
      label: is_retrying ? "API 重试中" : is_stalled ? "接入等待过久" : "等待首个工具",
      detail: related_events.length > 1 ? `${related_events.length} events` : format_handoff_elapsed(elapsed_ms),
      active: is_retrying || is_stalled,
      warning: is_retrying || is_stalled,
    },
  ];

  return (
    <div className="grid h-full min-h-[320px] min-w-0 grid-cols-[minmax(210px,0.42fr)_minmax(0,1fr)] gap-3 max-md:grid-cols-1">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-[rgba(91,114,255,0.18)] bg-[rgba(255,255,255,0.66)] shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]">
        <div className="border-b border-white/52 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
              is_stalled || is_retrying
                ? "border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                : "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
            )}>
              {is_stalled || is_retrying ? <AlertTriangle className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-(--text-strong)">
                {is_retrying ? "API 正在重试" : is_stalled ? "接入等待中" : "运行接入"}
              </p>
              <p className="truncate text-[10.5px] text-(--text-soft)">
                {format_handoff_elapsed(elapsed_ms)} · runtime handoff
              </p>
            </div>
          </div>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">
            {markers.map((marker, index) => (
              <div
                className={cn(
                  "rounded-[11px] border px-2.5 py-2",
                  marker.warning
                    ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)]"
                    : marker.active
                    ? "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.08)]"
                    : "border-white/52 bg-white/42",
                )}
                key={marker.label}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-black",
                    marker.warning
                      ? "bg-[color:var(--warning)] text-white"
                      : marker.active
                        ? "bg-[color:var(--primary)] text-white"
                        : "bg-white/70 text-(--text-soft)",
                  )}>
                    {index + 1}
                  </span>
                  <span className="truncate text-[11px] font-black text-(--text-strong)">
                    {marker.label}
                  </span>
                </div>
                <p className="mt-1 truncate pl-7 text-[10px] text-(--text-soft)">
                  {marker.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/52 bg-white/38 px-3 py-2 text-[10px] font-semibold text-(--text-soft)">
          round {event.round_id}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#1d2936] bg-[#101820] text-[#dce8ee] shadow-[0_18px_48px_rgba(18,28,42,0.18)]">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-[#151f29] px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f7c948]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4fd1a5]" />
            <span className="ml-2 truncate text-[11px] font-bold text-[#e7eef5]">agent-runtime</span>
          </div>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-px text-[9px] font-bold text-[#8aa0ad]">
            {is_retrying ? "RETRYING" : is_stalled ? "WAITING" : "CONNECTING"}
          </span>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-5">
          <RuntimeLine tone="muted" value={`session ${event.session_key}`} />
          <RuntimeLine tone="muted" value={`agent ${event.agent_id}`} />
          <RuntimeLine tone="ok" value="context loaded" />
          <RuntimeLine tone="ok" value="workspace mounted" />
          <RuntimeLine
            tone={is_stalled || is_retrying ? "warn" : "active"}
            value={is_retrying
              ? "model API request is retrying before the first tool event..."
              : is_stalled
                ? `still waiting for first tool_use or terminal event after ${format_handoff_elapsed(elapsed_ms)}`
                : "waiting for first tool_use event..."}
          />
          {is_stalled || is_retrying ? (
            <RuntimeLine
              tone="muted"
              value={is_retrying
                ? "the stage is preserving the handoff while the runtime retries the upstream model request"
                : "the stage is keeping the handoff open until runtime emits a tool, completion, or error"}
            />
          ) : null}
          <div className="mt-4 rounded-[10px] border border-white/10 bg-white/[0.04] p-3 font-sans">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8aa0ad]">intent</p>
            <p className="line-clamp-5 text-[12px] leading-5 text-[#dce8ee]">{prompt}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function RuntimeLine({ tone, value }: { tone: "active" | "muted" | "ok" | "warn"; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className={cn(
        "shrink-0",
        tone === "active" && "text-[#8ca0ff]",
        tone === "muted" && "text-[#6f8491]",
        tone === "ok" && "text-[#8de0ad]",
        tone === "warn" && "text-[#ffd166]",
      )}>
        {tone === "active" ? ">" : tone === "ok" ? "✓" : tone === "warn" ? "!" : "·"}
      </span>
      <span className={cn(
        "min-w-0 break-all",
        tone === "active" && "text-[#dce8ee]",
        tone === "muted" && "text-[#8aa0ad]",
        tone === "ok" && "text-[#a8d8bd]",
        tone === "warn" && "text-[#ffd166]",
      )}>
        {value}
      </span>
    </div>
  );
}

function is_runtime_retry_event(event: NexusOperationEvent): boolean {
  return event.surface === "conversation"
    && (event.evidence ?? []).some((item) => item.label === "api_retry");
}

function useRuntimeClock(enabled: boolean): number {
  const [now, set_now] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => set_now(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return now;
}

function format_handoff_elapsed(elapsed_ms: number): string {
  const seconds = Math.max(0, Math.round(elapsed_ms / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest_seconds = seconds % 60;
  return `${minutes}m ${String(rest_seconds).padStart(2, "0")}s`;
}

function read_prompt_from_preview(preview: Record<string, unknown> | null | undefined): string | null {
  const value = preview?.prompt;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function PermissionCheckpointPanel({
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
    <div className="flex h-full min-h-[320px] min-w-0 max-w-full flex-col overflow-hidden rounded-[15px] border border-[rgba(223,157,46,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(255,248,236,0.78))] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
      <div className="border-b border-[rgba(223,157,46,0.18)] px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.13)] text-[color:var(--warning)]">
              <CircleHelp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">
                execution checkpoint
              </p>
              <h3 className="mt-1 truncate text-[15px] font-black tracking-[-0.03em] text-(--text-strong)">
                等待用户确认
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-(--text-muted)">
                {lead}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(223,157,46,0.22)] bg-[rgba(223,157,46,0.12)] px-2.5 py-1 text-[10px] font-black text-[color:var(--warning)]">
            {PHASE_LABELS[event.phase]}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(220px,0.9fr)] max-md:grid-cols-1">
        <section className="soft-scrollbar min-h-0 min-w-0 overflow-auto p-4">
          <div className="rounded-[13px] border border-[rgba(18,28,42,0.10)] bg-[#20252c] p-3 text-[#e8edf2] shadow-[0_18px_46px_rgba(18,28,42,0.16)]">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="truncate font-mono text-[10px] text-[#9ba7b4]">
                {profile.action_label} · {profile.title}
              </span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9ba7b4]">request</p>
            <pre className="mt-2 max-h-[112px] overflow-hidden whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-[#f6f8fb]">
              {request_target}
            </pre>
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

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-[10px] max-sm:grid-cols-1">
            <div className="rounded-[11px] border border-[rgba(223,157,46,0.18)] bg-white/62 px-2.5 py-2">
              <p className="font-black text-(--text-strong)">当前暂停</p>
              <p className="mt-1 text-(--text-muted)">工具调用已保留现场</p>
            </div>
            <div className="flex items-center justify-center text-(--text-soft) max-sm:hidden">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="rounded-[11px] border border-[rgba(47,184,132,0.18)] bg-white/62 px-2.5 py-2">
              <p className="font-black text-(--text-strong)">确认后继续</p>
              <p className="mt-1 text-(--text-muted)">返回现场并接续执行</p>
            </div>
          </div>
        </section>

        <aside className="soft-scrollbar min-h-0 overflow-auto border-l border-[rgba(223,157,46,0.16)] bg-white/45 p-4 max-md:max-h-[300px] max-md:border-l-0 max-md:border-t">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">request payload</p>
          <div className="mt-2 space-y-1.5">
            {rows.length ? rows.map((row) => (
              <div className="rounded-[10px] border border-white/62 bg-white/70 px-2.5 py-2 text-[10px]" key={row.key}>
                <p className="font-black text-(--text-strong)">{row.label}</p>
                <p className="mt-0.5 break-words font-mono leading-4 text-(--text-muted)">{row.value}</p>
              </div>
            )) : (
              <div className="rounded-[10px] border border-white/62 bg-white/70 px-2.5 py-2 text-[10px] text-(--text-muted)">
                {event.target ?? event.tool_name ?? "No request payload"}
              </div>
            )}
          </div>

          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">evidence</p>
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
        </aside>
      </div>
    </div>
  );
}

function OperationReviewPanel({
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
                {event.target ?? event.tool_name ?? "No request payload"}
              </div>
            )}
          </div>
          {waiting ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-black">
              <span className="rounded-[9px] border border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.10)] px-2 py-1.5 text-center text-[color:var(--success)]">
                Allow
              </span>
              <span className="rounded-[9px] border border-[rgba(223,93,98,0.18)] bg-[rgba(223,93,98,0.08)] px-2 py-1.5 text-center text-[color:var(--destructive)]">
                Deny
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

function FileRow({
  label,
  meta,
  active = false,
}: {
  label: string;
  meta?: string;
  active?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[11px]",
      active
        ? "border-[rgba(79,162,159,0.32)] bg-[rgba(79,162,159,0.14)] text-(--text-strong)"
        : "border-(--divider-subtle-color) bg-white/62 text-(--text-muted)",
    )}>
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta ? <span className="shrink-0 font-mono text-[10px] text-(--text-soft)">{meta}</span> : null}
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

function looks_like_html(value: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]|<script[\s>]/i.test(value);
}

function looks_like_url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function build_workspace_raw_url(agent_id: string, target?: string | null): string | null {
  const path = normalize_workspace_relative_path(target);
  if (!path || !/\.(html?|xhtml)$/i.test(path)) {
    return null;
  }
  return get_workspace_file_raw_url(agent_id, path);
}

function normalize_workspace_relative_path(target?: string | null): string | null {
  const path = target?.trim();
  if (!path || looks_like_url(path) || path.startsWith("/") || path.includes("..")) {
    return null;
  }
  const normalized = path.replace(/^\.\/+/, "");
  if (
    !normalized ||
    normalized.startsWith(".agents/") ||
    normalized.startsWith(".claude/") ||
    normalized.startsWith(".git/")
  ) {
    return null;
  }
  return normalized;
}
