import type { WorkspaceActivityItem } from "@/types/app/workspace-live";
import type {
  Message,
  ResultSummary,
  SystemEventContent,
  ToolResultContent,
  ToolUseContent,
} from "@/types/conversation/message";
import type { PendingPermission } from "@/types/conversation/permission";

import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
  OperationPhase,
} from "./operation-types";
import {
  DEFAULT_TARGET_KEYS,
  extract_operation_input_value,
  resolve_operation_tool_profile,
} from "./operation-tool-catalog";

const MAX_EVENTS = 24;
const MAX_EVIDENCE = 8;
const MAX_PROJECTED_MESSAGES = 80;
const MAX_TEXT_PREVIEW = 1200;
const MAX_RUNNABLE_ARTIFACT_PREVIEW = 32000;
const SECRET_KEY_PATTERN = /(api[_-]?key|token|password|secret|authorization|cookie|credential|private[_-]?key)/i;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})/g;

interface ProjectOperationSnapshotParams {
  key: string;
  session_key: string | null;
  agent_id?: string | null;
  messages: Message[];
  pending_permissions: PendingPermission[];
  live_round_ids: string[];
  workspace_events: WorkspaceActivityItem[];
}

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
  const relevant_pending_permissions = filter_pending_permissions_for_stage(
    pending_permissions,
    session_key,
    agent_id,
    projected_messages,
  );
  const pending_permission_matches = match_pending_permissions_to_tool_uses(
    relevant_pending_permissions,
    collect_unresolved_tool_use_candidates(projected_messages),
  );
  const agent_workspace_events = agent_id
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
          pending_permission: pending_permission_matches.matched_permissions_by_tool_use_id.get(block.id) ?? null,
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
        continue;
      }

      if (block.type === "system_event") {
        const system_event = project_system_event({
          block,
          message,
          session_key,
          is_live_round: live_round_id_set.has(message.round_id),
        });
        if (system_event) {
          events.push(system_event);
        }
      }
    }

    if (message.result_summary) {
      const is_summary_error = is_result_summary_error(message);
      const summary_text = message.result_summary.result ?? extract_assistant_text_preview(message) ?? null;
      const result_preview = build_summary_result_preview(
        message.result_summary,
        is_summary_error,
        summary_text,
      );
      const round_started_at = find_round_start_timestamp(
        projected_messages,
        message.round_id,
        message.timestamp,
      );
      events.push({
        id: `${message.message_id}:summary`,
        session_key: message.session_key,
        round_id: message.round_id,
        agent_id: message.agent_id,
        message_id: message.message_id,
        kind: "round_summary",
        surface: "summary",
        phase: is_summary_error
          ? "error"
          : message.result_summary.subtype === "interrupted"
            ? "cancelled"
            : "done",
        title: is_summary_error ? "本轮执行异常" : "本轮执行收口",
        target: `${message.result_summary.num_turns} turns`,
        summary: summary_text,
        result_preview,
        evidence: [
          ...(is_summary_error ? [{ type: "error" as const, label: "error", value: summary_text }] : []),
          { type: "status", label: "duration", value: `${Math.round(message.result_summary.duration_ms / 1000)}s` },
          { type: "status", label: "turns", value: String(message.result_summary.num_turns) },
        ],
        started_at: round_started_at,
        updated_at: message.result_summary.timestamp ?? message.timestamp,
        ended_at: message.result_summary.timestamp ?? message.timestamp,
      });
    }
  }

  for (const permission of pending_permission_matches.unmatched_permissions) {
    if (events.some((event) => event.phase === "waiting" && event.tool_name === permission.tool_name)) {
      continue;
    }

    events.push(project_unmatched_permission(permission, session_key, agent_id));
  }

  for (const live_round_id of live_round_ids) {
    if (events.some((event) => event.round_id === live_round_id)) {
      continue;
    }

    const placeholder = project_live_round_placeholder({
      live_round_id,
      session_key,
      agent_id,
      messages: projected_messages,
    });
    if (placeholder) {
      events.push(placeholder);
    }
  }

  const relevant_workspace_events = filter_workspace_events_for_stage(
    agent_workspace_events,
    session_key,
    events,
  );

  for (const workspace_event of relevant_workspace_events) {
    events.push(project_workspace_event(
      workspace_event,
      session_key,
      resolve_workspace_event_round_id(workspace_event, events),
    ));
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
    workspace_events: relevant_workspace_events.slice(0, 8),
    updated_at: Date.now(),
  };
}

