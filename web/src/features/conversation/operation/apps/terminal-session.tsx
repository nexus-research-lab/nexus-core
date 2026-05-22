import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import { format_operation_time, safe_json_stringify } from "../operation-preview";
import type { NexusOperationEvent, OperationPhase } from "../operation-types";

const PHASE_LABEL: Record<OperationPhase, string> = {
  queued: "排队中",
  running: "执行中",
  waiting: "等待确认",
  done: "已完成",
  error: "失败",
  cancelled: "已中断",
};

export function TerminalSession({
  command,
  event,
  lines,
  related_events,
}: {
  command: string;
  event: NexusOperationEvent;
  lines: string[];
  related_events: NexusOperationEvent[];
}) {
  const entries = build_terminal_entries({
    command,
    event,
    fallback_lines: lines,
    related_events,
  });
  const has_running_entry = entries.some((entry) => entry.phase === "running");
  const session_label = event.agent_id ? `${event.agent_id.slice(0, 6)}@nexus` : "agent@nexus";
  const cwd_label = terminal_cwd_label(event);
  const shell_title = terminal_shell_title(entries[0]?.command ?? command);

  return (
    <div className="flex h-full min-h-[240px] min-w-0 flex-col overflow-hidden bg-[#080d12] font-mono text-[11px] leading-5 text-[#d9ffe5]">
      <div className="flex min-h-0 items-center justify-between gap-3 border-b border-white/10 bg-[#111922] px-3 py-2 text-[10px] text-[#88a19a]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 pr-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#17232c] text-[#8de0ad]">
            {has_running_entry ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          </span>
          <span className="truncate text-[#c8d8d1]">{shell_title}</span>
          <span className="hidden text-[#536873] sm:inline">{session_label}</span>
          <span className="hidden text-[#536873] sm:inline">{cwd_label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <TerminalStatusPill event={event} />
          <span>{format_operation_time(event.updated_at)}</span>
        </div>
      </div>
      <div className="soft-scrollbar min-h-0 flex-1 overflow-auto px-4 py-3">
        {entries.map((entry, entry_index) => (
          <div className={entry_index > 0 ? "mt-4 border-t border-white/8 pt-3" : undefined} key={entry.id}>
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-[10px] text-[#60757f]">
              <span className="truncate">
                pid {entry.pid_label} · proc {entry_index + 1}
              </span>
              <span className="shrink-0">{entry.started_label} · {entry.duration_label}</span>
            </div>
            <TerminalCommandLine command={entry.command} cwd_label={cwd_label} session_label={session_label} />
            {entry.stdout.length || entry.stderr.length || entry.other.length ? (
              <div className="mt-1.5 space-y-0.5">
                {entry.stdout.map((line, index) => (
                  <TerminalOutputLine key={`stdout:${index}:${line}`} line={line} line_number={index + 1} stream="stdout" />
                ))}
                {entry.stderr.map((line, index) => (
                  <TerminalOutputLine key={`stderr:${index}:${line}`} line={line} line_number={entry.stdout.length + index + 1} stream="stderr" />
                ))}
                {entry.other.map((line, index) => (
                  <TerminalOutputLine
                    key={`other:${index}:${line}`}
                    line={line}
                    line_number={entry.stdout.length + entry.stderr.length + index + 1}
                    stream="output"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[#6f827d]">
                <span className="w-8 shrink-0 select-none text-right text-[#344852]">~</span>
                <span>{entry.phase === "running" ? "waiting for stdout/stderr..." : "[process completed with no stdout/stderr]"}</span>
              </div>
            )}
            <TerminalExitLine entry={entry} />
          </div>
        ))}
        {has_running_entry ? (
          <div className="mt-2 flex min-w-0 items-start">
            <span className="operation-terminal-caret mt-[3px] shrink-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TerminalEntry {
  id: string;
  command: string;
  duration_label: string;
  pid_label: string;
  started_label: string;
  exit_label: string;
  exit_tone: "success" | "error" | "running" | "muted";
  phase: OperationPhase;
  stdout: string[];
  stderr: string[];
  other: string[];
}

function TerminalCommandLine({
  command,
  cwd_label,
  session_label,
}: {
  command: string;
  cwd_label: string;
  session_label: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2">
      <span className="select-none text-[#6f827d]">{session_label}</span>
      <span className="select-none text-[#526875]">{cwd_label}</span>
      <span className="select-none text-[#8de0ad]">%</span>
      <span className="ml-2 min-w-0 break-words text-[#f1fff7]">{command}</span>
    </div>
  );
}

function TerminalOutputLine({
  line_number,
  line,
  stream = "output",
}: {
  line_number: number;
  line: string;
  stream?: "stdout" | "stderr" | "output";
}) {
  if (line === "") {
    return (
      <div className="flex h-5 min-w-0 items-start gap-2">
        <span className="w-8 shrink-0 select-none text-right text-[#344852]">{line_number}</span>
      </div>
    );
  }

  const prompt_match = line.match(/^(\s*[$>]\s?)(.*)$/);
  if (prompt_match) {
    return (
      <div className="flex min-w-0 items-start gap-2">
        <span className="w-8 shrink-0 select-none text-right text-[#344852]">{line_number}</span>
        <span className="select-none text-[#526875]">{prompt_match[1].trim()}</span>
        <span className="ml-2 min-w-0 break-words text-[#d9ffe5]">{prompt_match[2]}</span>
      </div>
    );
  }

  const is_error = /\b(error|failed|panic|exception|denied)\b/i.test(line);
  const is_success = /^(✓|done|success|passed)\b/i.test(line);
  const stream_label = stream === "stderr" ? "err" : stream === "stdout" ? "out" : "";

  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-8 shrink-0 select-none text-right text-[#344852]">{line_number}</span>
      {stream_label ? (
        <span className={cn(
          "mt-[2px] w-7 shrink-0 select-none rounded px-1 text-center text-[9px] leading-4",
          stream === "stderr" ? "bg-[#3b1b20] text-[#ff9d9d]" : "bg-[#10272b] text-[#80cbc4]",
        )}>
          {stream_label}
        </span>
      ) : null}
      <span className={cn(
        "min-w-0 break-words whitespace-pre-wrap",
        stream === "stderr" || is_error ? "text-[#ff8f8f]" : is_success ? "text-[#8de0ad]" : "text-[#b7cbc5]",
      )}>
        {line}
      </span>
    </div>
  );
}

function TerminalExitLine({ entry }: { entry: TerminalEntry }) {
  return (
    <div className={cn(
      "mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]",
      entry.exit_tone === "success" && "border-[#1f4b39] bg-[#0f211b] text-[#8de0ad]",
      entry.exit_tone === "error" && "border-[#55262b] bg-[#251217] text-[#ff9d9d]",
      entry.exit_tone === "running" && "border-[#45504a] bg-[#161d1b] text-[#cdd7d0]",
      entry.exit_tone === "muted" && "border-white/8 bg-white/[0.03] text-[#768982]",
    )}>
      {entry.exit_tone === "success" ? <CheckCircle2 className="h-3 w-3" /> : null}
      {entry.exit_tone === "error" ? <AlertTriangle className="h-3 w-3" /> : null}
      {entry.exit_tone === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {entry.exit_tone === "muted" ? <Clock3 className="h-3 w-3" /> : null}
      <span>{entry.exit_label}</span>
      <span className="text-current opacity-55">· {entry.duration_label}</span>
    </div>
  );
}

function TerminalStatusPill({ event }: { event: NexusOperationEvent }) {
  return (
    <span className={cn(
      "rounded-md px-1.5 py-0.5 font-semibold",
      event.phase === "running" && "bg-[#182822] text-[#8de0ad]",
      event.phase === "done" && "bg-[#17241e] text-[#8de0ad]",
      event.phase === "error" && "bg-[#2c1519] text-[#ff9d9d]",
      (event.phase === "queued" || event.phase === "waiting" || event.phase === "cancelled") && "bg-white/[0.05] text-[#8aa09b]",
    )}>
      {PHASE_LABEL[event.phase]}
    </span>
  );
}

function build_terminal_entries({
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
    return {
      id: item.id,
      command: resolved_command,
      duration_label,
      pid_label: terminal_pid_label(item.id),
      started_label: format_operation_time(item.started_at ?? item.updated_at),
      exit_label: terminal_exit_label(item, exit_code),
      exit_tone,
      phase: item.phase,
      stdout: streams.stdout,
      stderr: streams.stderr,
      other,
    };
  });

  return entries.length ? entries : [{
    id: event.id,
    command: command.trim() || event.target || event.title,
    duration_label: format_terminal_duration(event),
    pid_label: terminal_pid_label(event.id),
    started_label: format_operation_time(event.started_at ?? event.updated_at),
    exit_label: event.phase === "running" ? "running" : "no output",
    exit_tone: event.phase === "running" ? "running" : "muted",
    phase: event.phase,
    stdout: [],
    stderr: [],
    other: fallback_lines,
  }];
}

function read_terminal_command(event: NexusOperationEvent, fallback_command: string, fallback_lines: string[]): string {
  return extract_terminal_input_string(event.input_preview, ["command", "cmd", "description"])
    ?? event.target
    ?? fallback_command.trim()
    ?? strip_terminal_prompt(fallback_lines[0] ?? "")
    ?? event.title;
}

function extract_terminal_streams(value: unknown): { stdout: string[]; stderr: string[]; other: string[] } {
  if (value == null) {
    return { stdout: [], stderr: [], other: [] };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { stdout: [], stderr: [], other: split_terminal_text(String(value)).slice(0, 24) };
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => extract_terminal_streams(item));
    return {
      stdout: parts.flatMap((item) => item.stdout).slice(0, 24),
      stderr: parts.flatMap((item) => item.stderr).slice(0, 24),
      other: parts.flatMap((item) => item.other).slice(0, 24),
    };
  }
  if (typeof value !== "object") {
    return { stdout: [], stderr: [], other: [String(value)] };
  }

  const record = value as Record<string, unknown>;
  const stdout = extract_terminal_text_fields(record, ["stdout", "out"]);
  const stderr = extract_terminal_text_fields(record, ["stderr", "err", "error"]);
  const other = extract_terminal_text_fields(record, ["output", "text", "content", "result", "message"]);
  if (stdout.length || stderr.length || other.length) {
    return { stdout: stdout.slice(0, 24), stderr: stderr.slice(0, 24), other: other.slice(0, 24) };
  }
  return { stdout: [], stderr: [], other: split_terminal_text(safe_json_stringify(value)).slice(0, 24) };
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
  const raw = record.exit_code ?? record.exitCode ?? record.error_code ?? record.errorCode ?? record.code ?? record.status;
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
    return "process running";
  }
  if (event.phase === "error") {
    return exit_code == null ? "process failed" : `exit ${exit_code}`;
  }
  if (event.phase === "cancelled") {
    return "process cancelled";
  }
  if (exit_code != null) {
    return `exit ${exit_code}`;
  }
  return event.phase === "done" ? "exit 0" : PHASE_LABEL[event.phase];
}

function terminal_shell_title(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return "zsh";
  }
  const first_token = trimmed.split(/\s+/)[0] ?? "zsh";
  return `zsh — ${first_token}`;
}

function terminal_pid_label(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return String(1000 + (hash % 89000));
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

function terminal_cwd_label(event: NexusOperationEvent): string {
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
  return normalized.split("\n").map((line) => line.trimEnd());
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
