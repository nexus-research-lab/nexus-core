"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, LoaderCircle, RotateCcw, X, } from "lucide-react";

import {
  HeroActionOrbShell,
  HeroActionPillShell,
  HeroInputShell,
  HeroSidePanelShell,
} from "@/features/launcher/launcher-glass-shell";
import { ConversationFeed } from "@/features/conversation-shared/conversation-feed";
import { ScrollToLatestButton } from "@/features/conversation-shared/scroll-to-latest-button";
import { cn } from "@/lib/utils";
import { useTextareaHeight } from "@/hooks/use-textarea-height";
import { Message } from "@/types/message";
import { PendingPermission, PermissionDecisionPayload } from "@/types/permission";
import { WebSocketState } from "@/types/websocket";

interface LauncherAppConversationPanelProps {
  app_conversation_draft: string;
  app_conversation_messages: Message[];
  error: string | null;
  is_info_mode?: boolean;
  is_loading: boolean;
  ws_state: WebSocketState;
  on_clear_session: () => void;
  on_change_draft: (next_value: string) => void;
  on_close: () => void;
  on_permission_response: (payload: PermissionDecisionPayload) => boolean;
  on_stop_generation: () => void;
  on_submit: (next_prompt: string) => void;
  pending_permissions: PendingPermission[];
}

const BOTTOM_THRESHOLD_PX = 80;
const SMOOTH_SCROLL_DURATION_MS = 420;
const EASE_X1 = 0.23;
const EASE_Y1 = 1;
const EASE_X2 = 0.32;
const EASE_Y2 = 1;

function sample_cubic(a: number, b: number, c: number, t: number): number {
  return ((a * t + b) * t + c) * t;
}

function sample_cubic_derivative(a: number, b: number, c: number, t: number): number {
  return (3 * a * t + 2 * b) * t + c;
}

function solve_bezier_progress(progress: number): number {
  const clamped_progress = Math.min(Math.max(progress, 0), 1);
  const cx = 3 * EASE_X1;
  const bx = 3 * (EASE_X2 - EASE_X1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * EASE_Y1;
  const by = 3 * (EASE_Y2 - EASE_Y1) - cy;
  const ay = 1 - cy - by;

  let t = clamped_progress;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const x = sample_cubic(ax, bx, cx, t) - clamped_progress;
    const derivative = sample_cubic_derivative(ax, bx, cx, t);
    if (Math.abs(derivative) < 1e-6) {
      break;
    }
    t -= x / derivative;
  }

  let lower = 0;
  let upper = 1;
  t = Math.min(Math.max(t, 0), 1);
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const x = sample_cubic(ax, bx, cx, t);
    if (Math.abs(x - clamped_progress) < 1e-5) {
      break;
    }
    if (x > clamped_progress) {
      upper = t;
    } else {
      lower = t;
    }
    t = (lower + upper) / 2;
  }

  return sample_cubic(ay, by, cy, t);
}

function group_messages_by_round(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const round_id = message.round_id || message.message_id;
    const current_group = groups.get(round_id) ?? [];
    current_group.push(message);
    groups.set(round_id, current_group);
  }

  return groups;
}

