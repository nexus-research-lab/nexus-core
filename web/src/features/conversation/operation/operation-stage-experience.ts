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
