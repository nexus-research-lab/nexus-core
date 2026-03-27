"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceCanvasShellProps {
  children: ReactNode;
  class_name?: string;
  is_joined_with_inspector?: boolean;
}

export function WorkspaceCanvasShell({
  children,
  class_name,
  is_joined_with_inspector = false,
}: WorkspaceCanvasShellProps) {
  return (
    <section
      className={cn(
        "home-glass-panel-subtle flex min-h-0 min-w-0 flex-1 overflow-hidden border border-white/28 bg-[linear-gradient(180deg,rgba(252,253,255,0.94),rgba(245,247,251,0.92))] shadow-[0_18px_34px_rgba(77,91,124,0.06)] backdrop-blur-[16px]",
        is_joined_with_inspector ? "rounded-l-[32px] rounded-r-[24px]" : "radius-shell-xl",
        class_name,
      )}
    >
      {children}
    </section>
  );
}
