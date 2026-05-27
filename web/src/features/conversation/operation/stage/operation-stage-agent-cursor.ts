import type {
  StageWindowKind,
  StageWindowState,
} from "../operation-desktop-types";

export type StageAgentCursorIntent =
  | "approve"
  | "browse"
  | "inspect"
  | "organize"
  | "review"
  | "run"
  | "type";

export function agent_cursor_intent_for_window_kind(kind: StageWindowKind): StageAgentCursorIntent {
  if (kind === "browser") {
    return "browse";
  }
  if (kind === "terminal") {
    return "run";
  }
  if (kind === "finder") {
    return "organize";
  }
  if (kind === "permission_wait") {
    return "approve";
  }
  if (kind === "code_editor" || kind === "generic_tool") {
    return "type";
  }
  if (kind === "run_manifest" || kind === "task_board") {
    return "inspect";
  }
  return "review";
}

export function agent_cursor_action_label(intent: StageAgentCursorIntent): string {
  if (intent === "browse") {
    return "正在浏览";
  }
  if (intent === "run") {
    return "正在执行";
  }
  if (intent === "organize") {
    return "整理文件";
  }
  if (intent === "approve") {
    return "等待确认";
  }
  if (intent === "type") {
    return "正在编辑";
  }
  if (intent === "inspect") {
    return "检查现场";
  }
  return "查看结果";
}

export function agent_cursor_anchor_class(window: StageWindowState): string {
  if (window.kind === "browser") {
    return "right-[19%] top-[22%]";
  }
  if (window.kind === "terminal") {
    return "left-[27%] top-[34%]";
  }
  if (window.kind === "finder" || window.kind === "code_editor" || window.kind === "generic_tool") {
    return "left-[37%] top-[24%]";
  }
  if (window.kind === "handoff") {
    return "left-[69%] top-[22%]";
  }
  if (window.kind === "run_manifest" || window.kind === "task_board") {
    return "left-[58%] top-[24%]";
  }
  if (window.kind === "permission_wait") {
    return "left-[62%] top-[38%]";
  }
  if (window.layout === "artifact") {
    return "right-[15%] top-[30%]";
  }
  return "left-[58%] top-[24%]";
}
