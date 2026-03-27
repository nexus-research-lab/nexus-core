"use client";

import { ReactNode } from "react";

import { HOME_WORKSPACE_OBJECT_LIST_WIDTH_CLASS } from "@/lib/home-layout";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarShellProps {
  title: string;
  subtitle?: string;
  header_action?: ReactNode;
  children: ReactNode;
  empty_state?: ReactNode;
  class_name?: string;
}

export function WorkspaceSidebarShell({
  title,
  subtitle,
  header_action,
  children,
  empty_state,
  class_name,
}: WorkspaceSidebarShellProps) {
  return (
    <aside className={cn(
      "home-glass-panel-subtle radius-shell-xl hidden min-h-0 shrink-0 overflow-hidden lg:flex lg:flex-col",
      HOME_WORKSPACE_OBJECT_LIST_WIDTH_CLASS,
      class_name,
    )}>
      <div className="border-b workspace-divider px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-black tracking-[-0.04em] text-slate-950/92">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[12px] text-slate-700/54">
                {subtitle}
              </p>
            ) : null}
          </div>
          {header_action}
        </div>
      </div>

      <div className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-1.5">
          {children}
          {empty_state}
        </div>
      </div>
    </aside>
  );
}
