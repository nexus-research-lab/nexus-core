import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "./operation-types";
import type {
  OperationDesktopState,
  StageHandoffSummary,
  StageWindowKind,
  StageWindowLayout,
  StageWindowPayload,
  StageWindowPhase,
  StageWindowState,
} from "./operation-desktop-types";
import {
  collect_operation_file_context,
  window_kind_for_file_target,
} from "./operation-file-documents";
import { find_operation_html_artifact } from "./operation-html-artifacts";
import { build_operation_continuation_brief } from "./operation-stage-experience";
import {
  basename,
  collect_round_events,
  looks_like_url,
  normalize_window_id,
  preview_lines,
  read_input_string,
} from "./operation-scene-planner-helpers";
import {
  build_operation_terminal_lines,
  read_terminal_command,
} from "./operation-terminal-lines";

interface PlanOperationDesktopParams {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
}

export function plan_operation_desktop({
  event,
  snapshot,
}: PlanOperationDesktopParams): OperationDesktopState {
  const windows = build_windows(event, snapshot);
  const active_window = windows.find((window) => window.phase === "focused") ?? windows[0] ?? null;

  return {
    active_window_id: active_window?.id ?? null,
    surface: event.surface,
    phase: event.phase,
    windows,
    minimized: windows.filter((window) => window.phase === "minimized"),
    artifacts: windows.filter((window) => window.layout === "artifact"),
  };
}

export function resolve_operation_event_window_id(
  event: NexusOperationEvent,
  windows: StageWindowState[],
): string | null {
  const related_windows = windows.filter((window) => (
    window.payload.event.id === event.id ||
    window.payload.related_events?.some((item) => item.id === event.id)
  ));
  const preferred_kind = preferred_window_kind_for_event(event);
  const preferred_window = related_windows.find((window) => preferred_kind.includes(window.kind));
  if (preferred_window) {
    return preferred_window.id;
  }

  const exact_event_window = related_windows.find((window) => window.payload.event.id === event.id);
  if (exact_event_window) {
    return exact_event_window.id;
  }

  const target_window = event.target
    ? related_windows.find((window) => (
      window.target === event.target ||
      window.payload.target === event.target ||
      window.title === event.target
    ))
    : null;
  if (target_window) {
    return target_window.id;
  }

  const related_non_inspector = related_windows.find((window) => (
    window.kind !== "evidence" && window.kind !== "summary"
  ));
  if (related_non_inspector) {
    return related_non_inspector.id;
  }

  return related_windows[0]?.id ?? null;
}

