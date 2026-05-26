import type { StageWindowState } from "../operation-desktop-types";
import type { StageNarrativePhase } from "./operation-stage-model";

const STAGE_MANAGER_BACKGROUND_POSITIONS = [
  "left-[3%] top-[14%] h-[14%] w-[13%]",
  "left-[3.5%] top-[31%] h-[14%] w-[13%]",
  "left-[3%] top-[48%] h-[14%] w-[13%]",
  "left-[3.5%] top-[65%] h-[14%] w-[13%]",
];

const PRIMARY_WORKSPACE = "left-[22%] top-[10%] h-[67%] w-[66%]";
const PRIMARY_REVIEW_WORKSPACE = "left-[20%] top-[10%] h-[66%] w-[62%]";
const COMPACT_REVIEW_WORKSPACE = "left-[27%] top-[15%] h-[52%] w-[48%]";

export function position_for_window(
  window: StageWindowState,
  narrative_phase: StageNarrativePhase,
  background_index = 0,
): string {
  const is_review_layout = narrative_phase === "completed";
  if (is_stage_manager_background_window(window, narrative_phase)) {
    return STAGE_MANAGER_BACKGROUND_POSITIONS[
      Math.min(background_index, STAGE_MANAGER_BACKGROUND_POSITIONS.length - 1)
    ];
  }
  if (window.layout === "terminal") {
    if (is_review_layout) {
      return window.phase === "focused"
        ? "left-[23%] top-[24%] h-[48%] w-[58%]"
        : "left-[23%] bottom-[9%] h-[23%] w-[52%]";
    }
    return window.phase === "focused"
      ? "left-[22%] top-[25%] h-[45%] w-[66%]"
      : "left-[21%] bottom-[9%] h-[23%] w-[52%]";
  }
  if (window.layout === "inspector") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[24%] bottom-[9%] h-14 w-[18%]" : "right-[6%] bottom-[9%] h-14 w-[18%]"
      : is_review_layout ? "right-[19%] bottom-[9%] h-[20%] w-[22%]" : "right-[4%] bottom-[9%] h-[21%] w-[22%]";
  }
  if (window.layout === "secondary") {
    return "left-[4%] top-[16%] h-[38%] w-[18%]";
  }
  if (window.kind === "permission_wait") {
    return window.phase === "minimized"
      ? "left-[36%] bottom-[8%] h-16 w-[28%]"
      : is_review_layout ? COMPACT_REVIEW_WORKSPACE : "left-[28%] top-[21%] h-[48%] w-[46%]";
  }
  if (window.layout === "artifact") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[22%] bottom-[9%] h-14 w-[20%]" : "right-[6%] bottom-[9%] h-14 w-[22%]"
      : is_review_layout ? "right-[18%] top-[16%] h-[45%] w-[28%]" : "right-[5%] top-[16%] h-[46%] w-[31%]";
  }
  if (window.kind === "browser") {
    return window.phase === "focused"
      ? is_review_layout ? PRIMARY_REVIEW_WORKSPACE : "left-[22%] top-[9%] h-[68%] w-[67%]"
      : is_review_layout ? "right-[21%] top-[16%] h-[48%] w-[34%]" : "right-[5%] top-[13%] h-[48%] w-[34%]";
  }
  if (window.kind === "code_editor") {
    return window.phase === "focused"
      ? is_review_layout ? PRIMARY_REVIEW_WORKSPACE : PRIMARY_WORKSPACE
      : is_review_layout ? "left-[19%] top-[16%] h-[46%] w-[34%]" : "left-[7%] top-[16%] h-[46%] w-[29%]";
  }
  if (window.kind === "task_board") {
    return is_review_layout ? COMPACT_REVIEW_WORKSPACE : PRIMARY_WORKSPACE;
  }
  if (window.kind === "generic_tool") {
    return window.phase === "focused"
      ? is_review_layout ? PRIMARY_REVIEW_WORKSPACE : PRIMARY_WORKSPACE
      : is_review_layout ? "left-[24%] top-[16%] h-[48%] w-[38%]" : "left-[24%] top-[14%] h-[52%] w-[40%]";
  }
  if (window.kind === "run_manifest") {
    return is_review_layout ? PRIMARY_REVIEW_WORKSPACE : PRIMARY_WORKSPACE;
  }
  if (window.kind === "handoff") {
    return window.phase === "focused"
      ? "left-[20%] top-[9%] h-[68%] w-[67%]"
      : "left-[27%] top-[15%] h-[52%] w-[46%]";
  }
  if (window.kind === "summary") {
    return is_review_layout ? COMPACT_REVIEW_WORKSPACE : "left-[28%] top-[15%] h-[52%] w-[46%]";
  }
  return is_review_layout ? PRIMARY_REVIEW_WORKSPACE : PRIMARY_WORKSPACE;
}

export function is_stage_manager_background_window(
  window: StageWindowState,
  _narrative_phase: StageNarrativePhase,
): boolean {
  return window.phase !== "focused"
    && window.phase !== "minimized";
}
