/**
 * =====================================================
 * @File   : markdown-renderer-shared.tsx
 * @Date   : 2026-04-05 15:26
 * @Author : leemysw
 * 2026-04-05 15:26   Create
 * =====================================================
 */

/* eslint-disable react-refresh/only-export-components */

"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { useAgentStore } from "@/store/agent";
import { useWorkspaceFilesStore } from "@/store/workspace-files";
import { type WorkspaceFileEntry } from "@/types/agent";

import { CodeBlock } from "./block/code-block";

type MarkdownNodeLike = {
  position?: {
    start?: { line?: number };
    end?: { line?: number };
  };
};

type ResolveWorkspaceFilePath = (value: string) => string | null;

const WORKSPACE_FILE_PATTERN = /([A-Za-z0-9_./-]+\.[A-Za-z0-9]{1,10})/g;

export const MARKDOWN_PLUGINS = [remarkGfm, remarkMath, remarkBreaks];
export const REHYPE_PLUGINS = [rehypeKatex];
export const MARKDOWN_BODY_CLASS_NAME = "w-full min-w-0 max-w-full overflow-x-hidden text-[14px] leading-7 text-slate-900/90 [&_strong]:font-semibold [&_strong]:text-slate-900/96 [&_em]:italic [&_hr]:my-4 [&_hr]:border-slate-200/70";

