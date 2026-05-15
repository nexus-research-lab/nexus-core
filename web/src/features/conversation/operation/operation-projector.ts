import type { WorkspaceActivityItem } from "@/types/app/workspace-live";
import type { Message, ToolResultContent, ToolUseContent } from "@/types/conversation/message";
import type { PendingPermission } from "@/types/conversation/permission";

import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
  OperationKind,
  OperationPhase,
  OperationSurface,
} from "./operation-types";

const MAX_EVENTS = 24;
const MAX_EVIDENCE = 8;
const MAX_PROJECTED_MESSAGES = 80;
const MAX_TEXT_PREVIEW = 1200;
const MAX_RUNNABLE_ARTIFACT_PREVIEW = 32000;
const SECRET_KEY_PATTERN = /(api[_-]?key|token|password|secret|authorization|cookie|credential|private[_-]?key)/i;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})/g;

interface ToolProjection {
  kind: OperationKind;
  surface: OperationSurface;
  title: string;
}

interface ProjectOperationSnapshotParams {
  key: string;
  session_key: string | null;
  agent_id?: string | null;
  messages: Message[];
  pending_permissions: PendingPermission[];
  live_round_ids: string[];
  workspace_events: WorkspaceActivityItem[];
}

const TOOL_PROJECTIONS: Record<string, ToolProjection> = {
  Task: { kind: "task_delegate", surface: "task", title: "委派子任务" },
  TaskOutput: { kind: "task_progress", surface: "task", title: "读取子任务输出" },
  Bash: { kind: "command_run", surface: "terminal", title: "运行命令" },
  KillShell: { kind: "command_stop", surface: "terminal", title: "终止命令" },
  Glob: { kind: "workspace_inspect", surface: "workspace", title: "匹配文件" },
  Grep: { kind: "workspace_search", surface: "workspace", title: "搜索内容" },
  LS: { kind: "workspace_inspect", surface: "workspace", title: "查看目录" },
  Read: { kind: "workspace_read", surface: "workspace", title: "读取文件" },
  Edit: { kind: "workspace_edit", surface: "editor", title: "编辑文件" },
  MultiEdit: { kind: "workspace_edit", surface: "editor", title: "批量编辑" },
  Write: { kind: "workspace_edit", surface: "editor", title: "写入文件" },
  NotebookEdit: { kind: "workspace_edit", surface: "editor", title: "编辑 Notebook" },
  WebFetch: { kind: "web_research", surface: "web", title: "抓取网页" },
  WebSearch: { kind: "web_research", surface: "web", title: "搜索网页" },
  Skill: { kind: "context_read", surface: "knowledge", title: "读取技能上下文" },
  TodoWrite: { kind: "plan_update", surface: "summary", title: "更新计划" },
  EnterPlanMode: { kind: "plan_update", surface: "conversation", title: "进入规划模式" },
  ExitPlanMode: { kind: "plan_update", surface: "conversation", title: "退出规划模式" },
  AskUserQuestion: { kind: "human_gate", surface: "conversation", title: "等待用户输入" },
};

const PRIMARY_INPUT_KEYS = [
  "command",
  "query",
  "url",
  "path",
  "file_path",
  "notebook_path",
  "pattern",
  "description",
  "prompt",
  "task",
  "mode",
] as const;

