import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FolderTree,
  Globe2,
  ListChecks,
  Loader2,
  ShieldQuestion,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { StageWindowState } from "../operation-desktop-types";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "../operation-types";
import type {
  ArchiveCapsuleItem,
  CompletionArtifact,
  HandoffChecklistItem,
  HandoffItem,
  StageNarrativeState,
} from "./operation-stage-model";
import {
  icon_for_artifact_path,
  icon_for_operation_kind,
} from "./operation-stage-window-meta";

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
      Icon: icon_for_artifact_path(item.path),
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
    return icon_for_artifact_path(value);
  }
  return CheckCircle2;
}
