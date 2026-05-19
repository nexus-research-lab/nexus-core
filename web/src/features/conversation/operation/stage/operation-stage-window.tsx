import type { CSSProperties, ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface OperationStageWindowProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  position_class_name: string;
  delay_ms?: number;
  focus?: boolean;
  minimized?: boolean;
  dimmed?: boolean;
  mobile_hidden?: boolean;
  tone?: "default" | "terminal";
  on_close?: () => void;
  on_focus?: () => void;
  on_minimize?: () => void;
}

export function OperationStageWindow({
  title,
  icon: Icon,
  children,
  position_class_name,
  delay_ms = 0,
  focus = false,
  minimized = false,
  dimmed = false,
  mobile_hidden = false,
  tone = "default",
  on_close,
  on_focus,
  on_minimize,
}: OperationStageWindowProps) {
  return (
    <div
      aria-label={title}
      className={cn(
        "operation-stage-window absolute flex min-h-0 min-w-0 cursor-default flex-col overflow-hidden rounded-[14px] border backdrop-blur-xl outline-none transition-[opacity,filter,box-shadow] focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent max-md:!relative max-md:!inset-auto max-md:!h-auto max-md:!min-h-[180px] max-md:!w-full max-md:max-w-full",
        tone === "terminal"
          ? "border-white/14 bg-[#0d151e]/95 text-[#d8e8e2] shadow-[0_30px_76px_rgba(0,8,16,0.34)]"
          : "border-white/60 bg-[rgba(250,252,253,0.96)] text-(--text-strong) shadow-[0_28px_72px_rgba(18,28,42,0.24)]",
        focus && "operation-stage-window-focus",
        dimmed && "opacity-[0.62] saturate-[0.82]",
        minimized && "min-h-0",
        mobile_hidden && "max-md:hidden",
        position_class_name,
      )}
      onKeyDown={(keyboard_event) => {
        if (keyboard_event.currentTarget !== keyboard_event.target) {
          return;
        }
        if (keyboard_event.key === "Enter" || keyboard_event.key === " ") {
          keyboard_event.preventDefault();
          on_focus?.();
        }
        if (keyboard_event.key === "Escape") {
          keyboard_event.preventDefault();
          on_minimize?.();
        }
      }}
      onMouseDown={on_focus}
      role="group"
      style={{ "--operation-delay": `${delay_ms}ms` } as CSSProperties}
      tabIndex={0}
    >
      <div
        className={cn(
          "flex h-8 shrink-0 items-center justify-between gap-2 border-b px-3",
          tone === "terminal"
            ? "border-white/10 bg-white/[0.035] text-[rgba(233,241,244,0.56)]"
            : "border-(--divider-subtle-color) bg-white/62 text-(--text-soft)",
        )}
      >
        <div className="flex items-center gap-1.5">
          <button
            aria-label={`关闭 ${title}`}
            className="grid h-4 w-4 place-items-center rounded-full border border-[rgba(223,93,98,0.26)] bg-[rgba(223,93,98,0.12)] transition hover:bg-[rgba(223,93,98,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_close?.();
            }}
            title="关闭窗口"
            type="button"
          >
            <X className="h-2.5 w-2.5" />
          </button>
          <button
            aria-label={`最小化 ${title}`}
            className="grid h-4 w-4 place-items-center rounded-full border border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.12)] transition hover:bg-[rgba(223,157,46,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_minimize?.();
            }}
            title="最小化窗口"
            type="button"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <button
            aria-label={`聚焦 ${title}`}
            className="grid h-4 w-4 place-items-center rounded-full border border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.11)] transition hover:bg-[rgba(47,184,132,0.22)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_focus?.();
            }}
            title="聚焦窗口"
            type="button"
          >
            <Square className="h-2 w-2" />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
      </div>
      <div className={cn(
        "soft-scrollbar relative min-h-0 flex-1",
        tone === "terminal" ? "overflow-hidden bg-[#090e14] p-0" : "overflow-auto p-4",
        minimized && "hidden",
      )}>
        {tone !== "terminal" ? (
          <div className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-[10px] border border-(--divider-subtle-color) bg-white/72 text-(--icon-muted) opacity-30">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