export function project_operation_snapshot({
  key,
  session_key,
  agent_id,
  messages,
  pending_permissions,
  live_round_ids,
  workspace_events,
}: ProjectOperationSnapshotParams): NexusOperationSnapshot {
  const projected_messages = messages.slice(-MAX_PROJECTED_MESSAGES);
  const tool_results = collect_tool_results(projected_messages);
  const live_round_id_set = new Set(live_round_ids);
  const filtered_workspace_events = agent_id
    ? workspace_events.filter((event) => event.agent_id === agent_id)
    : workspace_events;
  const events: NexusOperationEvent[] = [];

  for (const message of projected_messages) {
    if (message.role !== "assistant") {
      continue;
    }

    for (const block of message.content) {
      if (block.type === "tool_use") {
        events.push(project_tool_use({
          block,
          message,
          session_key,
          result: tool_results.get(block.id),
          pending_permission: find_pending_permission(message.message_id, block, pending_permissions),
          is_live_round: live_round_id_set.has(message.round_id),
        }));
        continue;
      }

      if (block.type === "task_progress") {
        events.push({
          id: `${message.message_id}:task-progress:${block.task_id}`,
          session_key: message.session_key,
          round_id: message.round_id,
          agent_id: message.agent_id,
          message_id: message.message_id,
          tool_use_id: block.tool_use_id ?? null,
          tool_name: block.last_tool_name ?? "Task",
          kind: "task_progress",
          surface: "task",
          phase: live_round_id_set.has(message.round_id) ? "running" : "done",
          title: block.description || "子任务进度",
          target: block.last_tool_name ?? block.task_id,
          summary: summarize_value(block.usage),
          input_preview: {
            task_id: block.task_id,
            last_tool_name: block.last_tool_name ?? null,
          },
          evidence: [
            { type: "task", label: "task", value: block.task_id },
          ],
          updated_at: message.timestamp,
        });
      }
    }

    if (message.result_summary) {
      events.push({
        id: `${message.message_id}:summary`,
        session_key: message.session_key,
        round_id: message.round_id,
        agent_id: message.agent_id,
        message_id: message.message_id,
        kind: "round_summary",
        surface: "summary",
        phase: message.result_summary.is_error
          ? "error"
          : message.result_summary.subtype === "interrupted"
            ? "cancelled"
            : "done",
        title: "本轮执行收口",
        target: `${message.result_summary.num_turns} turns`,
        summary: message.result_summary.result ?? null,
        result_preview: redact_value(message.result_summary),
        evidence: [
          { type: "status", label: "duration", value: `${Math.round(message.result_summary.duration_ms / 1000)}s` },
          { type: "status", label: "turns", value: String(message.result_summary.num_turns) },
        ],
        started_at: message.timestamp,
        updated_at: message.result_summary.timestamp ?? message.timestamp,
        ended_at: message.result_summary.timestamp ?? message.timestamp,
      });
    }
  }

  for (const permission of pending_permissions) {
    if (events.some((event) => event.phase === "waiting" && event.tool_name === permission.tool_name)) {
      continue;
    }

    events.push(project_unmatched_permission(permission, session_key, agent_id));
  }

  for (const workspace_event of filtered_workspace_events) {
    events.push(project_workspace_event(workspace_event, session_key));
  }

  const sorted_events = events
    .sort((left, right) => (left.updated_at || 0) - (right.updated_at || 0))
    .slice(-MAX_EVENTS);
  const active_event = pick_active_event(sorted_events);
  const recent_evidence = collect_recent_evidence(sorted_events);

  return {
    key,
    session_key,
    active_event,
    events: sorted_events,
    recent_evidence,
    workspace_events: filtered_workspace_events.slice(0, 8),
    updated_at: Date.now(),
  };
}

function collect_tool_results(messages: Message[]): Map<string, ToolResultContent> {
  const results = new Map<string, ToolResultContent>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }
    for (const block of message.content) {
      if (block.type === "tool_result") {
        results.set(block.tool_use_id, block);
      }
    }
  }

  return results;
}

