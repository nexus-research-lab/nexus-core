import type { StageWindowState } from "../operation-desktop-types";
import type { StageNarrativePhase } from "./operation-stage-model";

export function position_for_window(window: StageWindowState, narrative_phase: StageNarrativePhase): string {
  const is_review_layout = narrative_phase === "completed";
  if (window.layout === "terminal") {
    if (is_review_layout) {
      return window.phase === "focused"
        ? "left-[29%] top-[24%] h-[48%] w-[38%]"
        : "left-[24%] bottom-[7%] h-[24%] w-[40%]";
    }
    return window.phase === "focused"
      ? "left-[18%] bottom-[10%] h-[34%] w-[48%]"
      : "left-[20%] bottom-[8%] h-[25%] w-[42%]";
  }
  if (window.layout === "inspector") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[33%] bottom-[8%] h-16 w-[18%]" : "right-[6%] bottom-[8%] h-16 w-[20%]"
      : is_review_layout ? "right-[33%] bottom-[7%] h-[22%] w-[22%]" : "right-[5%] bottom-[7%] h-[23%] w-[25%]";
  }
  if (window.layout === "secondary") {
    return "left-[4%] top-[15%] h-[43%] w-[22%]";
  }
  if (window.kind === "permission_wait") {
    return window.phase === "minimized"
      ? "left-[36%] bottom-[8%] h-16 w-[28%]"
      : is_review_layout ? "left-[31%] top-[20%] h-[46%] w-[38%]" : "left-[30%] top-[22%] h-[46%] w-[40%]";
  }
  if (window.layout === "artifact") {
    return window.phase === "minimized"
      ? is_review_layout ? "right-[33%] bottom-[8%] h-16 w-[22%]" : "right-[6%] bottom-[8%] h-16 w-[25%]"
      : is_review_layout ? "right-[33%] top-[17%] h-[44%] w-[25%]" : "right-[7%] top-[17%] h-[44%] w-[28%]";
  }
  if (window.kind === "browser") {
    return window.phase === "focused"
      ? is_review_layout ? "right-[31%] top-[12%] h-[64%] w-[42%]" : "right-[5%] top-[10%] h-[62%] w-[43%]"
      : is_review_layout ? "right-[35%] top-[16%] h-[48%] w-[30%]" : "right-[5%] top-[12%] h-[50%] w-[34%]";
  }
  if (window.kind === "code_editor") {
    return window.phase === "focused"
      ? is_review_layout ? "left-[24%] top-[13%] h-[58%] w-[43%]" : "left-[7%] top-[12%] h-[61%] w-[41%]"
      : is_review_layout ? "left-[21%] top-[17%] h-[44%] w-[30%]" : "left-[10%] top-[16%] h-[50%] w-[32%]";
  }
  if (window.kind === "task_board") {
    return is_review_layout ? "left-[25%] top-[15%] h-[50%] w-[40%]" : "left-[27%] top-[15%] h-[50%] w-[42%]";
  }
  if (window.kind === "generic_tool") {
    return window.phase === "focused"
      ? is_review_layout ? "left-[23%] top-[12%] h-[62%] w-[46%]" : "left-[22%] top-[10%] h-[66%] w-[50%]"
      : is_review_layout ? "left-[28%] top-[16%] h-[50%] w-[36%]" : "left-[28%] top-[14%] h-[52%] w-[38%]";
  }
  if (window.kind === "run_manifest") {
    return is_review_layout ? "left-[23%] top-[13%] h-[59%] w-[45%]" : "left-[27%] top-[14%] h-[56%] w-[43%]";
  }
  if (window.kind === "summary") {
    return is_review_layout ? "left-[28%] top-[16%] h-[50%] w-[38%]" : "left-[31%] top-[16%] h-[50%] w-[40%]";
  }
  return "left-[28%] top-[11%] h-[58%] w-[41%]";
}
