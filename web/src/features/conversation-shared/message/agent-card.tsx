"use client";

import { memo } from "react";
import { Bot, Check, Loader2, Square, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRoundStatus } from "@/features/conversation-shared/utils";

interface AgentCardProps {
  agent_id: string;
  agent_name: string;
  status: AgentRoundStatus;
  preview_text: string;
  is_active?: boolean;
  on_click: () => void;
  on_stop?: () => void;
}

function StatusIndicator({ status }: { status: AgentRoundStatus }) {
  switch (status) {
    case "pending":
      return (
        <span className="flex items-center gap-0.5">
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
        </span>
      );
    case "streaming":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case "done":
      return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    case "error":
      return <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />;
    case "cancelled":
      return <Square className="h-3 w-3 text-slate-400" />;
  }
}

function statusLabel(status: AgentRoundStatus): string {
  switch (status) {
    case "pending": return "等待中";
    case "streaming": return "回复中…";
    case "done": return "";
    case "error": return "出错";
    case "cancelled": return "已停止";
  }
}

export const AgentCard = memo(function AgentCard({
  agent_name,
  status,
  preview_text,
  is_active = false,
  on_click,
  on_stop,
}: AgentCardProps) {
  const is_busy = status === "pending" || status === "streaming";
  const label = statusLabel(status);

  return (
    <button
      type="button"
      onClick={on_click}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        "hover:bg-slate-50/80",
        is_active
          ? "border-blue-200 bg-blue-50/40 shadow-sm"
          : "border-slate-200/80 bg-white",
      )}
    >
      {/* Agent 头像 */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
        is_active
          ? "border-blue-200 bg-blue-50 text-blue-600"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}>
        <Bot className="h-3.5 w-3.5" />
      </div>

      {/* 内容区 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{agent_name}</span>
          <StatusIndicator status={status} />
          {label ? (
            <span className="text-xs text-slate-400">{label}</span>
          ) : null}
        </div>
        {preview_text ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{preview_text}</p>
        ) : null}
      </div>

      {/* 停止按钮（streaming 时可用） */}
      {is_busy && on_stop ? (
        <button
          type="button"
          aria-label="停止生成"
          onClick={(e) => {
            e.stopPropagation();
            on_stop();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>
      ) : null}

      {/* 展开箭头提示 */}
      <svg
        className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
});
