import { format_operation_time, safe_json_stringify } from "../operation-preview";
import type { NexusOperationEvent, OperationPhase } from "../operation-types";

export const TERMINAL_PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export interface TerminalEntry {
  id: string;
  command: string;
  duration_label: string;
  started_label: string;
  exit_label: string;
  exit_tone: "success" | "error" | "running" | "muted";
  phase: OperationPhase;
  stdout: string[];
  stderr: string[];
  other: string[];
  rows: TerminalTranscriptRow[];
}

export interface TerminalTranscriptRow {
  id: string;
  text: string;
  stream: "stdout" | "stderr" | "output" | "command" | "system" | "exit";
}

export function build_terminal_entries({
  command,
  event,
  fallback_lines,
  related_events,
}: {
  command: string;
  event: NexusOperationEvent;
  fallback_lines: string[];
  related_events: NexusOperationEvent[];
}): TerminalEntry[] {
  const terminal_events = related_events.length ? related_events : [event];
  const entries = terminal_events.map((item, index) => {
    const resolved_command = read_terminal_command(item, command, fallback_lines) || `command-${index + 1}`;
    const streams = extract_terminal_streams(item.result_preview);
    const fallback_output = fallback_lines
      .filter((line) => !terminal_line_matches_command(line, resolved_command))
      .slice(0, 24);
    const other = streams.other.length || streams.stdout.length || streams.stderr.length
      ? streams.other
      : item.summary
        ? split_terminal_text(item.summary).slice(0, 8)
        : fallback_output;
    const exit_code = read_exit_code(item.result_preview);
    const duration_label = format_terminal_duration(item);
    const exit_tone = terminal_exit_tone(item, exit_code);
    const exit_label = terminal_exit_label(item, exit_code);
    const rows = build_terminal_transcript_rows({
      command: resolved_command,
      duration_label,
      exit_label,
      exit_tone,
      id: item.id,
      phase: item.phase,
      started_label: format_operation_time(item.started_at ?? item.updated_at),
      streams,
      fallback_other: other,
    });
    return {
      id: item.id,
      command: resolved_command,
      duration_label,
      started_label: format_operation_time(item.started_at ?? item.updated_at),
      exit_label,
      exit_tone,
      phase: item.phase,
      stdout: streams.stdout,
      stderr: streams.stderr,
      other,
      rows,
    };
  });

  return entries.length ? entries : [{
    id: event.id,
    command: command.trim() || event.target || event.title,
    duration_label: format_terminal_duration(event),
    started_label: format_operation_time(event.started_at ?? event.updated_at),
    exit_label: event.phase === "running" ? "运行中" : "无输出",
    exit_tone: event.phase === "running" ? "running" : "muted",
    phase: event.phase,
    stdout: [],
    stderr: [],
    other: fallback_lines,
    rows: build_terminal_transcript_rows({
      command: command.trim() || event.target || event.title,
      duration_label: format_terminal_duration(event),
      exit_label: event.phase === "running" ? "运行中" : "无输出",
      exit_tone: event.phase === "running" ? "running" : "muted",
      id: event.id,
      phase: event.phase,
      started_label: format_operation_time(event.started_at ?? event.updated_at),
      streams: empty_terminal_streams(),
      fallback_other: fallback_lines,
    }),
  }];
}

export function read_terminal_command(event: NexusOperationEvent, fallback_command: string, fallback_lines: string[]): string {
  return extract_terminal_input_string(event.input_preview, ["command", "cmd", "description"])
    ?? event.target
    ?? fallback_command.trim()
    ?? strip_terminal_prompt(fallback_lines[0] ?? "")
    ?? event.title;
}

export function terminal_shell_title(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return "zsh";
  }
  const first_token = trimmed.split(/\s+/)[0] ?? "zsh";
  return `zsh — ${first_token}`;
}

export function terminal_cwd_label(event: NexusOperationEvent): string {
  const command = read_terminal_command(event, "", []);
  const cwd = extract_terminal_input_string(event.input_preview, ["cwd", "working_directory", "workdir"]);
  if (cwd) {
    return compact_terminal_path(cwd);
  }
  if (command.includes("pnpm --dir web") || command.includes("cd web")) {
    return "~/workspace/web";
  }
  return "~/workspace";
}

function build_terminal_transcript_rows({
  command,
  duration_label,
  exit_label,
  exit_tone,
  id,
  phase,
  started_label,
  streams,
  fallback_other,
}: {
  command: string;
  duration_label: string;
  exit_label: string;
  exit_tone: TerminalEntry["exit_tone"];
  id: string;
  phase: OperationPhase;
  started_label: string;
  streams: TerminalStreams;
  fallback_other: string[];
}): TerminalTranscriptRow[] {
  const output_rows = streams.rows.length
    ? streams.rows
    : fallback_other.map((text, index) => ({
      id: `${id}:fallback:${index}`,
      stream: "output" as const,
      text,
    }));
  return [
    {
      id: `${id}:system:start`,
      stream: "system",
      text: `Last login: ${started_label} on nexus-session`,
    },
    {
      id: `${id}:command`,
      stream: "command",
      text: command,
    },
    ...output_rows,
    {
      id: `${id}:exit`,
      stream: "exit",
      text: `${exit_label} · ${duration_label}${phase === "running" ? " · process attached" : exit_tone === "error" ? " · command failed" : ""}`,
    },
  ];
}

interface TerminalStreams {
  stdout: string[];
  stderr: string[];
  other: string[];
  rows: TerminalTranscriptRow[];
}

