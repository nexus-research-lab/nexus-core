"use client";

import { lazy, Suspense } from "react";

interface MarkdownRendererProps {
  content: string;
  class_name?: string;
  is_streaming?: boolean;
  on_open_workspace_file?: (path: string) => void;
}

const LazyMarkdownRendererContent = lazy(async () => {
  const module = await import("./markdown-renderer-content");
  return { default: module.MarkdownRendererContent };
});

function MarkdownRendererFallback({ content, class_name }: MarkdownRendererProps) {
  return (
    <div className={class_name}>
      <div className="space-y-2 text-sm leading-6 text-foreground/90">
        {content.split("\n").map((line, index) => (
          <p key={`${index}-${line.slice(0, 16)}`} className="whitespace-pre-wrap break-words">
            {line || "\u00a0"}
          </p>
        ))}
      </div>
    </div>
  );
}

export function MarkdownRenderer(props: MarkdownRendererProps) {
  return (
    <Suspense fallback={<MarkdownRendererFallback {...props} />}>
      <LazyMarkdownRendererContent {...props} />
    </Suspense>
  );
}
