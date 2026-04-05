/**
 * =====================================================
 * @File   : message-primitives.tsx
 * @Date   : 2026-04-05 15:26
 * @Author : leemysw
 * 2026-04-05 15:26   Create
 * =====================================================
 */

"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type MessageAvatarSize = "full" | "compact";
type MessageActionTone = "default" | "success" | "danger";
type MessageLoadingDotsSize = "sm" | "md";

const AVATAR_SIZE_CLASS_MAP: Record<MessageAvatarSize, string> = {
  full: "h-10 w-10 rounded-xl",
  compact: "h-6 w-6 rounded-lg",
};

const ACTION_TONE_CLASS_MAP: Record<MessageActionTone, string> = {
  default: "hover:bg-slate-100/92 hover:text-slate-900/94",
  success: "text-green-500 hover:bg-emerald-50/92 hover:text-emerald-600",
  danger: "hover:bg-rose-50/92 hover:text-rose-600",
};

const DOT_SIZE_CLASS_MAP: Record<MessageLoadingDotsSize, string> = {
  sm: "h-1 w-1",
  md: "h-1.5 w-1.5",
};

export function MessageAvatar({
  children,
  size = "full",
  class_name,
}: {
  children: ReactNode;
  size?: MessageAvatarSize;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-slate-200/88 bg-slate-50/94 text-slate-600/90",
        AVATAR_SIZE_CLASS_MAP[size],
        class_name,
      )}
    >
      {children}
    </div>
  );
}

export function MessageActionButton({
  children,
  class_name,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  class_name?: string;
  tone?: MessageActionTone;
}) {
  return (
    <button
      className={cn(
        "rounded-lg p-1 text-slate-500/70 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50",
        ACTION_TONE_CLASS_MAP[tone],
        class_name,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MessageLoadingDots({
  size = "md",
  class_name,
}: {
  size?: MessageLoadingDotsSize;
  class_name?: string;
}) {
  const dot_class_name = cn(
    "rounded-full bg-slate-400 animate-bounce",
    DOT_SIZE_CLASS_MAP[size],
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", class_name)}>
      <span className={cn(dot_class_name, "[animation-delay:0ms]")} />
      <span className={cn(dot_class_name, "[animation-delay:150ms]")} />
      <span className={cn(dot_class_name, "[animation-delay:300ms]")} />
    </span>
  );
}

export function MessageShell({
  children,
  separated = false,
  class_name,
}: {
  children: ReactNode;
  separated?: boolean;
  class_name?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        separated && "border-b border-slate-200/75",
        class_name,
      )}
    >
      {children}
    </div>
  );
}