function build_windows(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): StageWindowState[] {
  const round_events = collect_round_events(event, snapshot);
  const terminal_events = round_events.filter((item) => item.surface === "terminal");
  const web_events = round_events.filter((item) => item.surface === "web");
  const task_events = round_events.filter((item) => item.surface === "task");
  const file_context = collect_operation_file_context(event, snapshot, round_events);
  const html_artifact = find_operation_html_artifact(snapshot, round_events);
  const focus_target = resolve_focus_target(event, {
    has_file: Boolean(file_context.latest_file_target),
    has_html_artifact: Boolean(html_artifact),
    has_task: task_events.length > 0,
    has_terminal: terminal_events.length > 0,
    has_web: web_events.length > 0,
  });
  const windows: StageWindowState[] = [];

  if (
    file_context.workspace_items.length > 0 ||
    file_context.file_documents.length > 0 ||
    file_context.latest_file_target
  ) {
    windows.push(window_state(file_context.latest_file_event ?? event, snapshot, {
      id: "finder",
      kind: "finder",
      title: "工作区",
      layout: "secondary",
      phase: focus_target === "finder" ? "focused" : "background",
      z: focus_target === "finder" ? 34 : 14,
      payload: {
        workspace_items: file_context.workspace_items,
        related_events: round_events,
        target: file_context.latest_file_target ?? event.target,
        preview: event.input_preview ?? event.result_preview,
      },
    }));
  }

  file_context.file_documents.forEach((document, index) => {
    const is_focused_document = focus_target === "document" && (
      document.target === file_context.latest_file_target ||
      document.event.id === event.id
    );
    const document_kind = window_kind_for_file_target(
      document.target,
      document.event.surface === "workspace" ? "generic_tool" : "code_editor",
    );
    windows.push(window_state(document.event, snapshot, {
      id: `document:${normalize_window_id(document.target)}`,
      kind: document_kind,
      title: document.target,
      layout: "primary",
      phase: is_focused_document ? "focused" : "background",
      z: is_focused_document ? 36 : 20 - index,
      payload: {
        diff_stats: document.workspace_item?.diff_stats ?? null,
        preview: document.preview,
        related_events: document.related_events,
        summary: document.event.summary ?? event.summary,
        target: document.target,
      },
    }));
  });

  if (terminal_events.length > 0) {
    const terminal_event = terminal_events.at(-1) ?? event;
    const terminal_lines = build_operation_terminal_lines(terminal_events);
    windows.push(window_state(terminal_event, snapshot, {
      id: "terminal",
      kind: "terminal",
      title: terminal_event.target ?? "终端",
      layout: "terminal",
      phase: focus_target === "terminal" ? "focused" : "background",
      z: focus_target === "terminal" ? 36 : 18,
      payload: {
        command: read_terminal_command(terminal_event),
        lines: terminal_lines,
        related_events: terminal_events,
      },
    }));
  }

  if (web_events.length > 0 || html_artifact) {
    const web_event = web_events.at(-1) ?? event;
    const query = html_artifact
      ? basename(html_artifact.path)
      : read_input_string(web_event.input_preview, ["url", "query", "prompt"]) ?? web_event.target ?? "web";
    const lines = preview_lines(web_event.result_preview ?? web_event.summary, 8);
    windows.push(window_state(web_event, snapshot, {
      id: html_artifact ? `browser:${normalize_window_id(html_artifact.path)}` : "browser",
      kind: "browser",
      title: html_artifact ? basename(html_artifact.path) : query,
      layout: "primary",
      phase: focus_target === "browser" ? "focused" : "background",
      z: focus_target === "browser" ? 38 : 22,
      payload: {
        lines,
        preview: web_event.result_preview ?? web_event.summary,
        query,
        related_events: web_events,
        srcdoc: html_artifact?.live_content ?? null,
        target: html_artifact?.path ?? web_event.target,
        url: looks_like_url(query) ? query : null,
      },
    }));
  }

  if (event.surface === "knowledge") {
    windows.push(window_state(event, snapshot, {
      id: `knowledge:${normalize_window_id(event.target ?? event.tool_name ?? event.title)}`,
      kind: "markdown_reader",
      title: event.target ?? event.tool_name ?? event.title,
      layout: "primary",
      phase: focus_target === "document" ? "focused" : "background",
      z: focus_target === "document" ? 36 : 20,
      payload: {
        preview: event.result_preview ?? event.input_preview ?? event.summary,
        related_events: round_events,
        summary: event.summary,
        target: event.target ?? event.tool_name,
      },
    }));
  }

  if (task_events.length > 0) {
    const task_event = task_events.at(-1) ?? event;
    windows.push(window_state(task_event, snapshot, {
      id: "task-board",
      kind: "task_board",
      title: task_event.target ?? task_event.tool_name ?? "Task",
      layout: "primary",
      phase: focus_target === "task" ? "focused" : "background",
      z: focus_target === "task" ? 36 : 17,
      payload: {
        lines: preview_lines(task_event.result_preview ?? task_event.input_preview ?? task_event.summary, 8),
        related_events: task_events,
      },
    }));
  }

  if (event.phase === "waiting") {
    windows.push(window_state(event, snapshot, {
      id: "permission-checkpoint",
      kind: "permission_wait",
      title: event.title || "权限确认",
      layout: "artifact",
      phase: "focused",
      z: 44,
      payload: {
        evidence: [
          ...(event.evidence ?? []),
          ...(snapshot?.recent_evidence ?? []),
        ].slice(0, 6),
        preview: event.input_preview ?? event.summary ?? event.target,
        related_events: round_events,
        summary: event.summary,
        target: "permission-checkpoint.md",
      },
    }));
  } else if (event.surface === "conversation" && event.phase === "running") {
    windows.push(window_state(event, snapshot, {
      id: "runtime-handoff",
      kind: "runtime_handoff",
      title: event.title,
      layout: "primary",
      phase: focus_target === "summary" ? "focused" : "background",
      z: focus_target === "summary" ? 36 : 18,
      payload: {
        preview: event.input_preview ?? event.summary ?? event.target,
        related_events: round_events,
        summary: event.summary,
        target: "runtime-handoff.md",
      },
    }));
  } else if (event.surface === "summary" || event.surface === "fallback" || event.surface === "conversation") {
    if (event.kind === "round_summary" || event.phase === "done" || event.phase === "error" || event.phase === "cancelled") {
      windows.push(window_state(event, snapshot, {
        id: "run-manifest",
        kind: "run_manifest",
        title: event.phase === "error" ? "执行清单 · 回看" : "执行清单",
        layout: "primary",
        phase: focus_target === "manifest" ? "focused" : "background",
        z: focus_target === "manifest" ? 42 : 24,
        payload: {
          evidence: [
            ...(event.evidence ?? []),
            ...(snapshot?.recent_evidence ?? []),
          ].slice(0, 8),
          preview: event.result_preview ?? event.summary ?? event.target,
          related_events: round_events,
          summary: event.summary,
          target: "run-manifest.md",
          handoff_summary: build_handoff_summary(event, round_events, snapshot),
        },
      }));
    }
    windows.push(window_state(event, snapshot, {
      id: "summary",
      kind: "summary",
      title: event.title,
      layout: "artifact",
      phase: focus_target === "summary" ? "focused" : "background",
      z: focus_target === "summary" ? 36 : 12,
      payload: {
        preview: event.result_preview ?? event.summary ?? event.target,
        related_events: round_events,
        summary: event.summary,
        target: "run-summary.md",
      },
    }));
  }

  if (event.phase !== "waiting") {
    windows.push(evidence_window(event, snapshot, 16));
  }

  if (windows.length === 1) {
    windows.unshift(window_state(event, snapshot, {
      id: "summary",
      kind: "summary",
      title: event.title,
      layout: "primary",
      phase: "focused",
      z: 30,
      payload: {
        preview: event.result_preview ?? event.input_preview ?? event.summary ?? event.target,
        related_events: round_events,
        summary: event.summary,
        target: "operation.md",
      },
    }));
  }

  return windows;
}

