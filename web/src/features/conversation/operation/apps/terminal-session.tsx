import {
  Loader2,
  TerminalSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { NexusOperationEvent } from "../operation-types";
import {
  build_terminal_entries,
  TERMINAL_PHASE_LABEL,
  terminal_cwd_label,
  terminal_shell_title,
} from "./terminal-session-model";
import type { TerminalEntry, TerminalTranscriptRow } from "./terminal-session-model";

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
      <TerminalTitleBar
        cwd_label={cwd_label}
        event={event}
        has_running_entry={has_running_entry}
        session_label={session_label}
        shell_title={shell_title}
      />
      <div className="soft-scrollbar min-h-0 flex-1 overflow-auto bg-[radial-gradient(70%_36%_at_50%_0%,rgba(141,224,173,0.055),transparent_70%),#080d12] px-3 py-2">
        {entries.map((entry, entry_index) => (
          <div className={entry_index > 0 ? "mt-4 border-t border-white/8 pt-3" : undefined} key={entry.id}>
            {entry_index > 0 ? <TerminalCommandSeparator entry={entry} /> : null}
            <div className="space-y-0.5">
              {entry.rows.map((row) => (
                <TerminalTranscriptLine
                  cwd_label={cwd_label}
                  key={row.id}
                  row={row}
                  session_label={session_label}
                />
              ))}
              {entry.phase === "running" ? (
                <TerminalPromptLine cwd_label={cwd_label} session_label={session_label} />
              ) : null}
            </div>
            {entry.phase === "running" ? null : (
              <div className="mt-2 flex min-w-0 items-center gap-2 pl-5 text-[10px] text-[#526875]">
                <span className="h-px flex-1 bg-white/8" />
                <span>{entry.exit_label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalTitleBar({
  cwd_label,
  event,
  has_running_entry,
  session_label,
  shell_title,
}: {
  cwd_label: string;
  event: NexusOperationEvent;
  has_running_entry: boolean;
  session_label: string;
  shell_title: string;
}) {
  return (
    <div className="border-b border-white/10 bg-[#111922] text-[10px] text-[#88a19a]">
      <div className="flex min-h-0 items-end gap-1.5 px-2 pt-1.5">
        <div className="flex min-w-0 max-w-[70%] items-center gap-2 rounded-t-[8px] border border-b-0 border-white/10 bg-[#080d12] px-3 py-1.5 text-[#c8d8d1] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <span className="grid h-4 w-4 shrink-0 place-items-center text-[#8de0ad]">
            {has_running_entry
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <TerminalSquare className="h-3 w-3" />}
          </span>
          <span className="min-w-0 truncate">{shell_title}</span>
        </div>
        <span className="mb-1 hidden min-w-0 truncate text-[#536873] sm:block">
          {session_label}
        </span>
      </div>
      <div className="flex min-h-0 items-center justify-between gap-3 border-t border-white/[0.035] px-3 py-1.5">
        <span className="min-w-0 truncate text-[#536873]">{cwd_label}</span>
        <span className={cn(
          "shrink-0 text-[10px] font-semibold",
          event.phase === "running" && "text-[#8de0ad]",
          event.phase === "done" && "text-[#8de0ad]",
          event.phase === "error" && "text-[#ff9d9d]",
          (event.phase === "queued" || event.phase === "waiting" || event.phase === "cancelled") && "text-[#8aa09b]",
        )}>
          {TERMINAL_PHASE_LABEL[event.phase]}
        </span>
      </div>
    </div>
  );
}

function TerminalPromptLine({
  cwd_label,
  session_label,
}: {
  cwd_label: string;
  session_label: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-x-2">
      <span className="select-none text-[#6f827d]">{session_label}</span>
      <span className="select-none text-[#526875]">{cwd_label}</span>
      <span className="select-none text-[#8de0ad]">%</span>
      <span className="operation-terminal-caret ml-2 mt-[3px] shrink-0" />
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

function TerminalTranscriptLine({
  cwd_label,
  row,
  session_label,
}: {
  cwd_label: string;
  row: TerminalTranscriptRow;
  session_label: string;
}) {
  if (row.stream === "system") {
    return (
      <div className="flex min-w-0 items-start gap-2 text-[#526875]">
        <span className="select-none">#</span>
        <span className="min-w-0 break-words whitespace-pre-wrap">{row.text}</span>
      </div>
    );
  }
  if (row.stream === "command") {
    return (
      <TerminalCommandLine command={row.text} cwd_label={cwd_label} session_label={session_label} />
    );
  }
  if (row.stream === "exit") {
    return (
      <div className="flex min-w-0 items-start gap-2 pl-5 text-[#526875]">
        <span className="select-none">[process]</span>
        <span className="min-w-0 break-words whitespace-pre-wrap">{row.text}</span>
      </div>
    );
  }
  return <TerminalOutputLine line={row.text} stream={row.stream} />;
}

function TerminalOutputLine({
  line,
  stream = "output",
}: {
  line: string;
  stream?: "stdout" | "stderr" | "output";
}) {
  if (line === "") {
    return <div className="h-5" />;
  }

  const prompt_match = line.match(/^(\s*[$>]\s?)(.*)$/);
  if (prompt_match) {
    return (
      <div className="flex min-w-0 items-start gap-2 pl-5">
        <span className="select-none text-[#526875]">{prompt_match[1].trim()}</span>
        <span className="ml-2 min-w-0 break-words text-[#d9ffe5]">{prompt_match[2]}</span>
      </div>
    );
  }

  const is_error = /\b(error|failed|panic|exception|denied)\b/i.test(line);
  const is_success = /^(✓|done|success|passed)\b/i.test(line);

  return (
    <div className="flex min-w-0 items-start pl-5">
      <span className={cn(
        "min-w-0 break-words whitespace-pre-wrap",
        stream === "stderr" || is_error ? "text-[#ff8f8f]" : is_success ? "text-[#8de0ad]" : "text-[#b7cbc5]",
      )}>
        {line}
      </span>
    </div>
  );
}

function TerminalCommandSeparator({ entry }: { entry: TerminalEntry }) {
  return (
    <div className="mb-2 flex min-w-0 items-center gap-2 text-[10px] text-[#526875]">
      <span className="h-px flex-1 bg-white/8" />
      <span className="shrink-0">
        {entry.started_label} · {entry.duration_label}
      </span>
    </div>
  );
}
