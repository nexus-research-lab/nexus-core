"use client";

import { lazy, Suspense } from "react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/shared/theme/theme-context";

import { CodeShell } from "./code-shell";

interface CodeBlockProps {
  language: string;
  value: string;
}

const LazyCodeBlockContent = lazy(async () => {
  const module = await import("./code-block-content");
  return { default: module.CodeBlockContent };
});

function CodeBlockFallback({ language, value }: CodeBlockProps) {
  const { theme } = useTheme();
  const is_dark_theme = theme === "dark";

  return (
    <CodeShell
      language={language}
      right_slot={(
        <span className={cn("font-mono text-xs text-slate-500/90", is_dark_theme && "text-slate-300/94")}>
          Loading
        </span>
      )}
      content_class_name="overflow-x-auto"
    >
      <pre
        className={cn(
          "whitespace-pre-wrap break-words px-6 py-6 text-sm leading-[1.7] text-slate-800/92",
          is_dark_theme && "text-slate-100/96",
        )}
      >
        {value}
      </pre>
    </CodeShell>
  );
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  return (
    <Suspense fallback={<CodeBlockFallback language={language} value={value} />}>
      <LazyCodeBlockContent language={language} value={value} />
    </Suspense>
  );
}