function window_state(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
  config: {
    id: string;
    kind: StageWindowKind;
    title: string;
    layout: StageWindowLayout;
    phase: StageWindowPhase;
    z: number;
    payload?: Partial<StageWindowPayload>;
  },
): StageWindowState {
  return {
    id: `${event.id}:${config.id}`,
    kind: config.kind,
    title: config.title,
    subtitle: event.summary ?? null,
    target: config.payload?.target ?? event.target ?? null,
    phase: config.phase,
    z: config.z,
    layout: config.layout,
    payload: {
      event,
      snapshot,
      summary: event.summary,
      target: event.target,
      ...config.payload,
    },
  };
}

function evidence_window(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
  z: number,
): StageWindowState {
  const evidence: OperationEvidence[] = [
    ...(event.evidence ?? []),
    ...(snapshot?.recent_evidence ?? []),
  ].slice(0, 5);
  return window_state(event, snapshot, {
    id: "evidence",
    kind: event.phase === "waiting" ? "permission_wait" : "evidence",
    title: event.phase === "waiting" ? "等待确认" : "证据",
    layout: "inspector",
    phase: event.phase === "done" ? "minimized" : "background",
    z,
    payload: {
      evidence,
      summary: event.summary,
    },
  });
}

function build_handoff_summary(
  event: NexusOperationEvent,
  events: NexusOperationEvent[],
  snapshot: NexusOperationSnapshot | null,
): StageHandoffSummary {
  return build_operation_continuation_brief(event, events, snapshot);
}

function resolve_focus_target(
  event: NexusOperationEvent,
  context: {
    has_file: boolean;
    has_html_artifact: boolean;
    has_task: boolean;
    has_terminal: boolean;
    has_web: boolean;
  },
): "browser" | "document" | "finder" | "manifest" | "summary" | "task" | "terminal" {
  if (event.phase === "waiting" || event.surface === "conversation") {
    return "summary";
  }
  if (event.kind === "round_summary" || (
    event.surface === "summary" &&
    (event.phase === "done" || event.phase === "error" || event.phase === "cancelled")
  )) {
    return "manifest";
  }
  if (event.surface === "task" && context.has_task) {
    return "task";
  }
  if (event.surface === "knowledge") {
    return "document";
  }
  if (event.surface === "terminal" && context.has_terminal) {
    return "terminal";
  }
  if (event.surface === "web" || (context.has_html_artifact && event.surface === "summary")) {
    return "browser";
  }
  if ((event.surface === "workspace" || event.surface === "editor") && context.has_file) {
    if (
      event.kind === "workspace_read" ||
      event.kind === "workspace_edit" ||
      event.kind === "artifact_update" ||
      event.surface === "editor"
    ) {
      return "document";
    }
    return "finder";
  }
  if (context.has_html_artifact) {
    return "browser";
  }
  if (context.has_file) {
    return "document";
  }
  return "summary";
}

function preferred_window_kind_for_event(event: NexusOperationEvent): StageWindowKind[] {
  if (event.surface === "terminal") {
    return ["terminal"];
  }
  if (event.surface === "web") {
    return ["browser"];
  }
  if (event.surface === "task") {
    return ["task_board"];
  }
  if (event.surface === "conversation") {
    return ["runtime_handoff"];
  }
  if (event.surface === "summary" || event.kind === "round_summary") {
    return ["run_manifest", "summary"];
  }
  if (event.surface === "workspace") {
    if (
      event.kind === "workspace_read" ||
      event.kind === "workspace_edit" ||
      event.kind === "artifact_update"
    ) {
      return ["code_editor", "markdown_reader", "word_reader", "pdf_reader", "spreadsheet", "image_viewer", "generic_tool", "finder"];
    }
    return ["finder", "code_editor", "markdown_reader", "word_reader", "pdf_reader", "spreadsheet", "image_viewer"];
  }
  if (event.surface === "editor" || event.surface === "knowledge") {
    return ["code_editor", "markdown_reader", "word_reader", "pdf_reader", "spreadsheet", "image_viewer"];
  }
  return ["generic_tool", "summary"];
}
