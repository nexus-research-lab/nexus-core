import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface OperationStageWindowProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  position_class_name: string;
  app_label?: string;
  delay_ms?: number;
  focus?: boolean;
  maximized?: boolean;
  minimized?: boolean;
  dimmed?: boolean;
  drag_offset?: { x: number; y: number };
  mobile_hidden?: boolean;
  content_mode?: "flush" | "inset";
  restore_token?: number;
  z_index?: number;
  tone?: "default" | "terminal";
  on_close?: () => void;
  on_drag?: (offset: { x: number; y: number }) => void;
  on_focus?: () => void;
  on_minimize?: () => void;
  on_zoom?: () => void;
}

export function OperationStageWindow({
  title,
  icon: Icon,
  children,
  position_class_name,
  app_label,
  delay_ms = 0,
  focus = false,
  maximized = false,
  minimized = false,
  dimmed = false,
  drag_offset = { x: 0, y: 0 },
  mobile_hidden = false,
  content_mode = "inset",
  restore_token,
  z_index,
  tone = "default",
  on_close,
  on_drag,
  on_focus,
  on_minimize,
  on_zoom,
}: OperationStageWindowProps) {
  const drag_state_ref = useRef<{
    pointer_id: number;
    start_x: number;
    start_y: number;
    origin_x: number;
    origin_y: number;
  } | null>(null);
  const cleanup_mouse_drag_ref = useRef<(() => void) | null>(null);
  const [is_dragging, set_is_dragging] = useState(false);
  const [is_restoring, set_is_restoring] = useState(false);

  const start_drag = (
    event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>,
    pointer_id: number,
  ) => {
    if (event.button !== 0 || minimized || drag_state_ref.current) {
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      on_focus?.();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    on_focus?.();
    drag_state_ref.current = {
      pointer_id,
      start_x: event.clientX,
      start_y: event.clientY,
      origin_x: drag_offset.x,
      origin_y: drag_offset.y,
    };
    set_is_dragging(true);
  };

  const start_pointer_drag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      return;
    }
    start_drag(event, event.pointerId);
    if (drag_state_ref.current?.pointer_id === event.pointerId) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const start_mouse_drag = (event: MouseEvent<HTMLDivElement>) => {
    start_drag(event, -1);
    if (drag_state_ref.current?.pointer_id !== -1) {
      return;
    }
    const move_mouse_drag = (mouse_event: globalThis.MouseEvent) => {
      const drag_state = drag_state_ref.current;
      if (!drag_state || drag_state.pointer_id !== -1) {
        return;
      }
      mouse_event.preventDefault();
      on_drag?.({
        x: drag_state.origin_x + mouse_event.clientX - drag_state.start_x,
        y: drag_state.origin_y + mouse_event.clientY - drag_state.start_y,
      });
    };
    const end_mouse_drag = () => {
      const drag_state = drag_state_ref.current;
      if (!drag_state || drag_state.pointer_id !== -1) {
        return;
      }
      cleanup_mouse_drag_ref.current?.();
      cleanup_mouse_drag_ref.current = null;
      drag_state_ref.current = null;
      set_is_dragging(false);
    };
    cleanup_mouse_drag_ref.current?.();
    document.addEventListener("mousemove", move_mouse_drag);
    document.addEventListener("mouseup", end_mouse_drag);
    cleanup_mouse_drag_ref.current = () => {
      document.removeEventListener("mousemove", move_mouse_drag);
      document.removeEventListener("mouseup", end_mouse_drag);
    };
  };

  useEffect(() => {
    return () => {
      cleanup_mouse_drag_ref.current?.();
    };
  }, []);

  useEffect(() => {
    if (!restore_token) {
      return;
    }
    set_is_restoring(true);
    const timeout = window.setTimeout(() => set_is_restoring(false), 360);
    return () => window.clearTimeout(timeout);
  }, [restore_token]);

  const move_drag = (event: PointerEvent<HTMLDivElement>) => {
    const drag_state = drag_state_ref.current;
    if (!drag_state || drag_state.pointer_id !== event.pointerId) {
      return;
    }
    event.preventDefault();
    on_drag?.({
      x: drag_state.origin_x + event.clientX - drag_state.start_x,
      y: drag_state.origin_y + event.clientY - drag_state.start_y,
    });
  };

  const end_drag = (event: PointerEvent<HTMLDivElement>) => {
    const drag_state = drag_state_ref.current;
    if (!drag_state || drag_state.pointer_id !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag_state_ref.current = null;
    set_is_dragging(false);
  };

  return (
    <div
      aria-label={title}
      className={cn(
        "operation-stage-window absolute flex min-h-0 min-w-0 cursor-default flex-col overflow-hidden rounded-[14px] border backdrop-blur-xl outline-none transition-[left,top,width,height,opacity,filter,box-shadow,border-radius] duration-300 ease-[cubic-bezier(.2,.82,.2,1)] focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.42)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent max-md:!relative max-md:!inset-auto max-md:!h-auto max-md:!min-h-[180px] max-md:!w-full max-md:max-w-full",
        tone === "terminal"
          ? "border-white/14 bg-[#0d151e]/95 text-[#d8e8e2] shadow-[0_30px_76px_rgba(0,8,16,0.34)]"
          : "border-white/60 bg-[rgba(250,252,253,0.96)] text-(--text-strong) shadow-[0_28px_72px_rgba(18,28,42,0.24)]",
        focus && "operation-stage-window-focus",
        maximized && "operation-stage-window-maximized rounded-[18px]",
        dimmed && "opacity-[0.62] saturate-[0.82]",
        is_dragging && "operation-stage-window-dragging select-none",
        is_restoring && "operation-stage-window-restoring",
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
      style={{
        "--operation-delay": `${delay_ms}ms`,
        "--operation-window-drag-x": `${drag_offset.x}px`,
        "--operation-window-drag-y": `${drag_offset.y}px`,
        zIndex: z_index,
        translate: `${drag_offset.x}px ${drag_offset.y}px`,
      } as CSSProperties}
      tabIndex={0}
    >
      <div
        className={cn(
          "flex h-8 shrink-0 cursor-grab touch-none items-center justify-between gap-2 border-b px-3 active:cursor-grabbing max-md:cursor-default",
          tone === "terminal"
            ? "border-white/10 bg-white/[0.035] text-[rgba(233,241,244,0.56)]"
            : "border-(--divider-subtle-color) bg-white/62 text-(--text-soft)",
        )}
        onPointerCancel={end_drag}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          on_zoom?.();
        }}
        onMouseDown={start_mouse_drag}
        onPointerDown={start_pointer_drag}
        onPointerMove={move_drag}
        onPointerUp={end_drag}
      >
        <div className="operation-window-traffic flex items-center gap-1.5">
          <button
            aria-label={`关闭 ${title}`}
            className="operation-window-traffic-button grid h-4 w-4 place-items-center rounded-full border border-[rgba(223,93,98,0.26)] bg-[rgba(223,93,98,0.58)] transition hover:bg-[rgba(223,93,98,0.86)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(223,93,98,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_close?.();
            }}
            title="关闭窗口"
            type="button"
          >
            <X className="operation-window-traffic-icon h-2.5 w-2.5 text-[#6f2024]" />
          </button>
          <button
            aria-label={`最小化 ${title}`}
            className="operation-window-traffic-button grid h-4 w-4 place-items-center rounded-full border border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.62)] transition hover:bg-[rgba(223,157,46,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(223,157,46,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_minimize?.();
            }}
            title="最小化窗口"
            type="button"
          >
            <Minus className="operation-window-traffic-icon h-2.5 w-2.5 text-[#735018]" />
          </button>
          <button
            aria-label={`${maximized ? "还原" : "缩放"} ${title}`}
            className="operation-window-traffic-button grid h-4 w-4 place-items-center rounded-full border border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.58)] transition hover:bg-[rgba(47,184,132,0.84)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,184,132,0.24)]"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              on_zoom?.();
            }}
            title={maximized ? "还原窗口" : "缩放窗口"}
            type="button"
          >
            {maximized ? (
              <Minimize2 className="operation-window-traffic-icon h-2.5 w-2.5 text-[#1d6048]" />
            ) : (
              <Maximize2 className="operation-window-traffic-icon h-2.5 w-2.5 text-[#1d6048]" />
            )}
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-[10px] font-semibold">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">
            {app_label ? `${app_label} · ${title}` : title}
          </span>
        </div>
        <span aria-hidden="true" className="h-4 w-[52px] shrink-0" />
      </div>
      <div className={cn(
        "soft-scrollbar relative min-h-0 flex-1",
        tone === "terminal"
          ? "overflow-hidden bg-[#090e14] p-0"
          : content_mode === "flush"
            ? "overflow-hidden p-0"
            : "overflow-auto p-4",
        minimized && "hidden",
      )}>
        {tone !== "terminal" && content_mode !== "flush" ? (
          <div className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-[10px] border border-(--divider-subtle-color) bg-white/72 text-(--icon-muted) opacity-30">
            <Icon className="h-3.5 w-3.5" />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