interface PendingPermissionToolUseCandidate {
  tool_use_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  message_id: string;
}

function collect_unresolved_tool_use_candidates(messages: Message[]): PendingPermissionToolUseCandidate[] {
  const ordered_candidates: PendingPermissionToolUseCandidate[] = [];
  const candidate_index_by_tool_use_id = new Map<string, number>();
  const resolved_tool_use_ids = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    for (const block of message.content) {
      if (block.type === "tool_use") {
        const next_candidate = {
          tool_use_id: block.id,
          tool_name: block.name,
          tool_input: (block.input ?? {}) as Record<string, unknown>,
          message_id: message.message_id,
        };
        const existing_index = candidate_index_by_tool_use_id.get(block.id);
        if (existing_index == null) {
          candidate_index_by_tool_use_id.set(block.id, ordered_candidates.length);
          ordered_candidates.push(next_candidate);
        } else {
          ordered_candidates[existing_index] = next_candidate;
        }
        continue;
      }

      if (block.type === "tool_result") {
        resolved_tool_use_ids.add(block.tool_use_id);
      }
    }
  }

  return ordered_candidates.filter((candidate) => !resolved_tool_use_ids.has(candidate.tool_use_id));
}

function match_pending_permissions_to_tool_uses(
  pending_permissions: PendingPermission[],
  candidates: PendingPermissionToolUseCandidate[],
): {
  matched_permissions_by_tool_use_id: Map<string, PendingPermission>;
  unmatched_permissions: PendingPermission[];
} {
  const matched_permissions_by_tool_use_id = new Map<string, PendingPermission>();
  const matched_request_ids = new Set<string>();
  const candidate_queue_by_message_id = new Map<string, PendingPermissionToolUseCandidate[]>();

  for (const candidate of candidates) {
    const queue = candidate_queue_by_message_id.get(candidate.message_id) ?? [];
    queue.push(candidate);
    candidate_queue_by_message_id.set(candidate.message_id, queue);
  }

  for (const permission of pending_permissions) {
    const message_id = permission.message_id?.trim();
    if (!message_id) {
      continue;
    }

    const queue = candidate_queue_by_message_id.get(message_id);
    if (!queue?.length) {
      continue;
    }

    const matched_index = queue.findIndex((candidate) => (
      permission.tool_name === candidate.tool_name &&
      stable_stringify(permission.tool_input) === stable_stringify(candidate.tool_input)
    ));
    if (matched_index < 0) {
      continue;
    }

    const [candidate] = queue.splice(matched_index, 1);
    if (!candidate) {
      continue;
    }

    matched_permissions_by_tool_use_id.set(candidate.tool_use_id, permission);
    matched_request_ids.add(permission.request_id);
  }

  return {
    matched_permissions_by_tool_use_id,
    unmatched_permissions: pending_permissions.filter((permission) => !matched_request_ids.has(permission.request_id)),
  };
}

function filter_pending_permissions_for_stage(
  permissions: PendingPermission[],
  session_key: string | null,
  agent_id: string | null | undefined,
  projected_messages: Message[],
): PendingPermission[] {
  const projected_message_ids = new Set(projected_messages.map((message) => message.message_id));

  return permissions.filter((permission) => {
    if (agent_id && permission.agent_id && permission.agent_id !== agent_id) {
      return false;
    }

    if (!session_key) {
      return true;
    }

    if (permission.session_key) {
      return are_equivalent_stage_session_keys(permission.session_key, session_key);
    }

    if (permission.message_id) {
      return projected_message_ids.has(permission.message_id);
    }

    return false;
  });
}

function are_equivalent_stage_session_keys(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const left_identity = get_stage_session_identity(left);
  const right_identity = get_stage_session_identity(right);
  return Boolean(left_identity && right_identity && left_identity === right_identity);
}

