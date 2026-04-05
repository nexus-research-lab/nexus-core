/**
 * =====================================================
 * @File   : message-rail.tsx
 * @Date   : 2026-04-05 15:08
 * @Author : leemysw
 * 2026-04-05 15:08   Create
 * =====================================================
 */

"use client";

import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MessageRail({
  children,
  class_name,
}: {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden border-l-2 pl-4",
        class_name,
      )}
      style={{ borderColor: "color-mix(in srgb, var(--foreground) 18%, transparent)" }}
    >
      {children}
    </div>
  );
}

export function MessageRailLabel({
  children,
  active = false,
  class_name,
}: {
  children: ReactNode;
  active?: boolean;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-500",
        active && "text-sky-500",
        class_name,
      )}
    >
      {children}
    </div>
  );
}

export function MessageRailBody({
  children,
  class_name,
}: {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <div className={cn("min-w-0 max-w-full overflow-hidden break-words text-[11px] leading-[1.45] text-slate-700/86", class_name)}>
      {children}
    </div>
  );
}

export function MessageCallout({
  children,
  class_name,
}: {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <div className={cn("rounded-[14px] border border-sky-200/72 bg-sky-50/84 px-3.5 py-2.5 text-xs text-sky-700", class_name)}>
      {children}
    </div>
  );
}

export function MessageCalloutTitle({
  children,
  class_name,
}: {
  children: ReactNode;
  class_name?: string;
}) {
  return (
    <div className={cn("font-semibold text-sky-600", class_name)}>
      {children}
    </div>
  );
}

type MessageResultTone = "success" | "error";

const RESULT_TONE_CLASS_MAP: Record<MessageResultTone, string> = {
  success: "text-green-500",
  error: "text-red-500",
};

export function MessageResultLabel({
  children,
  tone,
  class_name,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone: MessageResultTone;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 text-[11px] font-semibold",
        RESULT_TONE_CLASS_MAP[tone],
        class_name,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
