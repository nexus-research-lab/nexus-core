import type { NexusOperationEvent, OperationPhase } from "../operation-types";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export interface BrowserSessionView {
  display_url: string;
  iframe_url: string | null;
  source_label: string;
  srcdoc: string | null;
  status: { label: string; tone: "loading" | "ready" | "error" | "idle" };
  url: string | null;
}

export function build_browser_session_view({
  event,
  preview,
  query,
  raw_url_builder,
  target,
}: {
  event: NexusOperationEvent;
  preview: unknown;
  query: string;
  raw_url_builder?: (agent_id: string, path: string) => string;
  target?: string | null;
}): BrowserSessionView {
  const srcdoc = typeof preview === "string" && looks_like_html(preview) ? preview : null;
  const raw_url = build_workspace_raw_url(event.agent_id, target ?? event.target, raw_url_builder);
  const url = looks_like_url(query) ? query : null;
  const iframe_url = srcdoc ? null : raw_url ?? url;
  const has_live_view = Boolean(srcdoc || iframe_url);
  const display_url = browser_display_url({ iframe_url, query, srcdoc, target });

  return {
    display_url,
    iframe_url,
    source_label: browser_source_label({ display_url, iframe_url, srcdoc }),
    srcdoc,
    status: browser_status_for_event(event, has_live_view),
    url,
  };
}

function browser_status_for_event(
  event: NexusOperationEvent,
  has_live_view: boolean,
): BrowserSessionView["status"] {
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

function browser_source_label({
  display_url,
  iframe_url,
  srcdoc,
}: {
  display_url: string;
  iframe_url: string | null;
  srcdoc: string | null;
}): string {
  if (srcdoc) {
    return "内嵌页面";
  }
  if (iframe_url?.startsWith("/nexus/")) {
    return "工作区";
  }
  if (looks_like_url(display_url)) {
    return "网页";
  }
  return "摘要";
}

function looks_like_html(value: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]|<script[\s>]/i.test(value);
}

function looks_like_url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function build_workspace_raw_url(
  agent_id: string,
  target?: string | null,
  raw_url_builder?: (agent_id: string, path: string) => string,
): string | null {
  const path = normalize_workspace_relative_path(target);
  if (!path || !/\.(html?|xhtml)$/i.test(path)) {
    return null;
  }
  return raw_url_builder?.(agent_id, path) ?? `/nexus/v1/agents/${agent_id}/workspace/file/raw?${new URLSearchParams({ path }).toString()}`;
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
