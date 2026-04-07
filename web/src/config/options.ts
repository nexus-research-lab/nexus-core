/**
 * 前端运行时地址解析。
 *
 * 优先使用环境变量；若环境变量仍指向 localhost，
 * 且页面实际通过局域网 IP 打开，则自动对齐到当前页面 host。
 */

export const initialOptions = {
  model: import.meta.env.VITE_DEFAULT_MODEL || 'glm-5',
  permissionMode: 'default',
}

export let DEFAULT_AGENT_ID = "";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const LOCAL_FRONTEND_PORTS = new Set(["3000", "4173"]);
const DEFAULT_API_PATH = "/agent/v1";
const DEFAULT_WS_PATH = "/agent/v1/chat/ws";
const DEFAULT_LOCAL_BACKEND_PORT = "8010";

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

function normalizeHost(hostname: string): string {
  if (!hostname || hostname === "0.0.0.0") {
    return "localhost";
  }

  return hostname;
}

function getBrowserHost(): string {
  if (typeof window === "undefined") {
    return "localhost";
  }

  return normalizeHost(window.location.hostname);
}

function getBrowserOrigin(): string {
  if (typeof window === "undefined") {
    return "http://localhost";
  }

  return window.location.origin;
}

function getBrowserWsOrigin(): string {
  if (typeof window === "undefined") {
    return "ws://localhost";
  }

  const ws_protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${ws_protocol}//${window.location.host}`;
}

function shouldUseLocalBackendOrigin(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    isLocalHost(window.location.hostname)
    && LOCAL_FRONTEND_PORTS.has(window.location.port)
  );
}

function getLocalBackendOrigin(use_websocket_protocol: boolean): string {
  const host = getBrowserHost();
  if (use_websocket_protocol) {
    const ws_protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${ws_protocol}//${host}:${DEFAULT_LOCAL_BACKEND_PORT}`;
  }

  return `${window.location.protocol}//${host}:${DEFAULT_LOCAL_BACKEND_PORT}`;
}

function buildBrowserUrl(pathname: string, use_websocket_protocol: boolean): string {
  if (shouldUseLocalBackendOrigin()) {
    return `${getLocalBackendOrigin(use_websocket_protocol)}${pathname}`;
  }

  const origin = use_websocket_protocol ? getBrowserWsOrigin() : getBrowserOrigin();
  return `${origin}${pathname}`;
}

function alignUrlHost(rawUrl: string): string {
  if (typeof window === "undefined") {
    return rawUrl;
  }

  if (rawUrl.startsWith("/")) {
    return rawUrl;
  }

  const browserHost = getBrowserHost();
  if (browserHost === "localhost") {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    if (!isLocalHost(parsed.hostname)) {
      return rawUrl;
    }

    parsed.hostname = browserHost;
    if (!parsed.port && window.location.port) {
      parsed.port = window.location.port;
    }
    if (parsed.protocol === "ws:" || parsed.protocol === "wss:") {
      parsed.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    } else {
      parsed.protocol = window.location.protocol;
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function resolveRuntimeUrl(rawUrl: string | undefined, fallbackPath: string, use_websocket_protocol: boolean): string {
  if (!rawUrl) {
    return buildBrowserUrl(fallbackPath, use_websocket_protocol);
  }

  if (rawUrl.startsWith("/")) {
    return buildBrowserUrl(rawUrl, use_websocket_protocol);
  }

  return alignUrlHost(rawUrl);
}

export function getAgentApiBaseUrl(): string {
  return resolveRuntimeUrl(import.meta.env.VITE_API_URL, DEFAULT_API_PATH, false);
}

export function getAgentWsUrl(): string {
  return resolveRuntimeUrl(import.meta.env.VITE_WS_URL, DEFAULT_WS_PATH, true);
}

export function getDefaultAgentId(): string {
  return DEFAULT_AGENT_ID;
}

export function isMainAgent(agent_id?: string | null): boolean {
  return (agent_id ?? "").trim() === DEFAULT_AGENT_ID;
}

export function resolveAgentId(agent_id?: string | null): string {
  return (agent_id ?? "").trim() || DEFAULT_AGENT_ID;
}

export async function hydrateRuntimeOptions(): Promise<void> {
  const response = await fetch(`${getAgentApiBaseUrl()}/runtime/options`);
  if (!response.ok) {
    throw new Error(`加载运行时配置失败: ${response.status}`);
  }

  const content_type = response.headers.get("content-type") ?? "";
  if (!content_type.includes("application/json")) {
    const body_preview = (await response.text()).slice(0, 120).trim();
    throw new Error(
      `运行时配置接口返回了非 JSON 响应（content-type: ${content_type || "unknown"}）: ${body_preview}`,
    );
  }

  const payload = await response.json();
  const next_default_agent_id = payload?.data?.default_agent_id;
  if (!next_default_agent_id || typeof next_default_agent_id !== "string") {
    throw new Error("运行时配置缺少 default_agent_id");
  }

  DEFAULT_AGENT_ID = next_default_agent_id;
}
