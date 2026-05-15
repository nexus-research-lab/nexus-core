import {
  FileSpreadsheet,
  FileText,
  Globe2,
  ImageIcon,
} from "lucide-react";

import { get_workspace_file_raw_url } from "@/lib/api/agent-manage-api";
import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationPhase,
} from "../operation-types";
import {
  basename,
  build_editor_preview_lines,
  detect_preview_kind,
  format_operation_time,
  get_preview_lines,
} from "../operation-preview";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export function StageWindowContent({ window }: { window: StageWindowState }) {
  const { event, snapshot } = window.payload;

  if (window.kind === "finder") {
    const workspace_items = window.payload.workspace_items ?? [];
    return (
      <div className="space-y-2.5">
        <FileRow active label={window.payload.target ?? event.target ?? event.tool_name ?? "target"} />
        {workspace_items.map((item) => (
          <FileRow
            active={item.path === event.target}
            key={item.id}
            label={item.path}
            meta={item.status}
          />
        ))}
        {!workspace_items.length ? (
          <FileRow label="No workspace activity yet" meta="idle" />
        ) : null}
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
      <>
        <div className="mb-3 flex justify-end text-[10px] text-[#6fae83]">{format_operation_time(event.updated_at)}</div>
        <pre className="soft-scrollbar max-h-[calc(100%-24px)] overflow-auto font-mono text-[11px] leading-5 text-[#d9ffe5]">
          {lines.join("\n")}
        </pre>
        <span className="operation-terminal-caret" />
      </>
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
    const iframe_url = raw_url ?? url;
    return (
      <div className="flex h-full min-h-[280px] flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-(--divider-subtle-color) bg-white/70 px-3 py-2 text-[11px] text-(--text-default)">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
          <span className="truncate font-medium">{query}</span>
        </div>

        {srcdoc || iframe_url ? (
          <div className="min-h-0 flex-1 overflow-hidden rounded-[14px] border border-(--divider-subtle-color) bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            <iframe
              className="h-full w-full bg-white"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"
              src={iframe_url ?? undefined}
              srcDoc={iframe_url ? undefined : srcdoc ?? undefined}
              title={window.payload.target ?? query}
            />
          </div>
        ) : (
          <>
            <div className="operation-web-loading h-24 shrink-0 rounded-[14px] border border-[rgba(223,157,46,0.24)] bg-[linear-gradient(135deg,rgba(223,157,46,0.16),rgba(255,255,255,0.72),rgba(91,114,255,0.08))]" />
            {lines.slice(0, 4).map((line, index) => (
              <div className="rounded-[12px] border border-(--divider-subtle-color) bg-white/70 p-3" key={`${line}:${index}`}>
                <p className="line-clamp-2 text-[12px] leading-5 text-(--text-default)">{line}</p>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  if (window.kind === "task_board") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TaskCard label="task" value={event.target ?? event.tool_name ?? "subtask"} />
          <TaskCard label="phase" value={PHASE_LABEL[event.phase]} />
          <TaskCard label="round" value={event.round_id} />
        </div>
        <DocumentPreview
          summary={event.summary ?? event.title}
          target="task-output.md"
          value={(window.payload.lines ?? []).join("\n") || event.result_preview || event.input_preview}
        />
      </div>
    );
  }

  if (window.kind === "evidence" || window.kind === "permission_wait") {
    return <EvidenceStrip compact={window.phase === "minimized"} event={event} snapshot={snapshot} />;
  }

  if (window.kind === "summary") {
    return (
      <DocumentPreview
        summary={event.summary ?? event.target ?? "暂无摘要"}
        target="run-summary.md"
        value={window.payload.preview ?? event.result_preview ?? event.summary ?? event.target}
      />
    );
  }

  return (
    <DocumentPreview
      diff_stats={window.payload.diff_stats}
      fallback_lines={build_editor_preview_lines(event, get_preview_lines(window.payload.preview, 12))}
      summary={window.payload.summary ?? event.summary ?? event.title}
      target={window.payload.target ?? window.target ?? event.target}
      value={window.payload.preview ?? event.result_preview ?? event.input_preview ?? event.summary}
    />
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
    <CodeSurface
      lines={lines.length ? lines : (fallback_lines ?? [summary ?? "暂无预览"])}
      title={display_title}
    />
  );
}

function CodeSurface({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="soft-scrollbar h-full overflow-auto rounded-[12px] bg-[#101820] p-3 font-mono text-[11px] leading-5 text-[#dce8ee]">
      <div className="mb-2 truncate border-b border-white/10 pb-2 text-[10px] text-[rgba(220,232,238,0.52)]">{title}</div>
      {lines.map((line, index) => (
        <div className="flex gap-3" key={`${line}:${index}`}>
          <span className="w-7 shrink-0 select-none text-right text-[rgba(220,232,238,0.35)]">{index + 1}</span>
          <span className="whitespace-pre-wrap break-words">{line || " "}</span>
        </div>
      ))}
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

function EvidenceStrip({
  event,
  snapshot,
  compact = false,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
  compact?: boolean;
}) {
  const evidence = [
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ].slice(0, compact ? 3 : 5);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--text-soft)">Evidence</p>
      {evidence.length ? evidence.map((item, index) => (
        <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-(--divider-subtle-color) bg-white/68 px-2.5 py-2 text-[11px]" key={`${item.type}:${item.label}:${index}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" />
          <span className="shrink-0 font-semibold text-(--text-strong)">{item.label}</span>
          <span className="min-w-0 flex-1 truncate text-(--text-muted)">{item.value ?? item.type}</span>
        </div>
      )) : (
        <div className="rounded-[10px] border border-(--divider-subtle-color) bg-white/62 px-2.5 py-2 text-[11px] text-(--text-muted)">
          {event.summary ?? event.title}
        </div>
      )}
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

function TaskCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-(--divider-subtle-color) bg-white/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-soft)">{label}</p>
      <p className="mt-2 truncate text-[13px] font-bold text-(--text-strong)">{value}</p>
    </div>
  );
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
