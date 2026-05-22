import { build_operation_continuation_brief } from "./operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "./operation-types";

export interface OperationStageHandoffSpotlightModel {
  artifact_label: string;
  badge_label: string;
  is_completed: boolean;
  status_label: string;
  subtitle: string;
  title: string;
  continuation: {
    detail: string;
    prompt: string;
    status: string;
  };
  steps: Array<{
    label: "入口" | "执行" | "交接";
    value: string;
  }>;
  tone: "success" | "warning" | "neutral";
}

export function build_operation_stage_handoff_spotlight_model({
  completed_count,
  event,
  events,
  narrative_phase,
  snapshot,
  total_count,
}: {
  completed_count: number;
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative_phase: "awakening" | "running" | "settling" | "completed";
  snapshot: NexusOperationSnapshot | null;
  total_count: number;
}): OperationStageHandoffSpotlightModel | null {
  if (narrative_phase !== "settling" && narrative_phase !== "completed") {
    return null;
  }

  const continuation = build_operation_continuation_brief(event, events, snapshot);
  const failed_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const is_completed = narrative_phase === "completed" && failed_count === 0;
  const artifact_label = resolve_handoff_artifact_label(event, events, snapshot);

  return {
    artifact_label,
    badge_label: failed_count ? `${failed_count} 异常` : "ready",
    is_completed,
    status_label: continuation.status_label,
    subtitle: `${continuation.status_label} · ${completed_count}/${Math.max(total_count, 1)} 步`,
    title: is_completed ? "工作台已完成交接" : "工作台正在收束",
    continuation: {
      detail: continuation.status_detail,
      prompt: continuation.resume_prompt,
      status: continuation.status_label,
    },
    steps: [
      { label: "入口", value: "nexus 字符场" },
      { label: "执行", value: `${events.length} 个动作` },
      { label: "交接", value: artifact_label },
    ],
    tone: failed_count ? "warning" : is_completed ? "success" : "neutral",
  };
}

function resolve_handoff_artifact_label(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): string {
  const round_tool_use_ids = new Set(
    events
      .map((item) => item.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );
  const round_targets = new Set(
    events
      .map((item) => item.target)
      .filter((target): target is string => Boolean(target)),
  );
  const workspace_artifact = snapshot?.workspace_events.find((item) => (
    Boolean(item.tool_use_id && round_tool_use_ids.has(item.tool_use_id)) ||
    round_targets.has(item.path)
  ));
  const evidence = [
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ].find((item) => item.value || item.label);

  return workspace_artifact?.path
    ?? evidence?.value
    ?? evidence?.label
    ?? event.target
    ?? event.summary
    ?? "本轮上下文";
}