function extract_terminal_streams(value: unknown): TerminalStreams {
  if (value == null) {
    return empty_terminal_streams();
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const other = split_terminal_text(String(value)).slice(0, 24);
    return {
      stdout: [],
      stderr: [],
      other,
      rows: terminal_rows_from_lines("result", "output", other),
    };
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => extract_terminal_streams(item));
    const stdout = parts.flatMap((item) => item.stdout).slice(0, 24);
    const stderr = parts.flatMap((item) => item.stderr).slice(0, 24);
    const other = parts.flatMap((item) => item.other).slice(0, 24);
    return {
      stdout,
      stderr,
      other,
      rows: parts.flatMap((item) => item.rows).slice(0, 48),
    };
  }
  if (typeof value !== "object") {
    return {
      stdout: [],
      stderr: [],
      other: [String(value)],
      rows: terminal_rows_from_lines("result", "output", [String(value)]),
    };
  }

  const record = value as Record<string, unknown>;
  const stdout = extract_terminal_text_fields(record, ["stdout", "out"]);
  const stderr = extract_terminal_text_fields(record, ["stderr", "err", "error"]);
  const content_lines = extract_terminal_text_fields(record, ["content"]);
  const content_is_error = record.is_error === true || record.subtype === "error";
  const other_lines = extract_terminal_text_fields(record, ["output", "text", "result", "message"]);
  if (stdout.length || stderr.length || other_lines.length) {
    const stdout_rows = terminal_rows_from_lines("stdout", "stdout", [...stdout, ...(content_is_error ? [] : content_lines)].slice(0, 24));
    const stderr_rows = terminal_rows_from_lines("stderr", "stderr", [...stderr, ...(content_is_error ? content_lines : [])].slice(0, 24));
    const other_rows = terminal_rows_from_lines("other", "output", other_lines.slice(0, 24));
    return {
      stdout: stdout_rows.map((row) => row.text),
      stderr: stderr_rows.map((row) => row.text),
      other: other_lines.slice(0, 24),
      rows: [...stdout_rows, ...stderr_rows, ...other_rows].slice(0, 48),
    };
  }
  if (content_lines.length) {
    const stream = content_is_error ? "stderr" : "stdout";
    const rows = terminal_rows_from_lines("content", stream, content_lines.slice(0, 24));
    return {
      stdout: content_is_error ? [] : rows.map((row) => row.text),
      stderr: content_is_error ? rows.map((row) => row.text) : [],
      other: [],
      rows,
    };
  }
  const serialized_other = split_terminal_text(safe_json_stringify(value)).slice(0, 24);
  return {
    stdout: [],
    stderr: [],
    other: serialized_other,
    rows: terminal_rows_from_lines("json", "output", serialized_other),
  };
}

function empty_terminal_streams(): TerminalStreams {
  return { stdout: [], stderr: [], other: [], rows: [] };
}

function terminal_rows_from_lines(
  prefix: string,
  stream: TerminalTranscriptRow["stream"],
  lines: string[],
): TerminalTranscriptRow[] {
  return lines.map((text, index) => ({
    id: `${prefix}:${index}:${text.slice(0, 16)}`,
    stream,
    text,
  }));
}

function extract_terminal_text_fields(record: Record<string, unknown>, keys: string[]): string[] {
  return keys.flatMap((key) => extract_terminal_text(record[key]));
}

function extract_terminal_text(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return split_terminal_text(String(value));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extract_terminal_text(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extract_terminal_text(record.text ?? record.content ?? record.value);
  }
  return [String(value)];
}

function read_exit_code(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const raw = record.exit_code
    ?? record.exitCode
    ?? record.exit_status
    ?? record.exitStatus
    ?? record.return_code
    ?? record.returnCode
    ?? record.error_code
    ?? record.errorCode
    ?? record.code
    ?? record.status;
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
    return Number(raw);
  }
  if (record.is_error === false) {
    return 0;
  }
  return null;
}

function terminal_exit_tone(event: NexusOperationEvent, exit_code: number | null): TerminalEntry["exit_tone"] {
  if (event.phase === "running") {
    return "running";
  }
  if (event.phase === "error" || (exit_code != null && exit_code !== 0)) {
    return "error";
  }
  if (event.phase === "done" || exit_code === 0) {
    return "success";
  }
  return "muted";
}

function terminal_exit_label(event: NexusOperationEvent, exit_code: number | null): string {
  if (event.phase === "running") {
    return "运行中";
  }
  if (event.phase === "error") {
    return exit_code == null ? "执行失败" : `退出 ${exit_code}`;
  }
  if (event.phase === "cancelled") {
    return "已中断";
  }
  if (exit_code != null) {
    return `退出 ${exit_code}`;
  }
  return event.phase === "done" ? "退出 0" : TERMINAL_PHASE_LABEL[event.phase];
}

function format_terminal_duration(event: NexusOperationEvent): string {
  const started_at = normalize_terminal_timestamp(event.started_at ?? event.updated_at);
  const ended_at = normalize_terminal_timestamp(event.ended_at ?? event.updated_at);
  const ms = Math.max(0, ended_at - started_at);
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function normalize_terminal_timestamp(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

function terminal_line_matches_command(line: string, command: string): boolean {
  return line.replace(/^\s*[$>]\s?/, "").trim() === command.trim();
}

function strip_terminal_prompt(line: string): string {
  return line.replace(/^\s*[$>]\s?/, "").trim();
}

function compact_terminal_path(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "~/workspace";
  }
  const workspace_index = trimmed.lastIndexOf("/workspace/");
  if (workspace_index >= 0) {
    return `~${trimmed.slice(workspace_index)}`;
  }
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length <= 2) {
    return trimmed;
  }
  return `.../${parts.slice(-2).join("/")}`;
}

function split_terminal_text(value: string): string[] {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) {
    return [];
  }
  const lines = normalized.split("\n").map((line) => line.trimEnd());
  while (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function extract_terminal_input_string(
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
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }
  return null;
}
