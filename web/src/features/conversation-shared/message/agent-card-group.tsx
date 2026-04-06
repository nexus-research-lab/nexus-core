"use client";

import { memo, useMemo } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssistantMessage, Message } from "@/types/message";
import {
  AgentRoundStatus,
  extractAgentPreviewText,
  getAgentRoundStatus,
  groupRoundByAgent,
} from "@/features/conversation-shared/utils";
import { AgentCard } from "./agent-card";
import { MessageAvatar, MessageShell } from "./message-primitives";

/** Thread 标识 */
export interface ActiveThread {
  round_id: string;
  agent_id: string;
}

interface AgentCardGroupProps {
  round_id: string;
  messages: Message[];
  agent_name_map?: Record<string, string>;
  compact?: boolean;
  active_thread?: ActiveThread | null;
  on_open_thread?: (round_id: string, agent_id: string) => void;
  on_stop_message?: (msg_id: string) => void;
}

export const AgentCardGroup = memo(function AgentCardGroup({
  round_id,
  messages,
  agent_name_map,
  compact = false,
  active_thread,
  on_open_thread,
  on_stop_message,
}: AgentCardGroupProps) {
  const user_message = messages.find((m) => m.role === "user");
  const agent_groups = useMemo(() => groupRoundByAgent(messages), [messages]);

  const user_content = useMemo(() => {
    if (!user_message || user_message.role !== "user") return "";
    return typeof user_message.content === "string" ? user_message.content : "";
  }, [user_message]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  // 按 agent_id 排序，保证渲染顺序稳定
  const sorted_agent_ids = useMemo(
    () => Array.from(agent_groups.keys()).sort(),
    [agent_groups],
  );

  return (
    <MessageShell
      class_name="animate-in fade-in slide-in-from-bottom-2 space-y-2 py-3 duration-300"
      separated={!compact}
    >
      {/* ═══════════════════════ 用户消息 ═══════════════════════ */}
      {user_message ? (
        <div className={cn("w-full", compact ? "px-0.5" : "px-2 sm:px-3")}>
          <div className={cn("mx-auto w-full", compact ? "max-w-full" : "max-w-[980px]")}>
            <div className="group grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-3">
              <MessageAvatar>
                <User className="h-4 w-4" />
              </MessageAvatar>
              <div className="relative min-w-0">
                <div className={cn("flex items-center gap-2", compact ? "h-[26px]" : "h-7")}>
                  <span className="shrink-0 text-sm font-bold text-[color:var(--text-strong)]">你</span>
                  <span className="hidden shrink-0 text-xs text-[color:var(--text-soft)] sm:inline">
                    {user_message.timestamp ? formatTime(user_message.timestamp) : "--:--"}
                  </span>
                </div>
                <div className="pb-1 pt-1">
                  <p className={cn(
                    "whitespace-pre-wrap text-[color:var(--text-strong)] wrap-anywhere",
                    compact ? "text-[13px] leading-6" : "text-[15px] leading-7",
                  )}>
                    {user_content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════ Agent 卡片列表 ═══════════════════════ */}
      <div className={cn("w-full", compact ? "px-0.5" : "px-2 sm:px-3")}>
        <div className={cn("mx-auto w-full", compact ? "max-w-full" : "max-w-[980px]")}>
          <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-3">
            {/* 空占位列，保持与用户消息对齐 */}
            <div />
            <div className="flex flex-col gap-1.5">
              {sorted_agent_ids.map((agent_id) => {
                const agent_messages = agent_groups.get(agent_id) ?? [];
                const status: AgentRoundStatus = getAgentRoundStatus(agent_messages);
                const preview = extractAgentPreviewText(agent_messages);
                const agent_name = agent_name_map?.[agent_id] ?? agent_id;
                const is_active = active_thread?.round_id === round_id && active_thread.agent_id === agent_id;

                // 查找第一个 pending/streaming 消息用于停止按钮
                const stoppable_msg = agent_messages.find(
                  (m) => m.stream_status === "pending" || m.stream_status === "streaming",
                );

                return (
                  <AgentCard
                    key={agent_id}
                    agent_id={agent_id}
                    agent_name={agent_name}
                    status={status}
                    preview_text={preview}
                    is_active={is_active}
                    on_click={() => on_open_thread?.(round_id, agent_id)}
                    on_stop={
                      stoppable_msg && on_stop_message
                        ? () => on_stop_message(stoppable_msg.message_id)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MessageShell>
  );
});
