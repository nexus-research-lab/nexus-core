"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import "katex/dist/katex.min.css";
import {
  createMarkdownComponents,
  MARKDOWN_BODY_CLASS_NAME,
  MARKDOWN_PLUGINS,
  normalizeMarkdownContent,
  REHYPE_PLUGINS,
  useMarkdownFileResolver,
} from "./markdown-renderer-shared";

interface MarkdownRendererProps {
  content: string;
  class_name?: string;
  is_streaming?: boolean;
  on_open_workspace_file?: (path: string) => void;
}

export function MarkdownRendererContent({
  content,
  class_name,
  is_streaming = false,
  on_open_workspace_file,
}: MarkdownRendererProps) {
  const resolve_file_path = useMarkdownFileResolver();
  const markdown_components = createMarkdownComponents(resolve_file_path, on_open_workspace_file);
  const normalized_content = normalizeMarkdownContent(content, resolve_file_path, on_open_workspace_file);

  return (
    <div
      className={cn(
        MARKDOWN_BODY_CLASS_NAME,
        is_streaming && "animate-in fade-in-0",
        class_name,
      )}
    >
      <ReactMarkdown
        components={markdown_components}
        rehypePlugins={REHYPE_PLUGINS}
        remarkPlugins={MARKDOWN_PLUGINS}
      >
        {normalized_content}
      </ReactMarkdown>
    </div>
  );
}