function project_tool_use({
  block,
  message,
  session_key,
  result,
  pending_permission,
  is_live_round,
}: {
  block: ToolUseContent;
  message: Extract<Message, { role: "assistant" }>;
  session_key: string | null;
  result?: ToolResultContent;
  pending_permission?: PendingPermission | null;
  is_live_round: boolean;
}): NexusOperationEvent {
  const projection = TOOL_PROJECTIONS[block.name] ?? {
    kind: "unknown" as const,
    surface: "fallback" as const,
    title: block.name || "未知工具",
  };
  const input_preview = redact_value(as_record(block.input)) as Record<string, unknown>;
  const target = extract_target(input_preview) ?? block.name;
  const phase = resolve_tool_phase(result, pending_permission, is_live_round, message.is_complete);
  const evidence = build_tool_evidence(block.name, target, result, pending_permission);

  return {
    id: `${message.message_id}:${block.id}`,
    session_key: session_key ?? message.session_key,
    round_id: message.round_id,
    agent_id: message.agent_id,
    message_id: message.message_id,
    tool_use_id: block.id,
    tool_name: block.name,
    kind: projection.kind,
    surface: projection.surface,
    phase,
    title: projection.title,
    target,
    summary: pending_permission?.summary ?? summarize_result(result),
    input_preview,
    result_preview: result ? redact_value(result.content) : null,
    evidence,
    started_at: message.timestamp,
    updated_at: message.timestamp,
    ended_at: result ? message.timestamp : null,
  };
}

function find_pending_permission(
  message_id: string,
  block: ToolUseContent,
  permissions: PendingPermission[],
): PendingPermission | null {
  return permissions.find((permission) => (
    permission.message_id === message_id &&
    permission.tool_name === block.name
  )) ?? null;
}

function resolve_tool_phase(
  result: ToolResultContent | undefined,
  pending_permission: PendingPermission | null | undefined,
  is_live_round: boolean,
  is_complete: boolean | undefined,
): OperationPhase {
  if (pending_permission) {
    return "waiting";
  }
  if (result?.is_error) {
    return "error";
  }
  if (result) {
    return "done";
  }
  if (is_live_round || !is_complete) {
    return "running";
  }
  return "done";
}

function build_tool_evidence(
  tool_name: string,
  target: string | null,
  result: ToolResultContent | undefined,
  pending_permission: PendingPermission | null | undefined,
): OperationEvidence[] {
  const evidence: OperationEvidence[] = [];
  if (target) {
    evidence.push({ type: evidence_type_for_tool(tool_name), label: "target", value: target });
  }
  if (pending_permission) {
    evidence.push({
      type: "permission",
      label: pending_permission.risk_label || "waiting",
      value: pending_permission.summary || pending_permission.tool_name,
    });
  }
  if (result?.is_error) {
    evidence.push({ type: "error", label: "error", value: summarize_value(result.content) });
  } else if (result) {
    evidence.push({ type: "status", label: "result", value: summarize_value(result.content) });
  }
  return evidence;
}

function project_unmatched_permission(
  permission: PendingPermission,
  session_key: string | null,
  agent_id?: string | null,
): NexusOperationEvent {
  const target = extract_target(redact_value(permission.tool_input) as Record<string, unknown>) ?? permission.tool_name;
  return {
    id: `permission:${permission.request_id}`,
    session_key: session_key ?? permission.session_key ?? "",
    round_id: permission.caused_by ?? permission.request_id,
    agent_id: permission.agent_id ?? agent_id ?? "",
    message_id: permission.message_id ?? null,
    tool_name: permission.tool_name,
    kind: "human_gate",
    surface: "conversation",
    phase: "waiting",
    title: permission.interaction_mode === "question" ? "等待用户回答" : "等待权限确认",
    target,
    summary: permission.summary ?? permission.risk_label ?? null,
    input_preview: redact_value(permission.tool_input) as Record<string, unknown>,
    evidence: [
      { type: "permission", label: permission.risk_label || "waiting", value: permission.summary ?? permission.tool_name },
    ],
    updated_at: Date.now(),
  };
}

