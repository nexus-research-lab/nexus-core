"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SKILL_MARKDOWN_CLASS_NAME =
  "text-sm leading-[1.9] text-slate-700/84 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0";

interface SkillMarkdownProps {
  markdown: string;
}

export function SkillMarkdown({ markdown }: SkillMarkdownProps) {
  return (
    <div className={SKILL_MARKDOWN_CLASS_NAME}>
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <a
              className="text-sky-600/92 underline decoration-sky-300/72 underline-offset-4"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mt-8 text-[28px] font-black tracking-[-0.04em] text-slate-950/92">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-7 text-[22px] font-bold tracking-[-0.03em] text-slate-950/92">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-[18px] font-bold text-slate-950/92">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc pl-6">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal pl-6">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mt-[0.45rem] first:mt-0">
              {children}
            </li>
          ),
          pre: ({ children }) => (
            <pre className="mt-4 overflow-x-auto rounded-[18px] bg-slate-950/96 p-4 text-xs text-slate-50/96 shadow-[0_16px_28px_rgba(15,23,42,0.18)]">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            if (className) {
              return (
                <code className={className}>
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded-lg bg-slate-100/90 px-[0.42rem] py-[0.16rem] text-[12px] text-slate-800/92">
                {children as ReactNode}
              </code>
            );
          },
        }}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
