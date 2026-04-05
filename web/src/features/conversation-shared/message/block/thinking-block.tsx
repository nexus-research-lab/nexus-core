"use client";

import { Brain } from "lucide-react";
import { MarkdownRenderer } from "../markdown-renderer";
import { MessageRail, MessageRailBody, MessageRailLabel } from "../message-rail";

interface ThinkingBlockProps {
  thinking: string;
  is_streaming?: boolean;
}

export function ThinkingBlock({ thinking, is_streaming }: ThinkingBlockProps) {
  if (!thinking) return null;

  return (
    <MessageRail>
      <MessageRailLabel active={Boolean(is_streaming)}>
        <Brain className={is_streaming ? "h-3 w-3 animate-pulse text-sky-500" : "h-3 w-3 text-slate-400"} />
        <span>{is_streaming ? "Thinking……" : "Thought"}</span>
      </MessageRailLabel>
      <MessageRailBody>
        <MarkdownRenderer
          content={thinking}
          is_streaming={is_streaming}
          class_name="min-w-0 max-w-full overflow-hidden break-all"
        />
      </MessageRailBody>
    </MessageRail>
  );
}
