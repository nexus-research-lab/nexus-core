"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceCanvasShellProps {
  children: ReactNode;
  is_joined_with_inspector?: boolean;
}

export function WorkspaceCanvasShell({
  children,
  is_joined_with_inspector = false,
}: WorkspaceCanvasShellProps) {
  return (
    <section
      className={cn(
        "relative glass-panel-subtle flex min-h-0 min-w-0 flex-1 overflow-hidden",
        is_joined_with_inspector ? "rounded-l-[32px] rounded-r-[24px]" : "radius-shell-xl",
      )}
    >
      {children}
    </section>
  );
}
