import type { NexusOperationEvent } from "./operation-types";

export function is_low_signal_stage_label(value: string | null | undefined): value is string {
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    /^\d+\s+turns?$/.test(normalized) ||
    /^\d+\s+actions?$/.test(normalized) ||
    /^\d+\s+步$/.test(normalized) ||
    normalized.endsWith(" turns") ||
    normalized === "本轮执行收口" ||
    normalized === "当前目标"
  );
}

export function fallback_stage_event_object_label(
  event: NexusOperationEvent | null,
  surface_label?: string,
): string {
  if (!event) {
    return "等待第一个工具事件";
  }
  if (event.kind === "round_summary" || event.surface === "summary") {
    return `${surface_label ?? "交接"}面板`;
  }
  return event.tool_name ?? `${surface_label ?? "工具"}窗口`;
}

export function fallback_stage_event_target_label(
  event: NexusOperationEvent,
  surface_label?: string,
): string {
  if (event.kind === "round_summary" || event.surface === "summary") {
    return `${surface_label ?? "交接"}交接`;
  }
  return "等待工具输入";
}
