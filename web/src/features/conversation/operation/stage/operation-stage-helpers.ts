import {
  Activity,
  AlertTriangle,
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
  Loader2,
  RadioTower,
  Search,
  ShieldQuestion,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type {
  StageWindowKind,
  StageWindowState,
} from "../operation-desktop-types";
import { derive_operation_stage_experience_phase } from "../operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
  OperationKind,
} from "../operation-types";
import type {
  ArchiveCapsuleItem,
  CompletionArtifact,
  HandoffChecklistItem,
  HandoffItem,
  StageNarrativePhase,
  StageNarrativeState,
} from "./operation-stage-model";

export function format_elapsed(
  started_at: number | undefined,
  ended_at: number | null | undefined,
  updated_at: number,
): string {
  const start = normalize_timestamp(started_at ?? updated_at);
  const end = normalize_timestamp(ended_at ?? updated_at);
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining_seconds = seconds % 60;
  return `${minutes}m ${remaining_seconds}s`;
}

function normalize_timestamp(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

export function collect_completion_artifacts(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): CompletionArtifact[] {
  const artifacts: CompletionArtifact[] = [];
  const seen = new Set<string>();

  const push_artifact = (artifact: CompletionArtifact) => {
    const key = `${artifact.type}:${artifact.value}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    artifacts.push(artifact);
  };

  collect_completion_workspace_artifacts(event, snapshot).slice(0, 4).forEach((item) => {
    push_artifact({
      id: `workspace:${item.id}`,
      label: item.status === "deleted" ? "已删除文件" : item.status === "writing" ? "写入中的文件" : "工作区文件",
      value: item.path,
      type: "workspace",
      Icon: window_kind_for_artifact_path(item.path),
    });
  });

  const evidence_items = [
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ];
  evidence_items.slice(0, 8).forEach((item, index) => {
    const value = item.value ?? item.label;
    if (!value) {
      return;
    }
    push_artifact({
      id: `evidence:${index}:${value}`,
      label: item.label || evidence_type_label(item.type),
      value,
      type: item.type,
      Icon: icon_for_evidence_type(item.type, value),
    });
  });

  if (artifacts.length === 0 && event.target) {
    push_artifact({
      id: `target:${event.id}`,
      label: event.surface === "terminal" ? "执行目标" : "当前目标",
      value: event.target,
      type: event.surface === "terminal" ? "terminal" : "status",
      Icon: event.surface === "terminal" ? Terminal : icon_for_operation_kind(event.kind),
    });
  }

  return artifacts.slice(0, 4);
}

export function collect_completion_workspace_artifacts(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationSnapshot["workspace_events"] {
  const workspace_items = snapshot?.workspace_events ?? [];
  if (!workspace_items.length) {
    return [];
  }

  const round_events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [event];
  const round_tool_use_ids = new Set(
    round_events
      .map((item) => item.tool_use_id)
      .filter((tool_use_id): tool_use_id is string => Boolean(tool_use_id)),
  );
  const round_targets = new Set(
    round_events
      .map((item) => item.target)
      .filter((target): target is string => Boolean(target)),
  );

  return workspace_items.filter((item) => (
    Boolean(item.tool_use_id && round_tool_use_ids.has(item.tool_use_id)) ||
    round_targets.has(item.path)
  ));
}

export function collect_archive_capsules({
  event,
  events,
  snapshot,
  windows,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  snapshot: NexusOperationSnapshot | null;
  windows: StageWindowState[];
}): ArchiveCapsuleItem[] {
  const artifacts = collect_completion_artifacts(event, snapshot);
  const terminal_count = events.filter((item) => item.surface === "terminal").length;
  const evidence_count = (event.evidence?.length ?? 0) + (snapshot?.recent_evidence.length ?? 0);
  const window_count = windows.filter((window) => window.phase !== "closed").length;
  const has_error = event.phase === "error" || events.some((item) => item.phase === "error");

  return [
    {
      id: "archive-windows",
      label: "窗口现场",
      value: `${window_count} 个窗口`,
      meta: "布局已保存",
      tone: has_error ? "warning" : "success",
      Icon: FolderTree,
    },
    {
      id: "archive-artifacts",
      label: artifacts.length ? "关键产物" : "上下文产物",
      value: artifacts[0]?.value ?? event.target ?? event.title,
      meta: artifacts.length ? `${artifacts.length} 项` : "上下文",
      tone: artifacts.length ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      id: "archive-trace",
      label: "执行轨迹",
      value: `${events.length} 步`,
      meta: terminal_count || evidence_count ? `${terminal_count + evidence_count} 条证据` : "时间线",
      tone: has_error ? "warning" : "success",
      Icon: ListChecks,
    },
  ];
}

export function collect_handoff_items({
  artifacts,
  events,
  evidence_count,
  file_count,
  has_error,
  narrative,
  terminal_count,
}: {
  artifacts: CompletionArtifact[];
  events: NexusOperationEvent[];
  evidence_count: number;
  file_count: number;
  has_error: boolean;
  narrative: StageNarrativeState;
  terminal_count: number;
}): HandoffItem[] {
  const settled_count = events.filter((item) => (
    item.phase === "done" || item.phase === "cancelled" || item.phase === "error"
  )).length;
  const running_count = events.filter((item) => item.phase === "running" || item.phase === "waiting").length;

  return [
    {
      label: narrative.phase === "settling" ? "落盘中" : "轨迹归档",
      value: `${settled_count}/${events.length} 步`,
      tone: has_error ? "warning" : narrative.phase === "completed" ? "success" : "neutral",
      Icon: has_error ? AlertTriangle : CheckCircle2,
    },
    {
      label: "产物",
      value: artifacts.length ? `${artifacts.length} 项` : file_count ? `${file_count} 个文件` : "无",
      tone: artifacts.length || file_count ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      label: running_count ? "仍在现场" : "可继续",
      value: running_count ? `${running_count} 个活动` : `${terminal_count + evidence_count} 条证据`,
      tone: running_count ? "warning" : "neutral",
      Icon: running_count ? Loader2 : Activity,
    },
  ];
}

export function collect_handoff_checklist({
  artifacts,
  events,
  evidence_count,
  has_error,
}: {
  artifacts: CompletionArtifact[];
  events: NexusOperationEvent[];
  evidence_count: number;
  has_error: boolean;
}): HandoffChecklistItem[] {
  const waiting_count = events.filter((item) => item.phase === "waiting").length;
  const running_count = events.filter((item) => item.phase === "running").length;
  const failed_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const completed_count = events.filter((item) => item.phase === "done").length;

  return [
    {
      label: failed_count ? "需要回看异常" : "工具轨迹已归档",
      value: failed_count ? `${failed_count} 个异常` : `${completed_count}/${events.length}`,
      tone: failed_count ? "warning" : "success",
      Icon: failed_count ? AlertTriangle : CheckCircle2,
    },
    {
      label: artifacts.length ? "关键产物可打开" : "未形成独立产物",
      value: artifacts.length ? `${artifacts.length} 项` : "仅上下文",
      tone: artifacts.length ? "success" : "neutral",
      Icon: artifacts[0]?.Icon ?? FileText,
    },
    {
      label: evidence_count ? "证据可追溯" : "证据来自现场窗口",
      value: evidence_count ? `${evidence_count} 条证据` : "窗口状态",
      tone: evidence_count ? "success" : "neutral",
      Icon: evidence_count ? ListChecks : Activity,
    },
    {
      label: waiting_count ? "等待用户确认" : running_count ? "仍有执行窗口" : "可以继续对话",
      value: waiting_count ? `${waiting_count} 个关卡` : running_count ? `${running_count} 个活动` : "就绪",
      tone: waiting_count || running_count || has_error ? "warning" : "neutral",
      Icon: waiting_count ? ShieldQuestion : running_count ? Loader2 : Activity,
    },
  ];
}

function evidence_type_label(type: OperationEvidence["type"]): string {
  if (type === "file" || type === "diff") {
    return "文件证据";
  }
  if (type === "terminal") {
    return "终端输出";
  }
  if (type === "url") {
    return "浏览器记录";
  }
  if (type === "artifact") {
    return "产物";
  }
  if (type === "error") {
    return "错误证据";
  }
  return "执行证据";
}

function icon_for_evidence_type(type: OperationEvidence["type"], value: string): LucideIcon {
  if (type === "terminal") {
    return Terminal;
  }
  if (type === "url") {
    return Globe2;
  }
  if (type === "error") {
    return AlertTriangle;
  }
  if (type === "permission") {
    return ShieldQuestion;
  }
  if (type === "task" || type === "status") {
    return Activity;
  }
  if (type === "file" || type === "diff" || type === "artifact") {
    return window_kind_for_artifact_path(value);
  }
  return CheckCircle2;
}

function window_kind_for_artifact_path(path: string): LucideIcon {
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

export function order_windows_for_reveal(
  windows: StageWindowState[],
  active_window_id: string | null,
): StageWindowState[] {
  return [...windows].sort((left, right) => {
    const left_rank = window_reveal_rank(left, active_window_id);
    const right_rank = window_reveal_rank(right, active_window_id);
    if (left_rank !== right_rank) {
      return left_rank - right_rank;
    }
    return right.z - left.z;
  });
}

function window_reveal_rank(window: StageWindowState, active_window_id: string | null): number {
  if (window.id === active_window_id || window.phase === "focused") {
    return 0;
  }
  if (window.kind === "terminal" || window.kind === "browser" || window.kind === "code_editor") {
    return 1;
  }
  if (window.kind === "runtime_handoff" || window.kind === "run_manifest") {
    return 1;
  }
  if (window.kind === "finder" || window.layout === "artifact") {
    return 2;
  }
  if (window.kind === "evidence" || window.kind === "permission_wait") {
    return 3;
  }
  return 2;
}

export function event_sequence_label(event: NexusOperationEvent, events: NexusOperationEvent[]): string {
  const index = events.findIndex((item) => item.id === event.id);
  if (index >= 0) {
    return `第 ${index + 1} 步`;
  }
  return "当前步";
}

export function useRevealedWindowCount({
  event_key,
  minimum_count,
  phase,
  window_count,
}: {
  event_key: string;
  minimum_count: number;
  phase: StageNarrativePhase;
  window_count: number;
}): number {
  const [revealed_count, set_revealed_count] = useState(window_count);

  useEffect(() => {
    if (window_count <= 0) {
      set_revealed_count(0);
      return;
    }
    if (phase === "completed" || phase === "settling") {
      set_revealed_count(window_count);
      return;
    }

    set_revealed_count(minimum_count);
    const hidden_count = Math.max(0, window_count - minimum_count);
    const timers = Array.from({ length: hidden_count }).map((_, index) => (
      window.setTimeout(() => {
        set_revealed_count((current) => Math.max(current, minimum_count + index + 1));
      }, 620 + index * 320)
    ));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [event_key, minimum_count, phase, window_count]);

  return Math.min(revealed_count, window_count);
}

export function minimum_revealed_window_count({
  event_count,
  phase,
  window_count,
}: {
  event_count: number;
  phase: StageNarrativePhase;
  window_count: number;
}): number {
  if (window_count <= 0) {
    return 0;
  }
  if (phase === "completed" || phase === "settling") {
    return window_count;
  }
  return Math.min(window_count, Math.max(1, event_count));
}

export function build_stage_narrative(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): StageNarrativeState {
  const events = collect_narrative_events(event, snapshot);
  const phase = derive_operation_stage_experience_phase(event, snapshot);
  if (phase === "awakening") {
    return {
      phase: "awakening",
      label: event.surface === "conversation" ? "运行接入" : "唤醒工作台",
      detail: event.surface === "conversation"
        ? "nexus 字符场正在接入运行时，等待第一个工具窗口显影"
        : "nexus 字符场正在展开为执行现场",
    };
  }
  if (event.phase === "waiting") {
    return {
      phase: "running",
      label: "等待确认",
      detail: "工具已暂停，等待用户确认后继续",
    };
  }
  if (phase === "running") {
    if (event.surface === "conversation") {
      return {
        phase: "running",
        label: "运行接入",
        detail: "运行时正在装载上下文，等待第一个工具事件",
      };
    }
    return {
      phase: "running",
      label: "现场执行",
      detail: `${events.length} 个工具动作正在形成工作台轨迹`,
    };
  }
  if (
    phase === "completed" ||
    (phase === "settling" && (event.phase === "done" || event.phase === "cancelled"))
  ) {
    return {
      phase,
      label: phase === "completed" ? "完成沉淀" : "结果落盘",
      detail: "工具窗口已收束为可回看的执行现场",
    };
  }
  return {
    phase: "settling",
    label: "异常回看",
    detail: "执行现场保留错误证据与上下文",
  };
}

export function collect_narrative_events(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationEvent[] {
  const events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [];
  const merged = events.some((item) => item.id === event.id) ? events : [...events, event];
  const sorted = [...merged].sort((left, right) => left.updated_at - right.updated_at);
  const active_index = sorted.findIndex((item) => item.id === event.id);
  if (active_index < 0) {
    return sorted.slice(-10);
  }
  return sorted.slice(0, active_index + 1).slice(-10);
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
    return "文件";
  }
  if (kind === "terminal") {
    return "终端";
  }
  if (kind === "browser") {
    return "浏览器";
  }
  if (kind === "task_board") {
    return "任务";
  }
  if (kind === "runtime_handoff") {
    return "运行接入";
  }
  if (kind === "run_manifest") {
    return "执行清单";
  }
  if (kind === "evidence") {
    return "证据";
  }
  if (kind === "permission_wait") {
    return "授权";
  }
  if (kind === "spreadsheet") {
    return "表格";
  }
  if (kind === "image_viewer") {
    return "图片";
  }
  if (kind === "code_editor") {
    return "编辑器";
  }
  if (kind === "markdown_reader" || kind === "word_reader" || kind === "pdf_reader") {
    return "阅读器";
  }
  return "工具";
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
