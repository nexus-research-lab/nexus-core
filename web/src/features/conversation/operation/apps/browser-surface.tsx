import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { HtmlFilePreview } from "@/features/conversation/shared/editor/html-file-preview";
import { get_workspace_file_raw_url } from "@/lib/api/agent-manage-api";
import { cn } from "@/lib/utils";

import { format_operation_time } from "../operation-preview";
import type {
  NexusOperationEvent,
  OperationPhase,
} from "../operation-types";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export function BrowserSurface({
  event,
  lines,
  preview,
  query,
  target,
}: {
  event: NexusOperationEvent;
  lines: string[];
  preview: unknown;
  query: string;
  target?: string | null;
}) {
  const srcdoc = typeof preview === "string" && looks_like_html(preview) ? preview : null;
  const raw_url = build_workspace_raw_url(event.agent_id, target ?? event.target);
  const url = looks_like_url(query) ? query : null;
  const iframe_url = srcdoc ? null : raw_url ?? url;
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

      {srcdoc ? (
        <HtmlFilePreview content={srcdoc} title={target ?? query} />
      ) : iframe_url ? (
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            className="h-full w-full bg-white"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"
            src={iframe_url}
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
