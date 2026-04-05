/**
 * =====================================================
 * @File   : code-shell.tsx
 * @Date   : 2026-04-05 15:08
 * @Author : leemysw
 * 2026-04-05 15:08   Create
 * =====================================================
 */

"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/shared/theme/theme-context";

interface CodeShellProps {
  language: string;
  right_slot?: ReactNode;
  content_class_name?: string;
  class_name?: string;
  children: ReactNode;
}

/** 中文注释：代码块壳层只在消息区复用，直接收进组件层，避免全局样式继续承担细节实现。 */
export function CodeShell({
  language,
  right_slot,
  content_class_name,
  class_name,
  children,
}: CodeShellProps) {
  const { theme } = useTheme();
  const is_dark_theme = theme === "dark";

  return (
    <div
      className={cn(
        "relative my-4 overflow-hidden rounded-[22px] border border-slate-200/88 bg-slate-50/96",
        is_dark_theme && "border-white/10 bg-[rgb(23_25_31_/_0.98)]",
        class_name,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-slate-200/88 bg-slate-200/70 px-4 py-2",
          is_dark_theme && "border-white/6 bg-[rgb(32_35_43_/_0.96)]",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full border border-red-500/50 bg-red-500/18" />
            <div className="h-2.5 w-2.5 rounded-full border border-yellow-500/50 bg-yellow-500/18" />
            <div className="h-2.5 w-2.5 rounded-full border border-green-500/50 bg-green-500/18" />
          </div>
          <span
            className={cn(
              "ml-2 font-mono text-xs text-slate-500/90",
              is_dark_theme && "text-slate-300/94",
            )}
          >
            {language || "text"}
          </span>
        </div>
        {right_slot}
      </div>

      <div className={content_class_name}>
        {children}
      </div>
    </div>
  );
}
