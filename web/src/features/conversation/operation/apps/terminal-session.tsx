import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import { format_operation_time } from "../operation-preview";
import type { NexusOperationEvent } from "../operation-types";
import {
  build_terminal_entries,
  TERMINAL_PHASE_LABEL,
  terminal_cwd_label,
  terminal_shell_title,
} from "./terminal-session-model";
import type { TerminalEntry } from "./terminal-session-model";

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
      <TerminalSessionStrip
        cwd_label={cwd_label}
        entries={entries}
        session_label={session_label}
      />
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

function TerminalSessionStrip({
  cwd_label,
  entries,
  session_label,
}: {
  cwd_label: string;
  entries: TerminalEntry[];
  session_label: string;
}) {
  const latest_entry = entries.at(-1);
  const stdout_count = entries.reduce((count, entry) => count + entry.stdout.length, 0);
  const stderr_count = entries.reduce((count, entry) => count + entry.stderr.length, 0);
  const command_count = entries.length;
  const exit_label = latest_entry?.exit_label ?? "idle";
  const exit_tone = latest_entry?.exit_tone ?? "muted";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-white/8 bg-[#0b1118] px-3 py-1.5 text-[9px] font-semibold text-[#60757f] max-sm:grid-cols-2">
      <span className="min-w-0 truncate">
        {session_label} · {cwd_label} · {command_count} command{command_count === 1 ? "" : "s"}
      </span>
      <TerminalMiniBadge label="stdout" value={stdout_count} />
      <TerminalMiniBadge label="stderr" tone={stderr_count ? "error" : "muted"} value={stderr_count} />
      <span className={cn(
        "shrink-0 rounded px-1.5 py-px text-[8.5px]",
        exit_tone === "success" && "bg-[#10251d] text-[#8de0ad]",
        exit_tone === "error" && "bg-[#2c1519] text-[#ff9d9d]",
        exit_tone === "running" && "bg-[#182822] text-[#8de0ad]",
        exit_tone === "muted" && "bg-white/[0.04] text-[#788b86]",
      )}>
        {exit_label}
      </span>
    </div>
  );
}

function TerminalMiniBadge({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "error" | "muted" | "neutral";
  value: number;
}) {
  return (
    <span className={cn(
      "shrink-0 rounded px-1.5 py-px text-[8.5px]",
      tone === "error" ? "bg-[#2c1519] text-[#ff9d9d]" : tone === "muted" ? "bg-white/[0.03] text-[#52656e]" : "bg-[#10272b] text-[#80cbc4]",
    )}>
      {label}:{value}
    </span>
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
      {TERMINAL_PHASE_LABEL[event.phase]}
    </span>
  );
}