export function LauncherAppConversationPanel({
  app_conversation_draft,
  app_conversation_messages,
  error,
  is_info_mode = false,
  is_loading,
  ws_state,
  on_clear_session,
  on_change_draft,
  on_close,
  on_permission_response,
  on_stop_generation,
  on_submit,
  pending_permissions,
}: LauncherAppConversationPanelProps) {
  const scroll_ref = useRef<HTMLDivElement>(null);
  const bottom_anchor_ref = useRef<HTMLDivElement>(null);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);
  const is_composing_ref = useRef(false);
  const should_follow_latest_ref = useRef(true);
  const pending_scroll_frame_ref = useRef<number | null>(null);
  const pending_scroll_inner_frame_ref = useRef<number | null>(null);
  const [show_scroll_to_bottom, set_show_scroll_to_bottom] = useState(false);
  const message_groups = useMemo(
    () => group_messages_by_round(app_conversation_messages),
    [app_conversation_messages],
  );
  const round_ids = useMemo(() => Array.from(message_groups.keys()), [message_groups]);

  const connection_meta = useMemo(() => {
    if (is_loading) {
      return {
        label: "回复中",
        badge_class_name: "text-emerald-900/78",
        dot_class_name: "bg-emerald-400",
      };
    }

    if (ws_state === "connected") {
      return {
        label: "已连接",
        badge_class_name: "text-slate-700/48",
        dot_class_name: "bg-[#7fe3a8]",
      };
    }

    if (ws_state === "connecting") {
      return {
        label: "连接中",
        badge_class_name: "text-slate-700/48",
        dot_class_name: "bg-slate-300",
      };
    }

    return {
      label: "正在重连",
      badge_class_name: "text-amber-900/68",
      dot_class_name: "bg-amber-300",
    };
  }, [is_loading, ws_state]);

  const can_send_message = (
    ws_state === "connected" &&
    !is_loading &&
    app_conversation_draft.trim().length > 0
  );

  const update_follow_state = useCallback(() => {
    const container = scroll_ref.current;
    if (!container) {
      return;
    }

    const distance_to_bottom = (
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight
    );
    const is_near_bottom = distance_to_bottom <= BOTTOM_THRESHOLD_PX;
    should_follow_latest_ref.current = is_near_bottom;
    set_show_scroll_to_bottom(!is_near_bottom);
  }, []);

  const cancel_pending_scroll = useCallback(() => {
    if (pending_scroll_frame_ref.current !== null) {
      cancelAnimationFrame(pending_scroll_frame_ref.current);
      pending_scroll_frame_ref.current = null;
    }
    if (pending_scroll_inner_frame_ref.current !== null) {
      cancelAnimationFrame(pending_scroll_inner_frame_ref.current);
      pending_scroll_inner_frame_ref.current = null;
    }
  }, []);

  const scroll_to_bottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scroll_ref.current;
    if (!container) {
      return;
    }

    cancel_pending_scroll();
    should_follow_latest_ref.current = true;
    set_show_scroll_to_bottom(false);
    pending_scroll_frame_ref.current = requestAnimationFrame(() => {
      const next = scroll_ref.current;
      if (!next) {
        return;
      }

      const target_top = next.scrollHeight;
      if (behavior === "auto") {
        next.scrollTop = target_top;
        return;
      }

      const start_top = next.scrollTop;
      const distance = target_top - start_top;
      if (Math.abs(distance) < 1) {
        next.scrollTop = target_top;
        return;
      }

      const start_time = performance.now();

      const step = (now: number) => {
        const elapsed = now - start_time;
        const progress = Math.min(elapsed / SMOOTH_SCROLL_DURATION_MS, 1);
        const eased_progress = solve_bezier_progress(progress);

        next.scrollTop = start_top + distance * eased_progress;

        if (progress < 1) {
          pending_scroll_inner_frame_ref.current = requestAnimationFrame(step);
        } else {
          pending_scroll_inner_frame_ref.current = null;
        }
      };

      pending_scroll_inner_frame_ref.current = requestAnimationFrame(step);
    });
  }, [cancel_pending_scroll]);

  useEffect(() => {
    if (!should_follow_latest_ref.current) {
      update_follow_state();
      return;
    }

    scroll_to_bottom(is_loading ? "auto" : "smooth");
  }, [app_conversation_messages, is_loading, scroll_to_bottom, update_follow_state]);

  useEffect(() => {
    return () => cancel_pending_scroll();
  }, [cancel_pending_scroll]);

  useTextareaHeight(textarea_ref, app_conversation_draft, {
    minHeight: 28,
    maxHeight: 144,
    lineHeight: 24,
  });

  const handle_submit = useCallback(() => {
    if (!can_send_message) {
      return;
    }
    should_follow_latest_ref.current = true;
    set_show_scroll_to_bottom(false);
    on_submit(app_conversation_draft);
  }, [app_conversation_draft, can_send_message, on_submit]);

  const handle_key_down = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (is_composing_ref.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Escape" && is_loading) {
      event.preventDefault();
      on_stop_generation();
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    handle_submit();
  }, [handle_submit, is_loading, on_stop_generation]);

  return (
    <HeroSidePanelShell class_name="h-full min-h-[620px] w-full max-w-[512px]">
      <div className="flex h-full min-h-0 flex-col mx-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <HeroActionPillShell class_name="w-fit">
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/72">
                <span className={cn("h-3 w-3 rounded-full", connection_meta.dot_class_name)} />
                Nexus
              </span>
              <span className={cn("text-[11px] font-medium", connection_meta.badge_class_name)}>
                {connection_meta.label}
              </span>
            </HeroActionPillShell>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="清空 Nexus 对话"
              className="transition-transform duration-300 hover:-translate-y-0.5"
              onClick={on_clear_session}
              type="button"
            >
              <HeroActionOrbShell class_name="h-[46px] w-[46px]">
                <RotateCcw className="h-4 w-4 text-foreground/76" />
              </HeroActionOrbShell>
            </button>
            <button
              aria-label="关闭 Nexus 对话"
              className="transition-transform duration-300 hover:-translate-y-0.5"
              onClick={on_close}
              type="button"
            >
              <HeroActionOrbShell class_name="h-[54px] w-[54px]">
                <X className="h-4 w-4 text-foreground/76" />
              </HeroActionOrbShell>
            </button>
          </div>
        </div>

        <div
          className="relative mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-[rgba(243,246,251,0.48)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
          {error ? (
            <div
              className="mx-3 mt-3 flex items-start gap-2 rounded-[20px] bg-[rgba(255,243,243,0.74)] px-3 py-2 text-xs leading-5 text-red-900/84 shadow-[inset_0_0_0_1px_rgba(255,120,120,0.14)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div
            ref={scroll_ref}
            className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3"
            onScroll={update_follow_state}
          >
            {app_conversation_messages.length ? (
              <ConversationFeed
                bottom_anchor_ref={bottom_anchor_ref}
                compact
                current_agent_name="Nexus"
                is_last_round_pending_permissions={pending_permissions}
                is_loading={is_loading}
                is_mobile_layout
                message_groups={message_groups}
                on_permission_response={on_permission_response}
                round_ids={round_ids}
              />
            ) : (
              <div className="flex min-h-80 flex-col justify-center px-5 py-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/42">
                  {is_info_mode ? "Nexus Status" : "Nexus Chat"}
                </p>
                <p className="mt-3 text-base font-semibold text-foreground/84">
                  {is_info_mode ? "这里会显示 Nexus 当前整理出的协作信息" : "告诉 Nexus 你要推进什么"}
                </p>
              </div>
            )}
          </div>

          {show_scroll_to_bottom ? (
            <ScrollToLatestButton
              is_loading={is_loading}
              is_mobile_layout={true}
              on_click={() => scroll_to_bottom("smooth")}
            />
          ) : null}
        </div>
      </div>
    </HeroSidePanelShell>
  );
}