function get_stage_session_identity(session_key: string | null | undefined): string | null {
  const normalized_key = (session_key ?? "").trim();
  if (!normalized_key) {
    return null;
  }
  if (normalized_key.startsWith("room:group:")) {
    return `room:${normalized_key.slice("room:group:".length)}`;
  }
  return normalized_key;
}

function stable_stringify(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stable_stringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable_stringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function filter_workspace_events_for_stage(
  workspace_events: WorkspaceActivityItem[],
  session_key: string | null,
  projected_events: NexusOperationEvent[],
): WorkspaceActivityItem[] {
  if (!session_key) {
    return workspace_events;
  }

  const tool_use_ids = new Set(
    projected_events
      .map((event) => event.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );

  return workspace_events.filter((event) => {
    if (event.session_key === session_key) {
      return true;
    }
    return Boolean(event.tool_use_id && tool_use_ids.has(event.tool_use_id));
  });
}

function build_summary_result_preview(
  summary: ResultSummary,
  is_error: boolean,
  summary_text: string | null,
): unknown {
  const redacted = redact_value(summary) as Record<string, unknown>;
  if (!is_error) {
    return redacted;
  }

  return {
    ...redacted,
    is_error: true,
    result: summary_text,
    subtype: summary.subtype === "interrupted" ? "interrupted" : "error",
  };
}

function is_result_summary_error(message: Extract<Message, { role: "assistant" }>): boolean {
  if (!message.result_summary) {
    return false;
  }
  if (message.result_summary.is_error || message.result_summary.subtype === "error") {
    return true;
  }
  if (message.stream_status === "error") {
    return true;
  }
  if (message.model === "<synthetic>") {
    const text = extract_assistant_text_preview(message) ?? "";
    return /\b(error|failed|unauthorized|authenticate|invalid|expired)\b/i.test(text);
  }
  return false;
}

function extract_assistant_text_preview(message: Extract<Message, { role: "assistant" }>): string | null {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) {
    return null;
  }
  return text.length > MAX_TEXT_PREVIEW ? `${text.slice(0, MAX_TEXT_PREVIEW)}...` : text;
}

function project_system_event({
  block,
  message,
  session_key,
  is_live_round,
}: {
  block: SystemEventContent;
  message: Extract<Message, { role: "assistant" }>;
  session_key: string | null;
  is_live_round: boolean;
}): NexusOperationEvent | null {
  if (!is_live_round) {
    return null;
  }

  const subtype = block.subtype ?? "status";
  if (
    subtype !== "api_retry" &&
    subtype !== "status" &&
    subtype !== "progress" &&
    subtype !== "requesting"
  ) {
    return null;
  }

  return {
    id: `${message.message_id}:system:${subtype}:${block.timestamp}`,
    session_key: session_key ?? message.session_key,
    round_id: message.round_id,
    agent_id: message.agent_id,
    message_id: message.message_id,
    kind: "unknown",
    surface: "conversation",
    phase: "running",
    title: block.label || "运行接入中",
    target: block.content || "等待第一个工具事件",
    summary: block.content || null,
    evidence: [
      { type: "status", label: subtype, value: block.label || block.content },
    ],
    started_at: message.timestamp,
    updated_at: block.timestamp || message.timestamp,
  };
}

function project_live_round_placeholder({
  live_round_id,
  session_key,
  agent_id,
  messages,
}: {
  live_round_id: string;
  session_key: string | null;
  agent_id?: string | null;
  messages: Message[];
}): NexusOperationEvent | null {
  const related_message = [...messages].reverse().find((message) => message.round_id === live_round_id);
  if (!related_message) {
    return null;
  }

  const user_prompt = related_message.role === "user"
    ? related_message.content
    : find_round_user_prompt(messages, live_round_id);
  const resolved_agent_id = agent_id
    ?? ("agent_id" in related_message ? related_message.agent_id : null);
  if (!resolved_agent_id) {
    return null;
  }

  return {
    id: `live-round:${live_round_id}`,
    session_key: session_key ?? related_message.session_key,
    round_id: live_round_id,
    agent_id: resolved_agent_id,
    message_id: related_message.message_id,
    kind: "unknown",
    surface: "conversation",
    phase: "running",
    title: "运行接入中",
    target: "等待第一个工具事件",
    summary: user_prompt || "模型正在建立上下文，还没有进入具体工具。",
    input_preview: user_prompt ? { prompt: user_prompt } : null,
    evidence: [
      { type: "status", label: "round", value: "running" },
    ],
    started_at: related_message.timestamp,
    updated_at: Date.now(),
  };
}

function find_round_user_prompt(messages: Message[], round_id: string): string | null {
  const user_message = [...messages].reverse().find((message) => (
    message.round_id === round_id &&
    message.role === "user"
  ));
  return user_message?.role === "user" ? user_message.content : null;
}

function find_round_start_timestamp(
  messages: Message[],
  round_id: string,
  fallback_timestamp: number,
): number {
  const first_round_message = messages.find((message) => message.round_id === round_id);
  return first_round_message?.timestamp ?? fallback_timestamp;
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
  const projection = resolve_operation_tool_profile(block.name);
  const input_preview = redact_value(as_record(block.input)) as Record<string, unknown>;
  const target = extract_target(input_preview, projection.target_keys) ?? block.name;
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
    result_preview: build_tool_result_preview(result, projection.kind),
    evidence,
    started_at: message.timestamp,
    updated_at: message.timestamp,
    ended_at: result ? message.timestamp : null,
  };
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
  const profile = resolve_operation_tool_profile(tool_name);
  const evidence: OperationEvidence[] = [];
  if (target) {
    evidence.push({ type: profile.evidence_type, label: profile.action_label, value: target });
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

function build_tool_result_preview(
  result: ToolResultContent | undefined,
  kind: NexusOperationEvent["kind"],
): unknown {
  if (!result) {
    return null;
  }

  const redacted_content = redact_value(result.content);
  if (kind === "command_run" || kind === "command_stop") {
    return {
      content: redacted_content,
      error_code: result.error_code ?? null,
      is_error: Boolean(result.is_error),
    };
  }
  return redacted_content;
}

function project_unmatched_permission(
  permission: PendingPermission,
  session_key: string | null,
  agent_id?: string | null,
): NexusOperationEvent {
  const profile = resolve_operation_tool_profile(permission.tool_name);
  const target = extract_target(
    redact_value(permission.tool_input) as Record<string, unknown>,
    profile.target_keys,
  ) ?? permission.tool_name;
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
  round_id: string,
): NexusOperationEvent {
  const is_deleted = event.status === "deleted";
  const is_done = event.status === "updated" || is_deleted;

  return {
    id: `workspace:${event.id}`,
    session_key: session_key ?? "",
    round_id,
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
  const summary_event = [...events].reverse().find((item) => item.kind === "round_summary");
  if (summary_event) {
    return summary_event;
  }
  return events.at(-1) ?? null;
}

function resolve_workspace_event_round_id(
  event: WorkspaceActivityItem,
  projected_events: NexusOperationEvent[],
): string {
  if (event.tool_use_id) {
    const matched_tool_event = [...projected_events].reverse().find((item) => (
      item.tool_use_id === event.tool_use_id &&
      item.agent_id === event.agent_id
    ));
    if (matched_tool_event) {
      return matched_tool_event.round_id;
    }
    return event.tool_use_id;
  }
  return event.session_key ?? event.id;
}

function collect_recent_evidence(events: NexusOperationEvent[]): OperationEvidence[] {
  return events
    .flatMap((event) => event.evidence ?? [])
    .slice(-MAX_EVIDENCE);
}

function extract_target(input: Record<string, unknown>, keys: readonly string[]): string | null {
  const primary = extract_operation_input_value(input, keys);
  if (primary?.value) {
    return truncate_text(primary.value, 96);
  }
  const fallback = extract_operation_input_value(input, DEFAULT_TARGET_KEYS);
  return fallback?.value ? truncate_text(fallback.value, 96) : null;
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
