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
  Search,
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
import { build_browser_result_items } from "./browser-result-items";
import { build_browser_session_view } from "./browser-session";

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
  const session = build_browser_session_view({
    event,
    preview,
    query,
    raw_url_builder: get_workspace_file_raw_url,
    target,
  });

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-[#f7f9fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <BrowserChromeHeader
        display_url={session.display_url}
        event={event}
        source_label={session.source_label}
        status={session.status}
        tab_title={session.tab_title}
      />

      <BrowserViewport
        iframe_url={session.iframe_url}
        query={query}
        srcdoc={session.srcdoc}
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
  tab_title,
}: {
  display_url: string;
  event: NexusOperationEvent;
  source_label: string;
  status: { label: string; tone: "loading" | "ready" | "error" | "idle" };
  tab_title: string;
}) {
  return (
    <div className="border-b border-(--divider-subtle-color) bg-[rgba(248,250,253,0.88)]">
      <div className="flex min-w-0 items-end gap-1.5 px-3 pt-2">
        <div className="flex min-w-0 max-w-[52%] items-center gap-1.5 rounded-t-[10px] border border-b-0 border-(--divider-subtle-color) bg-white/72 px-3 py-1.5 text-[10px] font-bold text-(--text-strong)">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
          <span className="truncate">{tab_title}</span>
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
      <span className="text-current/62">{source_label}</span>
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

  return <BrowserSearchResults event={event} lines={lines} query={query} />;
}


function BrowserSearchResults({
  event,
  lines,
  query,
}: {
  event: NexusOperationEvent;
  lines: string[];
  query: string;
}) {
  const result_items = build_browser_result_items({ event, lines, query });

  return (
    <div className="soft-scrollbar min-h-0 flex-1 overflow-auto bg-[#fbfcfe]">
      <div className="grid min-h-full grid-cols-[180px_minmax(0,1fr)] max-md:grid-cols-1">
        <aside className="hidden border-r border-(--divider-subtle-color) bg-[#f3f6fa] px-3 py-4 text-[11px] text-(--text-soft) md:block">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em]">Safari</p>
          <SafariSidebarItem active label="搜索结果" />
          <SafariSidebarItem label="阅读列表" />
          <SafariSidebarItem label="历史记录" />
        </aside>
        <div className="min-w-0 px-6 py-5">
          <div className="mb-4 max-w-[760px]">
            <div className="flex min-w-0 items-center gap-2 rounded-[14px] border border-(--divider-subtle-color) bg-white px-3 py-2.5 text-[13px] text-(--text-strong) shadow-[0_12px_34px_rgba(18,28,42,0.07),inset_0_1px_0_rgba(255,255,255,0.82)]">
              <Search className="h-4 w-4 shrink-0 text-(--icon-muted)" />
              <span className="min-w-0 flex-1 truncate">{query}</span>
              {event.phase === "running" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--primary)]" /> : null}
            </div>
            <p className="mt-2 text-[11px] text-(--text-soft)">
              {PHASE_LABEL[event.phase]} · {result_items.length} 条结果 · {format_browser_origin(query)}
            </p>
            {event.phase === "running" ? (
              <div className="operation-web-loading mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(91,114,255,0.10)]" />
            ) : null}
          </div>
          <div className="max-w-[760px] space-y-3">
            {result_items.map((item) => (
              <article
                className="rounded-[14px] border border-(--divider-subtle-color) bg-white/82 px-4 py-3 shadow-[0_12px_34px_rgba(18,28,42,0.06)]"
                key={`${item.url}:${item.title}`}
              >
                <p className="truncate text-[11px] font-semibold text-[color:var(--success)]">{item.url}</p>
                <h3 className="mt-1 line-clamp-2 text-[14px] font-black tracking-[-0.02em] text-(--text-strong)">
                  {item.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-[12px] leading-5 text-(--text-default)">{item.snippet}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafariSidebarItem({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <div className={cn(
      "rounded-[9px] px-2.5 py-1.5 font-semibold",
      active ? "bg-white text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "text-(--text-soft)",
    )}>
      {label}
    </div>
  );
}

function format_browser_origin(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "工作区预览";
  }
}
