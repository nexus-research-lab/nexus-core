"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface WorkspaceInspectorSectionProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}

export function WorkspaceInspectorSection({
  title,
  icon: Icon,
  action,
  children,
}: WorkspaceInspectorSectionProps) {
  return (
    <section className="border-b workspace-divider px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700/56">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