function project_workspace_event(
  event: WorkspaceActivityItem,
  session_key: string | null,
): NexusOperationEvent {
  const is_deleted = event.status === "deleted";
  const is_done = event.status === "updated" || is_deleted;

  return {
    id: `workspace:${event.id}`,
    session_key: session_key ?? "",
    round_id: event.id,
    agent_id: event.agent_id,
    tool_use_id: null,
    tool_name: "workspace_event",
    kind: is_deleted ? "workspace_edit" : "workspace_edit",
    surface: "editor",
    phase: is_done ? "done" : "running",
    title: is_deleted ? "删除工作区文件" : "写入工作区文件",
    target: event.path,
    summary: event.diff_stats
      ? `+${event.diff_stats.additions} -${event.diff_stats.deletions}`
      : null,
    result_preview: event.live_content ? truncate_text(event.live_content, MAX_TEXT_PREVIEW) : null,
    evidence: [
      { type: "file", label: event.status, value: event.path },
      ...(event.diff_stats ? [{
        type: "diff" as const,
        label: "diff",
        value: `+${event.diff_stats.additions} -${event.diff_stats.deletions}`,
      }] : []),
    ],
    updated_at: event.updated_at,
  };
}

function pick_active_event(events: NexusOperationEvent[]): NexusOperationEvent | null {
  const priority = ["waiting", "running", "error"] satisfies OperationPhase[];
  for (const phase of priority) {
    const event = [...events].reverse().find((item) => item.phase === phase);
    if (event) {
      return event;
    }
  }
  return events.at(-1) ?? null;
}

function collect_recent_evidence(events: NexusOperationEvent[]): OperationEvidence[] {
  return events
    .flatMap((event) => event.evidence ?? [])
    .slice(-MAX_EVIDENCE);
}

function evidence_type_for_tool(tool_name: string): OperationEvidence["type"] {
  if (["Read", "LS", "Glob", "Grep"].includes(tool_name)) {
    return "file";
  }
  if (["Edit", "MultiEdit", "Write", "NotebookEdit"].includes(tool_name)) {
    return "diff";
  }
  if (["Bash", "KillShell"].includes(tool_name)) {
    return "terminal";
  }
  if (["WebSearch", "WebFetch"].includes(tool_name)) {
    return "url";
  }
  if (tool_name === "Skill") {
    return "skill";
  }
  if (["Task", "TaskOutput"].includes(tool_name)) {
    return "task";
  }
  return "status";
}

function extract_target(input: Record<string, unknown>): string | null {
  for (const key of PRIMARY_INPUT_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return truncate_text(value.trim(), 96);
    }
    if (Array.isArray(value) && value.length > 0) {
      return truncate_text(value.map((item) => String(item)).join(", "), 96);
    }
  }
  return null;
}

function summarize_result(result?: ToolResultContent): string | null {
  if (!result) {
    return null;
  }
  return summarize_value(result.content);
}

function summarize_value(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return truncate_text(value.replace(SECRET_VALUE_PATTERN, "[REDACTED]"), 180);
  }
  try {
    return truncate_text(JSON.stringify(redact_value(value)), 180);
  } catch {
    return truncate_text(String(value), 180);
  }
}

function redact_value(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]";
  }
  if (typeof value === "string") {
    return truncate_text(value.replace(SECRET_VALUE_PATTERN, "[REDACTED]"), MAX_TEXT_PREVIEW);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => redact_value(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        next[key] = "[REDACTED]";
        continue;
      }
      if (typeof item === "string" && key === "content" && looks_like_runnable_artifact(item)) {
        next[key] = truncate_text(item.replace(SECRET_VALUE_PATTERN, "[REDACTED]"), MAX_RUNNABLE_ARTIFACT_PREVIEW);
        continue;
      }
      next[key] = redact_value(item, depth + 1);
    }
    return next;
  }
  return value;
}

function looks_like_runnable_artifact(value: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]|<script[\s>]/i.test(value);
}

function as_record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function truncate_text(value: string, max_length: number): string {
  if (value.length <= max_length) {
    return value;
  }
  return `${value.slice(0, max_length - 1)}…`;
}
