import type { StageWindowKind, StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent } from "../operation-types";
import { display_stage_event_title } from "../operation-stage-labels";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import { event_sequence_label } from "./operation-stage-event-sequence";

export interface StageLiveStripState {
  app_label: string;
  detail: string;
  step_label: string;
  title: string;
  tone: "active" | "done" | "waiting" | "error";
}

export function build_stage_live_strip_state({
  active_event,
  active_window,
  events,
}: {
  active_event: NexusOperationEvent;
  active_window: StageWindowState | null;
  events: NexusOperationEvent[];
}): StageLiveStripState {
  const profile = resolve_operation_tool_profile(
    active_event.tool_name,
    active_event.kind,
    active_event.surface,
  );
  const app_label = active_window ? live_strip_app_label_for_kind(active_window.kind) : "Nexus";
  const title = display_stage_event_title(active_event, profile.action_label);
  const target = active_event.target ?? active_window?.target ?? active_window?.payload.target ?? null;

  return {
    app_label,
    detail: target ? `${profile.action_label} · ${target}` : profile.action_label,
    step_label: event_sequence_label(active_event, events),
    title,
    tone: live_strip_tone_for_event(active_event),
  };
}

function live_strip_app_label_for_kind(kind: StageWindowKind): string {
  if (kind === "browser") {
    return "Safari";
  }
  if (kind === "terminal") {
    return "终端";
  }
  if (kind === "finder") {
    return "访达";
  }
  if (kind === "code_editor") {
    return "Code";
  }
  if (kind === "handoff") {
    return "交付台";
  }
  if (kind === "task_board") {
    return "活动监视器";
  }
  if (kind === "permission_wait") {
    return "系统设置";
  }
  return "Nexus";
}

function live_strip_tone_for_event(event: NexusOperationEvent): StageLiveStripState["tone"] {
  if (event.phase === "waiting") {
    return "waiting";
  }
  if (event.phase === "error" || event.phase === "cancelled") {
    return "error";
  }
  if (event.phase === "done") {
    return "done";
  }
  return "active";
}
