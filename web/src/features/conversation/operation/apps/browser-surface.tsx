import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Loader2,
  PanelLeft,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { HtmlFilePreview, HtmlPreviewViewport } from "@/features/conversation/shared/editor/html-file-preview";
import { get_workspace_file_raw_url } from "@/lib/api/agent-manage-api";
import { cn } from "@/lib/utils";

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
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-[#f7f9fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <BrowserChromeHeader
        display_url={display_url}
        event={event}
        source_label={source_label}
        status={status}
        target={target}
      />

      <BrowserViewport
        iframe_url={iframe_url}
        query={query}
        srcdoc={srcdoc}
        target={target}
        event={event}
        lines={lines}
      />
    </div>
  );
}

function BrowserChromeHeader({
  display_url,
  event,
  source_label,
  status,
  target,
}: {
  display_url: string;
  event: NexusOperationEvent;
  source_label: string;
  status: { label: string; tone: "loading" | "ready" | "error" | "idle" };
  target?: string | null;
}) {
  return (
    <div className="border-b border-(--divider-subtle-color) bg-[rgba(248,250,253,0.88)]">
      <div className="flex min-w-0 items-end gap-1.5 px-3 pt-2">
        <div className="flex min-w-0 max-w-[52%] items-center gap-1.5 rounded-t-[10px] border border-b-0 border-(--divider-subtle-color) bg-white/72 px-3 py-1.5 text-[10px] font-bold text-(--text-strong)">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
          <span className="truncate">{target ?? event.target ?? event.tool_name ?? "preview"}</span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <div className="flex shrink-0 items-center gap-1 text-(--icon-muted)">
          <SafariToolbarButton label="显示边栏">
            <PanelLeft className="h-3.5 w-3.5" />
          </SafariToolbarButton>
          <SafariToolbarButton label="后退">
            <ArrowLeft className="h-3.5 w-3.5" />
          </SafariToolbarButton>
          <SafariToolbarButton label="前进">
            <ArrowRight className="h-3.5 w-3.5" />
          </SafariToolbarButton>
          <SafariToolbarButton label={event.phase === "running" ? "正在加载" : "重新载入"}>
            {event.phase === "running"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
          </SafariToolbarButton>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-(--divider-subtle-color) bg-white/88 px-2.5 py-1.5 text-[11px] text-(--text-default) shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[color:var(--success)]" />
          <span className="min-w-0 flex-1 truncate font-medium">{display_url}</span>
        </div>
        <SafariPageStatus source_label={source_label} status={status} />
        <SafariToolbarButton label="共享">
          <Share2 className="h-3.5 w-3.5" />
        </SafariToolbarButton>
        <SafariToolbarButton label="新建标签页">
          <Plus className="h-3.5 w-3.5" />
        </SafariToolbarButton>
        <SafariToolbarButton label="在浏览器中打开">
          <ExternalLink className="h-3.5 w-3.5" />
        </SafariToolbarButton>
      </div>
    </div>
  );
}

function SafariToolbarButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-md border border-(--divider-subtle-color) bg-white/64 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]"
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function SafariPageStatus({
  source_label,
  status,
}: {
  source_label: string;
  status: { label: string; tone: "loading" | "ready" | "error" | "idle" };
}) {
  return (
    <span className={cn(
      "hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold sm:inline-flex",
      status.tone === "loading" && "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
      status.tone === "ready" && "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
      status.tone === "error" && "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
      status.tone === "idle" && "bg-[rgba(117,131,149,0.10)] text-(--text-soft)",
    )}>
      {status.tone === "loading" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
      {status.tone === "ready" ? <CheckCircle2 className="h-2.5 w-2.5" /> : null}
      {status.tone === "error" ? <AlertTriangle className="h-2.5 w-2.5" /> : null}
      {status.tone === "idle" ? <Clock3 className="h-2.5 w-2.5" /> : null}
      <span>{status.label}</span>
      <span className="uppercase text-current/62">{source_label}</span>
    </span>
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
    return (
      <HtmlFilePreview
        content={srcdoc}
        is_streaming={event.phase === "running"}
        title={target ?? query}
      />
    );
  }

  if (iframe_url) {
    return (
      <HtmlPreviewViewport
        class_name="flex-1 bg-white"
        source_url={iframe_url}
        title={target ?? query}
      />
    );
  }

  return <BrowserPreviewFallback event={event} lines={lines} query={query} />;
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
