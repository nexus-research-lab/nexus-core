import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "./operation-types";

export type OperationStageExperiencePhase =
  | "idle"
  | "awakening"
  | "running"
  | "settling"
  | "completed";

export interface OperationContinuationBrief {
  status_label: string;
  status_detail: string;
  resume_prompt: string;
  primary_artifact: string;
  checkpoints: Array<{
    label: string;
    value: string;
    tone: "neutral" | "success" | "warning";
  }>;
}

export interface OperationLiveEpisode {
  status_label: string;
  status_detail: string;
  active_index: number;
  total_count: number;
  settled_count: number;
  active_tool_label: string;
  active_target: string;
  previous_label: string;
  next_label: string;
  progress_label: string;
  checkpoints: Array<{
    label: string;
    value: string;
    tone: "neutral" | "success" | "warning";
  }>;
}

export function derive_operation_stage_experience_phase(
  event: NexusOperationEvent | null,
  snapshot: NexusOperationSnapshot | null,
): OperationStageExperiencePhase {
  if (!event) {
    return "idle";
  }
  if (event.phase === "queued") {
    return "awakening";
  }
  if (event.phase === "running" || event.phase === "waiting") {
    return "running";
  }
  if (event.phase === "done" || event.phase === "cancelled") {
    return count_round_events(event, snapshot) > 1 ? "completed" : "settling";
  }
  return "settling";
}

export function count_round_events(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): number {
  const round_events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [];
  return round_events.some((item) => item.id === event.id)
    ? round_events.length
    : round_events.length + 1;
}

export function build_operation_continuation_brief(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): OperationContinuationBrief {
  const round_events = events.length
    ? events
    : snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const failed_count = round_events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const completed_count = round_events.filter((item) => item.phase === "done").length;
  const running_count = round_events.filter((item) => item.phase === "running" || item.phase === "waiting").length;
  const workspace_items = collect_continuation_workspace_items(event, round_events, snapshot);
  const evidence_count = round_events.reduce((total, item) => total + (item.evidence?.length ?? 0), 0)
    + (snapshot?.recent_evidence.length ?? 0);
  const primary_artifact = workspace_items[0]?.path
    ?? round_events.find((item) => item.target && item.surface !== "terminal" && item.surface !== "conversation")?.target
    ?? event.target
    ?? event.title;

  return {
    status_label: failed_count
      ? "REVIEW_REQUIRED"
      : running_count
        ? "IN_PROGRESS"
        : "READY_TO_CONTINUE",
    status_detail: failed_count
      ? "本轮存在异常，现场保留了失败步骤、输入和证据。"
      : running_count
        ? "本轮还有未收束步骤，工作台会继续等待后续工具事件。"
        : "本轮工具轨迹、窗口现场和关键产物已经沉淀。",
    resume_prompt: failed_count
      ? `继续排查本轮失败：回看 ${primary_artifact} 的执行现场和错误证据。`
      : `基于本轮产物继续：打开 ${primary_artifact}，按交接记录继续迭代或验证。`,
    primary_artifact,
    checkpoints: [
      {
        label: failed_count ? "异常" : "步骤",
        value: failed_count ? `${failed_count} issue` : `${completed_count}/${round_events.length}`,
        tone: failed_count ? "warning" : "success",
      },
      {
        label: "产物",
        value: workspace_items.length ? `${workspace_items.length} file` : primary_artifact,
        tone: workspace_items.length ? "success" : "neutral",
      },
      {
        label: "证据",
        value: evidence_count ? `${evidence_count} proof` : "window state",
        tone: evidence_count ? "success" : "neutral",
      },
      {
        label: running_count ? "现场" : "继续",
        value: running_count ? `${running_count} active` : "ready",
        tone: running_count || failed_count ? "warning" : "neutral",
      },
    ],
  };
}

export function build_operation_live_episode(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): OperationLiveEpisode {
  const round_events = events.length
    ? events
    : snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const ordered_events = [...round_events].sort((left, right) => left.updated_at - right.updated_at);
  const active_index = Math.max(0, ordered_events.findIndex((item) => item.id === event.id));
  const active_event = ordered_events[active_index] ?? event;
  const previous_event = ordered_events
    .slice(0, active_index)
    .reverse()
    .find((item) => item.phase === "done" || item.phase === "cancelled" || item.phase === "error")
    ?? null;
  const settled_count = ordered_events.filter((item) => (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;
  const active_target = active_event.target
    ?? active_event.summary
    ?? active_event.title;
  const is_waiting = active_event.phase === "waiting";
  const is_queued = active_event.phase === "queued";
  const is_terminal = active_event.surface === "terminal";
  const is_handoff = active_event.surface === "conversation";

  return {
    status_label: is_queued
      ? "AWAKENING"
      : is_waiting
        ? "WAITING_FOR_APPROVAL"
        : "LIVE_OPERATION",
    status_detail: is_queued
      ? "字符场正在展开为第一层工作现场。"
      : is_waiting
        ? "当前工具停在权限检查点，确认后会继续回到执行现场。"
        : is_terminal
          ? "命令窗口正在接收真实 stdout、stderr 和退出状态。"
          : is_handoff
            ? "运行时正在接入上下文，等待首个工具事件形成窗口。"
            : "当前工具窗口已成为焦点，前序步骤沉淀在工作台轨迹里。",
    active_index,
    total_count: ordered_events.length,
    settled_count,
    active_tool_label: active_event.tool_name ?? active_event.title,
    active_target,
    previous_label: previous_event
      ? `${previous_event.tool_name ?? previous_event.title} · ${previous_event.target ?? previous_event.summary ?? "已沉淀"}`
      : "从 nexus 初始场进入",
    next_label: is_waiting
      ? "等待用户确认后继续执行"
      : is_terminal
        ? "等待命令退出并沉淀结果"
        : is_handoff
          ? "等待第一个工具调用"
          : "等待下一个工具事件或本轮收束",
    progress_label: `${active_index + 1}/${ordered_events.length}`,
    checkpoints: [
      {
        label: "上一步",
        value: previous_event ? "沉淀" : "初始场",
        tone: previous_event ? "success" : "neutral",
      },
      {
        label: "当前",
        value: active_event.phase === "waiting" ? "确认" : active_event.phase === "queued" ? "显影" : "执行",
        tone: active_event.phase === "waiting" ? "warning" : "success",
      },
      {
        label: "焦点",
        value: active_event.surface,
        tone: "neutral",
      },
      {
        label: "进度",
        value: `${settled_count}/${ordered_events.length}`,
        tone: settled_count > 0 ? "success" : "neutral",
      },
    ],
  };
}

function collect_continuation_workspace_items(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): NexusOperationSnapshot["workspace_events"] {
  const workspace_items = snapshot?.workspace_events ?? [];
  if (!workspace_items.length) {
    return [];
  }

  const tool_use_ids = new Set(
    events
      .map((item) => item.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );
  const targets = new Set(
    events
      .map((item) => item.target)
      .filter((target): target is string => Boolean(target)),
  );

  const scoped_items = workspace_items.filter((item) => (
    Boolean(item.tool_use_id && tool_use_ids.has(item.tool_use_id)) ||
    targets.has(item.path)
  ));
  if (scoped_items.length) {
    return scoped_items;
  }

  const event_target_item = event.target
    ? workspace_items.find((item) => item.path === event.target)
    : null;
  return event_target_item ? [event_target_item] : [];
}