function normalizeWorkspaceReference(value: string): string {
  return value.replace(/^[("'`【]+|[)"'`】,，。；：:!?]+$/g, "");
}

function looksLikeWorkspaceFileReference(value: string): boolean {
  if (!value.includes(".") || /^https?:\/\//i.test(value) || value.startsWith("/")) {
    return false;
  }

  return /[A-Za-z0-9]/.test(value);
}

function resolveWorkspaceFileReference(value: string, files: WorkspaceFileEntry[]): string | null {
  const normalized = normalizeWorkspaceReference(value);
  if (!looksLikeWorkspaceFileReference(normalized)) {
    return null;
  }

  const candidate_files = files.filter((entry) => !entry.is_dir);
  const exact_match = candidate_files.find((entry) => entry.path === normalized);
  if (exact_match) {
    return exact_match.path;
  }

  const basename_matches = candidate_files.filter((entry) => entry.name === normalized);
  return basename_matches.length === 1 ? basename_matches[0].path : null;
}

function isBlockCode(node: MarkdownNodeLike | null | undefined, class_name: string | undefined, value: string): boolean {
  if (class_name && /language-\w+/.test(class_name)) {
    return true;
  }

  if (value.includes("\n")) {
    return true;
  }

  const start_line = node?.position?.start?.line;
  const end_line = node?.position?.end?.line;
  return typeof start_line === "number" && typeof end_line === "number" && start_line !== end_line;
}

function WorkspaceFileButton({
  label,
  path,
  on_open_workspace_file,
}: {
  label: ReactNode;
  path: string;
  on_open_workspace_file: (path: string) => void;
}) {
  return (
    <button
      className="inline-flex max-w-full items-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-left align-middle font-mono text-[13px] text-primary transition-colors hover:border-primary/30 hover:bg-primary/15"
      onClick={() => on_open_workspace_file(path)}
      title={`Open ${path}`}
      type="button"
    >
      <span className="max-w-full whitespace-pre-wrap break-words">{label}</span>
    </button>
  );
}

export function useMarkdownFileResolver(): ResolveWorkspaceFilePath {
  const current_agent_id = useAgentStore((state) => state.current_agent_id);
  const files_by_agent = useWorkspaceFilesStore((state) => state.files_by_agent);
  const agent_files = useMemo(
    () => files_by_agent[current_agent_id ?? ""] ?? [],
    [current_agent_id, files_by_agent],
  );

  return useCallback(
    (value: string) => resolveWorkspaceFileReference(value, agent_files),
    [agent_files],
  );
}

export function normalizeMarkdownContent(
  content: string,
  resolve_file_path: ResolveWorkspaceFilePath,
  on_open_workspace_file?: (path: string) => void,
): string {
  return content.replace(WORKSPACE_FILE_PATTERN, (match) => {
    const resolved_path = resolve_file_path(match);
    return resolved_path && on_open_workspace_file ? `\`${match}\`` : match;
  });
}

export function createMarkdownComponents(
  resolve_file_path: ResolveWorkspaceFilePath,
  on_open_workspace_file?: (path: string) => void,
): Components {
  return {
    pre({ children }) {
      return <div className="my-4 w-full min-w-0 max-w-full overflow-hidden">{children}</div>;
    },
    code({ children, className, node }) {
      const value = String(children).replace(/\n$/, "");
      if (isBlockCode(node as MarkdownNodeLike | undefined, className, value)) {
        const language = /language-(\w+)/.exec(className || "")?.[1] || "text";
        return <CodeBlock language={language} value={value} />;
      }

      const resolved_path = resolve_file_path(value);
      if (resolved_path && on_open_workspace_file) {
        return (
          <WorkspaceFileButton
            label={value}
            path={resolved_path}
            on_open_workspace_file={on_open_workspace_file}
          />
        );
      }

      return (
        <span className="mx-0.5 inline-flex max-w-full overflow-hidden rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 align-middle font-mono text-[13px] text-primary">
          <span className="max-w-full whitespace-pre-wrap break-words">{value}</span>
        </span>
      );
    },
    p({ children }) {
      return <div className="mb-2 mt-2 min-w-0 max-w-full leading-relaxed text-foreground/90 wrap-anywhere last:mb-0">{children}</div>;
    },
    ul({ children }) {
      return <ul className="mb-4 max-w-full list-disc space-y-2 pl-5 text-foreground/90 marker:text-muted-foreground sm:pl-6">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="mb-4 max-w-full list-decimal space-y-2 pl-5 text-foreground/90 marker:text-muted-foreground sm:pl-6">{children}</ol>;
    },
    li({ children }) {
      return <li className="max-w-full pl-1 leading-relaxed wrap-anywhere [&>p]:m-0 [&>p]:leading-relaxed">{children}</li>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-4 w-full min-w-0 max-w-full overflow-hidden border-l-4 border-primary/30 bg-primary/6 px-1 py-2 pl-4 italic text-slate-500/90 wrap-anywhere">
          <div className="min-w-0 max-w-full">{children}</div>
        </blockquote>
      );
    },
    a({ href, children }) {
      if (!href) {
        return <span className="text-primary">{children}</span>;
      }

      return (
        <a
          className="text-primary transition-all decoration-primary/30 underline-offset-4 hover:underline"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {children}
        </a>
      );
    },
    img({ alt, src }) {
      return <img alt={alt || ""} className="my-4 h-auto max-w-full rounded-[18px] border border-white/40 object-cover" loading="lazy" src={src || ""} />;
    },
    h1({ children }) {
      return <h1 className="mb-4 mt-6 max-w-full break-words text-2xl font-bold text-foreground first:mt-0">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="mb-3 mt-5 max-w-full break-words text-xl font-bold text-foreground">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="mb-2 mt-4 max-w-full break-words text-lg font-bold text-foreground">{children}</h3>;
    },
    table({ children }) {
      return <table className="my-4 w-full max-w-full table-fixed border-collapse text-left text-sm sm:table-auto">{children}</table>;
    },
    thead({ children }) {
      return <thead className="bg-slate-100/86 uppercase text-slate-500/88">{children}</thead>;
    },
    tbody({ children }) {
      return <tbody className="align-top">{children}</tbody>;
    },
    tr({ children }) {
      return <tr className="align-top">{children}</tr>;
    },
    th({ children }) {
      return <th className="px-3 py-2 font-semibold sm:px-4 sm:py-3">{children}</th>;
    },
    td({ children }) {
      return <td className="border-t border-slate-200/70 px-3 py-2 align-top whitespace-normal break-words sm:px-4 sm:py-3">{children}</td>;
    },
  };
}
