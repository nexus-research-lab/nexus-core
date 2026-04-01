import { AssistantMessage, AssistantMessageStatus, Message } from "@/types/message";

/** 将消息按 round_id 分组 */
export function groupMessagesByRound(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const message of messages) {
    const round_id = message.round_id || message.message_id;
    if (!groups.has(round_id)) {
      groups.set(round_id, []);
    }
    groups.get(round_id)!.push(message);
  }
  return groups;
}

// ── 多 Agent 轮次工具函数 ──────────────────────────────────────────────

/** 聚合状态：单个 Agent 在某轮中的整体状态 */
export type AgentRoundStatus = "pending" | "streaming" | "done" | "error" | "cancelled";

/** 判断一个轮次是否包含多个 Agent 的 assistant 消息 */
export function isMultiAgentRound(messages: Message[]): boolean {
  const agent_ids = new Set<string>();
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.agent_id) {
      agent_ids.add(msg.agent_id);
      if (agent_ids.size > 1) return true;
    }
  }
  return false;
}

/** 将一轮消息按 agent_id 分组，仅分组 assistant 消息 */
export function groupRoundByAgent(messages: Message[]): Map<string, AssistantMessage[]> {
  const groups = new Map<string, AssistantMessage[]>();
  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.agent_id) continue;
    const existing = groups.get(msg.agent_id);
    if (existing) {
      existing.push(msg as AssistantMessage);
    } else {
      groups.set(msg.agent_id, [msg as AssistantMessage]);
    }
  }
  return groups;
}

/** 从一组 assistant 消息中推导该 Agent 的聚合状态 */
export function getAgentRoundStatus(messages: AssistantMessage[]): AgentRoundStatus {
  if (messages.length === 0) return "pending";

  let has_streaming = false;
  let has_pending = false;
  let has_error = false;
  let has_cancelled = false;

  for (const msg of messages) {
    const status = msg.stream_status;
    if (status === "streaming") has_streaming = true;
    else if (status === "pending") has_pending = true;
    else if (status === "error") has_error = true;
    else if (status === "cancelled") has_cancelled = true;
  }

  // 优先级：streaming > pending > error > cancelled > done
  if (has_streaming) return "streaming";
  if (has_pending) return "pending";
  if (has_error) return "error";
  if (has_cancelled) return "cancelled";
  return "done";
}

/** 从 assistant 消息中提取纯文本预览（截取前 80 字符） */
export function extractAgentPreviewText(messages: AssistantMessage[], max_length = 80): string {
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === "text" && block.text?.trim()) {
        const text = block.text.trim();
        return text.length > max_length ? text.slice(0, max_length) + "…" : text;
      }
    }
  }
  return "";
}

/** 获取最近一条 assistant/result 消息的时间戳 */
export function get_latest_reply_timestamp(messages: Message[]): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant" && msg.role !== "result") continue;
    if (Number.isFinite(msg.timestamp) && msg.timestamp > 0) return msg.timestamp;
  }
  const last = messages[messages.length - 1];
  if (last && Number.isFinite(last.timestamp) && last.timestamp > 0) return last.timestamp;
  return null;
}
