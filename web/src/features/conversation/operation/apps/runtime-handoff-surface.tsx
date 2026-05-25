import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RadioTower, Terminal, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

import { format_operation_time } from "../operation-preview";
import type { NexusOperationEvent } from "../operation-types";

const RUNTIME_HANDOFF_STALLED_MS = 45_000;

export function RuntimeHandoffSurface({
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

  const connection_label = is_retrying ? "RETRYING" : is_stalled ? "WAITING" : "CONNECTING";

  return (
    <div className="flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden bg-[#101820] text-[#dce8ee]">
      <div className="border-b border-white/10 bg-[#151f29]">
        <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#17232c] text-[#8de0ad]">
              {event.phase === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
            </span>
            <span className="truncate text-[11px] font-bold text-[#e7eef5]">Nexus Shell</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-white/[0.06] px-1.5 py-px text-[9px] font-bold text-[#8aa0ad]">
            <Wifi className="h-2.5 w-2.5" />
            {connection_label}
          </span>
        </div>
        <div className="flex min-w-0 items-end gap-1.5 px-3">
          <div className="flex min-w-0 max-w-[70%] items-center gap-1.5 rounded-t-[9px] border border-b-0 border-white/10 bg-[#101820] px-3 py-1.5 text-[10px] font-semibold text-[#dce8ee]">
            <RadioTower className="h-3 w-3 shrink-0 text-[#8ca0ff]" />
            <span className="truncate">{event.agent_id || "agent"} · runtime login</span>
          </div>
        </div>
      </div>
      <div className="soft-scrollbar min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-5">
        <RuntimeLine tone="muted" value={`last login ${format_operation_time(handoff_started_at)}`} />
        <RuntimeLine tone="muted" value={`session ${event.session_key}`} />
        <RuntimeLine tone="ok" value="login accepted for nexus desktop" />
        <RuntimeLine tone="ok" value="mounted ~/workspace" />
        <RuntimeLine tone="ok" value="loaded conversation context" />
        <RuntimeLine tone="ok" value="waiting for LaunchServices to open the first app" />
        <RuntimeLine
          tone={is_stalled || is_retrying ? "warn" : "active"}
          value={is_retrying
            ? "retrying model request before opening the first app..."
            : is_stalled
              ? `waiting for first app window after ${format_handoff_elapsed(elapsed_ms)}`
              : "waiting for first tool to open an app window..."}
        />
        {is_stalled || is_retrying ? (
          <RuntimeLine tone="muted" value="desktop will keep this shell open until the next app appears" />
        ) : null}
        <div className="mt-4 rounded-[10px] border border-white/10 bg-white/[0.04] p-3 font-sans">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8aa0ad]">request</p>
          <p className="line-clamp-5 text-[12px] leading-5 text-[#dce8ee]">{prompt}</p>
        </div>
      </div>
      {(is_stalled || is_retrying) ? (
        <div className="flex items-center gap-2 border-t border-white/10 bg-[#151f29] px-3 py-2 text-[10px] font-semibold text-[#ffd166]">
          <AlertTriangle className="h-3.5 w-3.5" />
          {is_retrying ? "模型请求正在重试" : "首个应用窗口尚未打开"}
        </div>
      ) : null}
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
