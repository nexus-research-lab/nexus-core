"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceSurfaceViewProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  /** 中文注释：这里只允许滚动区和内容宽度的布局调整，不再承担视觉覆写。 */
  body_class_name?: string;
  content_class_name?: string;
  max_width_class_name?: string;
}

export function WorkspaceSurfaceView({
  eyebrow,
  title,
  action,
  children,
  body_class_name,
  content_class_name,
  max_width_class_name = "max-w-[760px]",
}: WorkspaceSurfaceViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
      <div className="border-b glass-divider px-5 py-2.5 xl:px-6">
        <div className={cn("mx-auto flex w-full items-center justify-between gap-3", max_width_class_name)}>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700/44">
              {eyebrow}
            </p>
            <h2 className="mt-1 truncate text-[16px] font-black tracking-[-0.04em] text-slate-950/88">
              {title}
            </h2>
          </div>
          {action}
        </div>
      </div>

      <div className={cn("soft-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 xl:px-6", body_class_name)}>
        <div className={cn("mx-auto w-full", max_width_class_name, content_class_name)}>
          {children}
        </div>
      </div>
    </div>
  );
}
