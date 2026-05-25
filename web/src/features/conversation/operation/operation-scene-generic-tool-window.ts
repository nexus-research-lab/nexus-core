import type {
  StageWindowPayload,
  StageWindowPhase,
} from "./operation-desktop-types";
import type { NexusOperationEvent } from "./operation-types";
import { normalize_window_id } from "./operation-scene-planner-helpers";

export function generic_tool_window_config(
  event: NexusOperationEvent,
  related_events: NexusOperationEvent[],
  config: {
    phase: StageWindowPhase;
    z: number;
  },
) {
  return {
    id: `tool:${normalize_window_id(event.tool_name ?? event.kind ?? event.id)}`,
    kind: "generic_tool" as const,
    title: event.tool_name ?? event.title ?? "工具调用",
    layout: "primary" as const,
    phase: config.phase,
    z: config.z,
    payload: {
      evidence: event.evidence,
      preview: event.result_preview ?? event.input_preview ?? event.summary,
      related_events,
      summary: event.summary,
      target: event.target ?? event.tool_name ?? event.kind,
    } satisfies Partial<StageWindowPayload>,
  };
}
