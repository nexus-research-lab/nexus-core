import {
  Braces,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Search,
  SplitSquareHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  basename,
  detect_preview_kind,
  get_preview_lines,
} from "../operation-preview";

export function DocumentPreview({
  target,
  summary,
  value,
  fallback_lines,
  diff_stats,
}: {
  target?: string | null;
  summary?: string | null;
  value: unknown;
  fallback_lines?: string[];
  diff_stats?: { additions: number; deletions: number } | null;
}) {
  const kind = detect_preview_kind(target);
  const raw_lines = get_preview_lines(value, 18);
  const lines = raw_lines.length ? raw_lines : (fallback_lines ?? []);
  const display_title = basename(target) || summary || "preview";

  if (kind === "markdown") {
    return (
      <div className="soft-scrollbar h-full min-h-[240px] overflow-auto bg-white/86 p-5">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) pb-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black tracking-[-0.02em] text-(--text-strong)">{display_title}</p>
            <p className="truncate text-[11px] text-(--text-soft)">{summary ?? "Markdown preview"}</p>
          </div>
          {diff_stats ? <DiffStatPill additions={diff_stats.additions} deletions={diff_stats.deletions} /> : null}
        </div>
        <div className="space-y-2.5 text-[12px] leading-5 text-(--text-default)">
          {(lines.length ? lines : ["# Markdown", "等待内容写入..."]).map((line, index) => (
            <MarkdownLine key={`${line}:${index}`} line={line} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "word" || kind === "pdf") {
    return (
      <div className="flex h-full min-h-[260px] items-start justify-center overflow-auto bg-[#e9eef3] p-5">
        <article className="min-h-full w-full max-w-[420px] rounded-[3px] bg-white px-8 py-7 shadow-[0_20px_52px_rgba(18,28,42,0.16)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-(--divider-subtle-color) pb-4">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-black tracking-[-0.025em] text-(--text-strong)">{display_title}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--text-soft)">
                {kind === "word" ? "Word document" : "PDF page"}
              </p>
            </div>
            <FileText className="h-4 w-4 shrink-0 text-(--icon-muted)" />
          </div>
          <div className="space-y-3">
            {(lines.length ? lines : [summary ?? "文档预览正在准备", "智能体打开文档后会在这里显示正文结构。"]).slice(0, 8).map((line, index) => (
              <p className={cn(
                "text-[12px] leading-6 text-(--text-default)",
                index === 0 && "text-[16px] font-black tracking-[-0.025em] text-(--text-strong)",
              )} key={`${line}:${index}`}>
                {line}
              </p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  if (kind === "spreadsheet") {
    const sheet_lines = lines.length ? lines : ["name,status,value", "file,updated,1", "tests,passed,3"];
    const rows = sheet_lines.slice(0, 6).map((line) => line.split(/,|\t/).slice(0, 4));
    return (
      <div className="h-full min-h-[240px] overflow-hidden bg-white/90">
        <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) px-4 py-2.5">
          <p className="truncate text-[12px] font-bold text-(--text-strong)">{display_title}</p>
          <FileSpreadsheet className="h-4 w-4 text-(--icon-muted)" />
        </div>
        <div className="grid grid-cols-4 text-[11px] text-(--text-default)">
          {rows.flatMap((row, row_index) => (
            Array.from({ length: 4 }).map((_, column_index) => (
              <div
                className={cn(
                  "min-h-9 truncate border-b border-r border-(--divider-subtle-color) px-2 py-2",
                  row_index === 0 && "bg-[rgba(91,114,255,0.08)] font-bold text-(--text-strong)",
                )}
                key={`${row_index}:${column_index}`}
              >
                {row[column_index] ?? ""}
              </div>
            ))
          ))}
        </div>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="flex h-full min-h-[240px] flex-col bg-[linear-gradient(135deg,rgba(91,114,255,0.08),rgba(255,255,255,0.82),rgba(79,162,159,0.10))] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[12px] font-bold text-(--text-strong)">{display_title}</p>
          <ImageIcon className="h-4 w-4 text-(--icon-muted)" />
        </div>
        <div className="mt-4 grid min-h-0 flex-1 place-items-center rounded-[12px] border border-white/70 bg-white/48">
          <div className="h-24 w-36 rounded-[12px] border border-white/70 bg-[radial-gradient(circle_at_32%_30%,rgba(91,114,255,0.24),transparent_32%),linear-gradient(135deg,rgba(47,184,132,0.22),rgba(223,157,46,0.18))] shadow-[0_18px_36px_rgba(18,28,42,0.12)]" />
        </div>
      </div>
    );
  }

  if (kind === "folder") {
    return (
      <div className="soft-scrollbar h-full min-h-[240px] space-y-2 overflow-auto bg-white/86 p-4">
        {(lines.length ? lines : [target ?? "workspace", "src/", "docs/", "package.json"]).slice(0, 9).map((line, index) => (
          <FileRow active={index === 0} key={`${line}:${index}`} label={line} />
        ))}
      </div>
    );
  }

  return (
    <EditorSurface
      diff_stats={diff_stats}
      lines={lines.length ? lines : (fallback_lines ?? [summary ?? "暂无预览"])}
      phase_label={summary ?? "Preview"}
      title={display_title}
    />
  );
}

function EditorSurface({
  diff_stats,
  phase_label,
  title,
  lines,
}: {
  diff_stats?: { additions: number; deletions: number } | null;
  phase_label: string;
  title: string;
  lines: string[];
}) {
  const extension = title.includes(".") ? title.slice(title.lastIndexOf(".") + 1).toUpperCase() : "TEXT";
  const is_code = extension !== "TEXT";
  return (
    <div className="flex h-full min-h-[240px] flex-col overflow-hidden bg-[#101820] text-[#dce8ee]">
      <div className="border-b border-white/10 bg-[#151f29]">
        <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <EditorToolbarButton label="切换侧边栏">
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
            </EditorToolbarButton>
            <EditorToolbarButton label="搜索">
              <Search className="h-3.5 w-3.5" />
            </EditorToolbarButton>
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-[11px] font-bold text-[#e7eef5]">{title}</p>
            <p className="truncate text-[9px] text-[#7f94a3]">{phase_label}</p>
          </div>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-px text-[9px] font-bold text-[#8aa0ad]">
            {extension}
          </span>
        </div>
        <div className="flex min-w-0 items-end gap-1.5 px-3">
          <div className="flex min-w-0 max-w-[62%] items-center gap-1.5 rounded-t-[9px] border border-b-0 border-white/10 bg-[#101820] px-3 py-1.5 text-[10px] font-semibold text-[#dce8ee]">
            {is_code ? <Braces className="h-3 w-3 shrink-0 text-[#8de0ad]" /> : <FileText className="h-3 w-3 shrink-0 text-[#8aa0ad]" />}
            <span className="truncate">{title}</span>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[148px] shrink-0 border-r border-white/10 bg-[#0c141c] p-2 text-[10px] text-[#7f94a3] sm:block">
          <div className="mb-2 truncate rounded-md bg-white/[0.06] px-2 py-1.5 font-bold text-[#dce8ee]">Explorer</div>
          <div className="space-y-1">
            <div className="truncate rounded bg-white/[0.06] px-2 py-1 text-[#dce8ee]">{title}</div>
            <div className="truncate rounded px-2 py-1">Source Control</div>
            <div className="truncate rounded px-2 py-1">Timeline</div>
          </div>
        </div>
        <div className="soft-scrollbar min-w-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-5">
          <div className="mb-2 flex min-w-0 items-center gap-2 border-b border-white/10 pb-2 text-[10px] text-[rgba(220,232,238,0.52)]">
            <span className="truncate">{phase_label}</span>
            {diff_stats ? (
              <span className="shrink-0 rounded bg-[#10271e] px-1.5 py-px text-[#8de0ad]">
                +{diff_stats.additions} -{diff_stats.deletions}
              </span>
            ) : null}
          </div>
          {lines.map((line, index) => (
            <div className="flex min-w-0 gap-3" key={`${line}:${index}`}>
              <span className="w-8 shrink-0 select-none text-right text-[rgba(220,232,238,0.35)]">{index + 1}</span>
              <span className={cn(
                "min-w-0 whitespace-pre-wrap break-words",
                line.startsWith("+") && "text-[#8de0ad]",
                line.startsWith("-") && "text-[#ff9d9d]",
              )}>
                {line || " "}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/10 bg-[#0c141c] px-3 py-1.5 text-[10px] text-[#7f94a3]">
        <span className="truncate">UTF-8 · Spaces: 2 · {is_code ? extension.toLowerCase() : "plain text"}</span>
        <span className="shrink-0">Ln {Math.max(lines.length, 1)}, Col 1</span>
      </div>
    </div>
  );
}

function EditorToolbarButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-md border border-white/8 bg-white/[0.035] text-[#8aa0ad] transition hover:bg-white/[0.07] hover:text-[#dce8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8de0ad]/30"
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function MarkdownLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (trimmed.startsWith("# ")) {
    return <h3 className="text-[18px] font-black tracking-[-0.035em] text-(--text-strong)">{trimmed.slice(2)}</h3>;
  }
  if (trimmed.startsWith("## ")) {
    return <h4 className="pt-1 text-[14px] font-black tracking-[-0.02em] text-(--text-strong)">{trimmed.slice(3)}</h4>;
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <div className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--primary)]" />
        <p>{trimmed.slice(2)}</p>
      </div>
    );
  }
  if (trimmed.startsWith("```")) {
    return <div className="h-px bg-(--divider-subtle-color)" />;
  }
  return <p className="whitespace-pre-wrap break-words">{line || " "}</p>;
}

function DiffStatPill({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="shrink-0 rounded-full border border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] px-2 py-1 text-[10px] font-semibold text-[color:var(--success)]">
      +{additions} -{deletions}
    </span>
  );
}

function FileRow({
  label,
  meta,
  active = false,
}: {
  label: string;
  meta?: string;
  active?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[11px]",
      active
        ? "border-[rgba(79,162,159,0.32)] bg-[rgba(79,162,159,0.14)] text-(--text-strong)"
        : "border-(--divider-subtle-color) bg-white/62 text-(--text-muted)",
    )}>
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta ? <span className="shrink-0 font-mono text-[10px] text-(--text-soft)">{meta}</span> : null}
    </div>
  );
}
