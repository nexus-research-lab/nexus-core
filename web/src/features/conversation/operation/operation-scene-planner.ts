import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
  OperationEvidence,
} from "./operation-types";
import type {
  OperationDesktopState,
  StageWindowKind,
  StageWindowLayout,
  StageWindowPayload,
  StageWindowPhase,
  StageWindowState,
} from "./operation-desktop-types";

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

function build_windows(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): StageWindowState[] {
  const round_events = collect_round_events(event, snapshot);
  const workspace_items = snapshot?.workspace_events.slice(0, 8) ?? [];
  const terminal_events = round_events.filter((item) => item.surface === "terminal");
  const web_events = round_events.filter((item) => item.surface === "web");
  const task_events = round_events.filter((item) => item.surface === "task");
  const file_events = round_events.filter((item) => (
    item.surface === "workspace" || item.surface === "editor"
  ));
  const latest_workspace_item = find_latest_workspace_item(event, snapshot);
  const latest_file_event = file_events.at(-1);
  const latest_file_target = latest_workspace_item?.path ?? latest_file_event?.target ?? (
    event.surface === "workspace" || event.surface === "editor" ? event.target : null
  );
  const latest_file_preview = latest_workspace_item?.live_content
    ?? latest_file_event?.result_preview
    ?? latest_file_event?.input_preview
    ?? latest_file_event?.summary
    ?? null;
  const html_artifact = find_html_artifact(snapshot, round_events);
  const focus_target = resolve_focus_target(event, {
    has_file: Boolean(latest_file_target),
    has_html_artifact: Boolean(html_artifact),
    has_task: task_events.length > 0,
    has_terminal: terminal_events.length > 0,
    has_web: web_events.length > 0,
  });
  const windows: StageWindowState[] = [];

  if (workspace_items.length > 0 || file_events.length > 0 || latest_file_target) {
    windows.push(window_state(latest_file_event ?? event, snapshot, {
      id: "finder",
      kind: "finder",
      title: "Workspace",
      layout: "secondary",
      phase: focus_target === "finder" ? "focused" : "background",
      z: focus_target === "finder" ? 34 : 14,
      payload: {
        workspace_items,
        related_events: round_events,
        target: latest_file_target ?? event.target,
        preview: event.input_preview ?? event.result_preview,
      },
    }));
  }

  if (latest_file_target) {
    const document_kind = window_kind_for_target(
      latest_file_target,
      latest_file_event?.surface === "workspace" ? "generic_tool" : "code_editor",
    );
    windows.push(window_state(latest_file_event ?? event, snapshot, {
      id: `document:${normalize_window_id(latest_file_target)}`,
      kind: document_kind,
      title: latest_file_target,
      layout: "primary",
      phase: focus_target === "document" ? "focused" : "background",
      z: focus_target === "document" ? 36 : 20,
      payload: {
        diff_stats: latest_workspace_item?.diff_stats ?? null,
        preview: latest_file_preview,
        related_events: round_events,
        summary: latest_file_event?.summary ?? event.summary,
        target: latest_file_target,
      },
    }));
  }

  if (terminal_events.length > 0) {
    const terminal_lines = build_terminal_lines(terminal_events);
    windows.push(window_state(event, snapshot, {
      id: "terminal",
      kind: "terminal",
      title: terminal_events.at(-1)?.target ?? "Terminal",
      layout: "terminal",
      phase: focus_target === "terminal" ? "focused" : "background",
      z: focus_target === "terminal" ? 36 : 18,
      payload: {
        command: read_input_string(terminal_events.at(-1)?.input_preview, ["command", "description"])
          ?? terminal_events.at(-1)?.target
          ?? "",
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

  if (event.surface === "summary" || event.surface === "fallback" || event.surface === "conversation") {
    windows.push(window_state(event, snapshot, {
      id: event.phase === "waiting" ? "permission" : "summary",
      kind: event.phase === "waiting" ? "permission_wait" : "summary",
      title: event.title,
      layout: "artifact",
      phase: focus_target === "summary" ? "focused" : "background",
      z: focus_target === "summary" ? 36 : 12,
      payload: {
        preview: event.result_preview ?? event.summary ?? event.target,
        related_events: round_events,
        summary: event.summary,
        target: event.phase === "waiting" ? "permission.md" : "run-summary.md",
      },
    }));
  }

  windows.push(evidence_window(event, snapshot, 16));

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
    title: event.phase === "waiting" ? "Waiting" : "Evidence",
    layout: "inspector",
    phase: event.phase === "done" ? "minimized" : "background",
    z,
    payload: {
      evidence,
      summary: event.summary,
    },
  });
}

function collect_round_events(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
): NexusOperationEvent[] {
  const events = snapshot?.events.filter((item) => item.round_id === event.round_id) ?? [];
  const merged = events.some((item) => item.id === event.id) ? events : [...events, event];
  const sorted = merged
    .sort((left, right) => left.updated_at - right.updated_at)
    .slice(-12);
  const active_index = sorted.findIndex((item) => item.id === event.id);
  if (active_index < 0) {
    return sorted;
  }
  return sorted.slice(0, active_index + 1);
}

function find_latest_workspace_item(
  event: NexusOperationEvent,
  snapshot: NexusOperationSnapshot | null,
) {
  if (!snapshot?.workspace_events.length) {
    return null;
  }
  const target_item = event.target
    ? snapshot.workspace_events.find((item) => item.path === event.target)
    : null;
  return target_item ?? snapshot.workspace_events[0] ?? null;
}

function find_html_artifact(
  snapshot: NexusOperationSnapshot | null,
  events: NexusOperationEvent[],
): { path: string; live_content: string | null } | null {
  const html_targets = new Set<string>();
  let candidate_path: string | null = null;
  for (const event of [...events].reverse()) {
    if (!event.target || !/\.(html?|xhtml)$/i.test(event.target)) {
      continue;
    }
    html_targets.add(event.target);
    candidate_path ??= event.target;
    const content = read_input_string(event.input_preview, ["content", "text", "body"])
      ?? (typeof event.result_preview === "string" && /<html|<!doctype|<script/i.test(event.result_preview)
        ? event.result_preview
        : null);
    if (content) {
      return {
        path: event.target,
        live_content: content,
      };
    }
  }

  const workspace_artifact = snapshot?.workspace_events.find((item) => (
    html_targets.has(item.path) &&
    /\.(html?|xhtml)$/i.test(item.path)
  ));
  if (workspace_artifact) {
    return {
      path: workspace_artifact.path,
      live_content: workspace_artifact.live_content ?? null,
    };
  }

  if (candidate_path) {
    return {
      path: candidate_path,
      live_content: null,
    };
  }

  return null;
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
): "browser" | "document" | "finder" | "summary" | "task" | "terminal" {
  if (event.phase === "waiting" || event.surface === "conversation") {
    return "summary";
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
    return event.surface === "workspace" ? "finder" : "document";
  }
  if (context.has_html_artifact) {
    return "browser";
  }
  if (context.has_file) {
    return "document";
  }
  return "summary";
}

function build_terminal_lines(events: NexusOperationEvent[]): string[] {
  return events.flatMap((event) => {
    const command = read_input_string(event.input_preview, ["command", "description"]) ?? event.target ?? event.tool_name ?? "command";
    const result_lines = terminal_result_lines(event).filter((line) => !terminal_line_matches_command(line, command));
    return [
      `$ ${command}`,
      ...result_lines,
    ];
  }).slice(-80);
}

function terminal_result_lines(event: NexusOperationEvent): string[] {
  const result_lines = extract_terminal_lines(event.result_preview).slice(0, 24);
  if (result_lines.length > 0) {
    return result_lines;
  }
  if (event.summary) {
    return split_terminal_text(event.summary).slice(0, 8);
  }
  if (event.phase === "running") {
    return ["waiting for output..."];
  }
  return [];
}

function extract_terminal_lines(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string") {
    return split_terminal_text(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extract_terminal_lines(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred_keys = ["stdout", "stderr", "output", "text", "content", "result", "message", "error"] as const;
    const lines = preferred_keys.flatMap((key) => extract_terminal_lines(record[key]));
    if (lines.length > 0) {
      return lines;
    }
    return split_terminal_text(safe_json_stringify(value));
  }
  return [String(value)];
}

function split_terminal_text(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) {
    return [];
  }
  return normalized.split("\n").map((line) => line.trimEnd());
}

function terminal_line_matches_command(line: string, command: string): boolean {
  return line.replace(/^\s*[$>]\s?/, "").trim() === command.trim();
}

function normalize_window_id(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
}

function basename(value?: string | null): string {
  if (!value) {
    return "preview";
  }
  return value.split("/").filter(Boolean).at(-1) ?? value;
}

function looks_like_url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function window_kind_for_target(
  target?: string | null,
  fallback: StageWindowKind = "code_editor",
): StageWindowKind {
  if (!target) {
    return fallback;
  }
  const normalized = target.toLowerCase().split("?")[0] ?? "";
  const extension = normalized.includes(".")
    ? normalized.slice(normalized.lastIndexOf(".") + 1)
    : "";
  if (["md", "mdx", "markdown"].includes(extension)) {
    return "markdown_reader";
  }
  if (["doc", "docx", "rtf", "odt"].includes(extension)) {
    return "word_reader";
  }
  if (extension === "pdf") {
    return "pdf_reader";
  }
  if (["csv", "tsv", "xls", "xlsx"].includes(extension)) {
    return "spreadsheet";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image_viewer";
  }
  return fallback;
}

function preview_lines(value: unknown, max_lines: number): string[] {
  if (value == null) {
    return [];
  }
  const text = typeof value === "string" ? value : safe_json_stringify(value);
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, max_lines);
}

function read_input_string(
  input: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!input) {
    return null;
  }
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function safe_json_stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
