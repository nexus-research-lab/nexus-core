import { useEffect, useState } from "react";
import { AlertTriangle, RadioTower } from "lucide-react";

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
