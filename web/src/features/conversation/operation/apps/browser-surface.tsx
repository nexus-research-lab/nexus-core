import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Loader2,
  MonitorUp,
  PanelBottom,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

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
  const inspector_lines = build_browser_inspector_lines({
    event,
    has_live_view,
    lines,
    source_label,
    target,
  });

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-[14px] border border-(--divider-subtle-color) bg-[#f7f9fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <BrowserChromeHeader
        display_url={display_url}
        event={event}
        source_label={source_label}
        target={target}
      />
      <BrowserStatusStrip
        event={event}
        has_live_view={has_live_view}
        source_label={source_label}
        status={status}
      />

      <BrowserViewport
        iframe_url={iframe_url}
        query={query}
        srcdoc={srcdoc}
        target={target}
        event={event}
        lines={lines}
      />
      <BrowserInspector
        lines={inspector_lines}
        source_label={source_label}
        updated_at={event.updated_at}
      />
    </div>
  );
}

function BrowserChromeHeader({
  display_url,
  event,
  source_label,
  target,
}: {
  display_url: string;
  event: NexusOperationEvent;
  source_label: string;
  target?: string | null;
}) {
  return (
    <div className="border-b border-(--divider-subtle-color) bg-white/82">
      <div className="flex min-w-0 items-end gap-1.5 px-3 pt-2">
        <div className="flex min-w-0 max-w-[52%] items-center gap-1.5 rounded-t-[10px] border border-b-0 border-(--divider-subtle-color) bg-[#f7f9fc] px-3 py-1.5 text-[10px] font-bold text-(--text-strong)">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
          <span className="truncate">{target ?? event.target ?? event.tool_name ?? "preview"}</span>
        </div>
        <div className="hidden rounded-t-[10px] border border-b-0 border-transparent px-3 py-1.5 text-[10px] font-semibold text-(--text-soft) sm:block">
          Console
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <div className="flex shrink-0 items-center gap-1 text-(--icon-muted)">
          <ChromeButton><ArrowLeft className="h-3.5 w-3.5" /></ChromeButton>
          <ChromeButton><ArrowRight className="h-3.5 w-3.5" /></ChromeButton>
          <ChromeButton>
            {event.phase === "running"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
          </ChromeButton>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-(--divider-subtle-color) bg-white px-2.5 py-1.5 text-[11px] text-(--text-default)">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
          <span className="min-w-0 flex-1 truncate font-medium">{display_url}</span>
          <span className="shrink-0 rounded bg-[rgba(117,131,149,0.10)] px-1.5 py-px text-[9px] font-bold uppercase text-(--text-soft)">
            {source_label}
          </span>
        </div>
        <ChromeButton><ExternalLink className="h-3.5 w-3.5" /></ChromeButton>
      </div>
    </div>
  );
}

function ChromeButton({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md border border-(--divider-subtle-color) bg-white/64">
      {children}
    </span>
  );
}

function BrowserStatusStrip({
  event,
  has_live_view,
  source_label,
  status,
}: {
  event: NexusOperationEvent;
  has_live_view: boolean;
  source_label: string;
  status: { label: string; tone: "loading" | "ready" | "error" | "idle" };
}) {
  return (
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
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden truncate sm:inline">
          {has_live_view ? "Live preview" : "Preview summary"} · {source_label}
        </span>
        <span className="truncate">{format_operation_time(event.updated_at)}</span>
      </div>
    </div>
  );
}

function BrowserViewport({
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
  if (srcdoc) {
    return <HtmlFilePreview content={srcdoc} title={target ?? query} />;
  }

  if (iframe_url) {
    return (
      <div className="min-h-0 flex-1 bg-white">
        <iframe
          className="h-full w-full bg-white"
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"
          src={iframe_url}
          title={target ?? query}
        />
      </div>
    );
  }

  return <BrowserPreviewFallback event={event} lines={lines} query={query} />;
}

function BrowserInspector({
  lines,
  source_label,
  updated_at,
}: {
  lines: string[];
  source_label: string;
  updated_at: number;
}) {
  return (
    <div className="hidden shrink-0 border-t border-(--divider-subtle-color) bg-[#101820] text-[#dce8ee] md:block">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-1.5 text-[10px] font-bold text-[#91a5b1]">
        <span className="inline-flex items-center gap-1.5">
          <PanelBottom className="h-3.5 w-3.5" />
          Console
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MonitorUp className="h-3.5 w-3.5" />
          1920 x 1080 · {source_label} · {format_operation_time(updated_at)}
        </span>
      </div>
      <div className="grid max-h-[74px] grid-cols-[auto_minmax(0,1fr)] gap-x-3 overflow-hidden px-3 py-2 font-mono text-[10px] leading-5">
        {lines.slice(0, 3).map((line, index) => (
          <div className="contents" key={`${line}:${index}`}>
            <span className="select-none text-[#5e7788]">{index + 1}</span>
            <span className="truncate text-[#b9c9d4]">{line}</span>
          </div>
        ))}
      </div>
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

function build_browser_inspector_lines({
  event,
  has_live_view,
  lines,
  source_label,
  target,
}: {
  event: NexusOperationEvent;
  has_live_view: boolean;
  lines: string[];
  source_label: string;
  target?: string | null;
}): string[] {
  const result_line = lines.find((line) => line.trim()) ?? event.summary ?? target ?? event.target ?? "preview";
  return [
    `[network] ${has_live_view ? "200" : "..."} ${target ?? event.target ?? event.tool_name ?? "preview"} (${source_label})`,
    `[stage] ${PHASE_LABEL[event.phase]} · ${event.title}`,
    `[console] ${result_line}`,
  ];
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
