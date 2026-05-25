import {
  Activity,
  CheckCircle2,
  Code2,
  Edit3,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Globe2,
  ImageIcon,
  ListChecks,
  ListTree,
  RadioTower,
  Search,
  ShieldQuestion,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  StageWindowKind,
  StageWindowState,
} from "../operation-desktop-types";
import type { OperationKind } from "../operation-types";
import type { StageNarrativePhase } from "./operation-stage-model";

export function icon_for_artifact_path(path: string): LucideIcon {
  if (/\.(tsx?|jsx?|json|ya?ml|toml|css|scss|html?)$/i.test(path)) {
    return FileCode2;
  }
  if (/\.(csv|xlsx?|ods)$/i.test(path)) {
    return FileSpreadsheet;
  }
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(path)) {
    return ImageIcon;
  }
  return FileText;
}

export function icon_for_operation_kind(kind: OperationKind): LucideIcon {
  if (kind === "workspace_inspect") {
    return ListTree;
  }
  if (kind === "workspace_search") {
    return Search;
  }
  if (kind === "workspace_read") {
    return FileText;
  }
  if (kind === "workspace_edit" || kind === "artifact_update") {
    return Edit3;
  }
  if (kind === "command_run" || kind === "command_stop") {
    return Terminal;
  }
  if (kind === "web_research") {
    return Globe2;
  }
  if (kind === "task_delegate" || kind === "task_progress") {
    return Activity;
  }
  if (kind === "plan_update") {
    return Code2;
  }
  return CheckCircle2;
}

export function icon_for_window_kind(kind: StageWindowKind): LucideIcon {
  if (kind === "finder") {
    return FolderTree;
  }
  if (kind === "terminal") {
    return Terminal;
  }
  if (kind === "browser") {
    return Globe2;
  }
  if (kind === "task_board") {
    return Activity;
  }
  if (kind === "runtime_handoff") {
    return RadioTower;
  }
  if (kind === "run_manifest") {
    return ListChecks;
  }
  if (kind === "evidence") {
    return CheckCircle2;
  }
  if (kind === "permission_wait") {
    return ShieldQuestion;
  }
  if (kind === "spreadsheet") {
    return FileSpreadsheet;
  }
  if (kind === "image_viewer") {
    return ImageIcon;
  }
  if (kind === "code_editor") {
    return FileCode2;
  }
  return FileText;
}

export function stage_app_label_for_window_kind(kind: StageWindowKind): string {
  if (kind === "finder") {
    return "访达";
  }
  if (kind === "terminal") {
    return "终端";
  }
  if (kind === "browser") {
    return "Safari";
  }
  if (kind === "task_board") {
    return "活动监视器";
  }
  if (kind === "runtime_handoff") {
    return "Nexus 终端";
  }
  if (kind === "run_manifest") {
    return "控制台";
  }
  if (kind === "summary") {
    return "备忘录";
  }
  if (kind === "evidence") {
    return "控制台";
  }
  if (kind === "permission_wait") {
    return "系统设置";
  }
  if (kind === "spreadsheet") {
    return "Numbers";
  }
  if (kind === "image_viewer") {
    return "预览";
  }
  if (kind === "code_editor") {
    return "Code";
  }
  if (kind === "markdown_reader" || kind === "word_reader" || kind === "pdf_reader") {
    return kind === "word_reader" ? "Pages" : "预览";
  }
  return "Nexus";
}

export function position_for_window(window: StageWindowState, narrative_phase: StageNarrativePhase): string {
  const is_review_layout = narrative_phase === "completed";
  if (window.layout === "terminal") {
    if (is_review_layout) {
      return window.phase === "focused"
        ? "left-[29%] top-[24%] h-[48%] w-[38%]"
        : "left-[24%] bottom-[7%] h-[24%] w-[40%]";
    }
    return window.phase === "focused"
      ? "left-[19%] top-[24%] h-[48%] w-[52%]"
      : "left-[24%] bottom-[7%] h-[24%] w-[42%]";
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
      ? is_review_layout ? "right-[31%] top-[12%] h-[64%] w-[42%]" : "right-[5%] top-[12%] h-[64%] w-[46%]"
      : is_review_layout ? "right-[35%] top-[16%] h-[48%] w-[30%]" : "right-[6%] top-[16%] h-[48%] w-[34%]";
  }
  if (window.kind === "task_board") {
    return is_review_layout ? "left-[25%] top-[15%] h-[50%] w-[40%]" : "left-[27%] top-[15%] h-[50%] w-[42%]";
  }
  if (window.kind === "runtime_handoff") {
    return "left-[24%] top-[18%] h-[52%] w-[46%]";
  }
  if (window.kind === "run_manifest") {
    return is_review_layout ? "left-[23%] top-[13%] h-[59%] w-[45%]" : "left-[27%] top-[14%] h-[56%] w-[43%]";
  }
  if (window.kind === "summary") {
    return is_review_layout ? "left-[28%] top-[16%] h-[50%] w-[38%]" : "left-[31%] top-[16%] h-[50%] w-[40%]";
  }
  return "left-[28%] top-[11%] h-[58%] w-[41%]";
}
