import {
  build_operation_input_rows,
  PHASE_LABELS,
  resolve_operation_tool_profile,
} from "../operation-tool-catalog";
import {
  format_operation_time,
  get_preview_lines,
  safe_json_stringify,
} from "../operation-preview";
import type { NexusOperationEvent } from "../operation-types";
import {
  tool_app_intent_for_action,
  type ToolAppIntent,
} from "./tool-app-intent";

export interface NexusToolSessionView {
  app_intent: ToolAppIntent;
  display_target: string;
  input_rows: Array<{ key: string; label: string; value: string }>;
  output_text: string;
  sidebar_items: Array<{ key: string; label: string; value: string }>;
  timeline: Array<{ id: string; label: string; phase_label: string }>;
  tool_name: string;
}

export function build_nexus_tool_session_view({
  event,
  preview,
  related_events,
  target,
}: {
  event: NexusOperationEvent;
  preview: unknown;
  related_events: NexusOperationEvent[];
  target?: string | null;
}): NexusToolSessionView {
  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const app_intent = tool_app_intent_for_action(profile.action);
  const display_target = target ?? event.target ?? event.tool_name ?? profile.title;
  const input_rows = build_operation_input_rows(event.input_preview, profile.target_keys, 8);
  const output_lines = get_preview_lines(preview ?? event.result_preview ?? event.summary, 10);
  const output_text = output_lines.length
    ? output_lines.join("\n")
    : safe_json_stringify(preview ?? event.result_preview ?? event.summary ?? "等待工具结果");

  return {
    app_intent,
    display_target,
    input_rows,
    output_text,
    sidebar_items: [
      { key: "tool", label: app_intent.sidebar_title, value: profile.title },
      { key: "app", label: "对应应用", value: app_intent.app_label },
      { key: "target", label: "目标", value: display_target },
      { key: "phase", label: "状态", value: PHASE_LABELS[event.phase] },
      { key: "updated", label: "更新时间", value: format_operation_time(event.updated_at) },
    ],
    timeline: (related_events.length ? related_events : [event]).slice(-5).map((item) => ({
      id: item.id,
      label: item.tool_name ?? item.title,
      phase_label: PHASE_LABELS[item.phase],
    })),
    tool_name: event.tool_name ?? profile.title,
  };
}
