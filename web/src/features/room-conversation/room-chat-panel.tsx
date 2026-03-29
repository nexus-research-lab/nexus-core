"use client";

import { useEffect, useMemo } from "react";

import { useAgentConversation } from "@/hooks/agent";
import { useConversationLoader } from "@/hooks/use-conversation-loader";
import { useExtractTodos } from "@/hooks/use-extract-todos";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { Message } from "@/types/message";
import { ConversationSnapshotPayload } from "@/types/conversation";
import { TodoItem } from "@/types/todo";

import { RoomComposerPanel } from "./room-composer-panel";
import { RoomConversationEmptyState } from "./room-conversation-empty-state";
import { RoomConversationFeed } from "./room-conversation-feed";
import { RoomConversationHeader } from "./room-conversation-header";
import { RoomScrollToLatestButton } from "./room-scroll-to-latest-button";

interface RoomChatPanelProps {
  agent_id: string | null;
  current_agent_name?: string | null;
  current_room_title?: string | null;
  session_key: string | null;
  session_title?: string | null;
  on_create_conversation?: (title?: string) => void | Promise<string | null>;
  layout?: "desktop" | "mobile";
  on_open_workspace_file?: (path: string) => void;
  on_todos_change?: (todos: TodoItem[]) => void;
  on_loading_change?: (is_loading: boolean) => void;
  on_conversation_snapshot_change?: (snapshot: ConversationSnapshotPayload) => void;
  hide_header?: boolean;
}

function groupMessagesByRound(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const round_id = message.round_id || message.message_id;
    if (!groups.has(round_id)) {
      groups.set(round_id, []);
    }
    groups.get(round_id)!.push(message);
  }

  return groups;
}

function get_latest_reply_timestamp(messages: Message[]): number | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant" && message.role !== "result") {
      continue;
    }
    if (Number.isFinite(message.timestamp) && message.timestamp > 0) {
      return message.timestamp;
    }
  }

  const last_message = messages[messages.length - 1];
  if (last_message && Number.isFinite(last_message.timestamp) && last_message.timestamp > 0) {
    return last_message.timestamp;
  }

  return null;
}

export function RoomChatPanel({
  agent_id,
  current_agent_name,
  current_room_title,
  session_key: external_session_key,
  session_title,
  on_create_conversation,
  layout = "desktop",
  on_open_workspace_file,
  on_todos_change,
  on_loading_change,
  on_conversation_snapshot_change,
  hide_header = false,
}: RoomChatPanelProps) {
  const is_mobile_layout = layout === "mobile";

  const {
    error,
    messages,
    session_key,
    is_loading,
    pending_permission,
    send_message,
    stop_generation,
    load_conversation,
    send_permission_response,
    delete_round,
    regenerate,
  } = useAgentConversation({
    agent_id,
    on_error: (err) => {
      console.error("Conversation error:", err);
    },
  });

  const {
    scroll_ref,
    feed_ref,
    bottom_anchor_ref,
    show_scroll_to_bottom,
    scroll_to_bottom,
    on_scroll,
    on_wheel,
    on_touch_start,
    on_touch_move,
    on_touch_end,
  } = useFollowScroll({
    trigger_deps: [messages, is_loading] as const,
    session_key: external_session_key,
  });

  const todos = useExtractTodos(messages, external_session_key);

  useEffect(() => {
    on_todos_change?.(todos);
  }, [on_todos_change, todos]);

  useEffect(() => {
    on_loading_change?.(is_loading);
  }, [is_loading, on_loading_change]);

  useEffect(() => {
    if (!external_session_key) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    const last_message = messages[messages.length - 1];
    const latest_reply_timestamp = get_latest_reply_timestamp(messages);
    on_conversation_snapshot_change?.({
      conversation_id: external_session_key,
      message_count: messages.length,
      ...(latest_reply_timestamp ? {last_activity_at: latest_reply_timestamp} : {}),
      session_id: last_message?.session_id ?? null,
    });
  }, [external_session_key, messages, on_conversation_snapshot_change]);

  useConversationLoader({
    conversation_id: external_session_key,
    load_conversation,
    debug_name: "RoomChatPanel",
  });

  const message_groups = useMemo(() => groupMessagesByRound(messages), [messages]);

  const handle_send_message = async (content: string) => {
    if (!content.trim() || is_loading) {
      return;
    }
    scroll_to_bottom("auto");

    try {
      await send_message(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handle_stop = () => {
    stop_generation();
  };

  const round_ids = Array.from(message_groups.keys());

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-transparent">

      {error && error.includes("服务器") ? (
        <div className="absolute left-1/2 top-4 z-50 max-w-md -translate-x-1/2">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/8 p-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">无法连接到后端服务</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  请确保后端服务正在运行 (端口 8010)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!external_session_key ? (
        <RoomConversationEmptyState on_create_conversation={on_create_conversation ?? (() => {})} />
      ) : (
        <>
          {!is_mobile_layout && !hide_header ? (
            <RoomConversationHeader
              active_tab="chat"
              conversation_count={1}
              conversations={[]}
              current_agent_name={current_agent_name ?? null}
              current_conversation_id={session_key}
              current_room_type="room"
              current_room_title={current_room_title ?? null}
              current_conversation_title={session_title ?? null}
              is_detail_panel_open={false}
              is_loading={is_loading}
              member_count={1}
              on_change_tab={() => {}}
              on_select_conversation={() => {}}
              on_toggle_detail_panel={() => {}}
              room_members={[]}
            />
          ) : null}

          <div
            ref={scroll_ref}
            className={
              is_mobile_layout
                ? "soft-scrollbar relative z-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-1 py-2"
                : "soft-scrollbar relative z-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#fcfcfd] px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7"
            }
            style={{ overflowAnchor: "none" }}
            onScroll={on_scroll}
            onTouchEnd={on_touch_end}
            onTouchMove={on_touch_move}
            onTouchStart={on_touch_start}
            onWheel={on_wheel}
          >
            <RoomConversationFeed
              bottom_anchor_ref={bottom_anchor_ref}
              feed_ref={feed_ref}
              scroll_ref={scroll_ref}
              current_agent_name={current_agent_name ?? null}
              is_last_round_pending_permission={pending_permission}
              is_loading={is_loading}
              is_mobile_layout={is_mobile_layout}
              message_groups={message_groups}
              on_delete_round={delete_round}
              on_open_workspace_file={on_open_workspace_file}
              on_permission_response={send_permission_response}
              on_regenerate_round={regenerate}
              round_ids={round_ids}
            />
          </div>

          {show_scroll_to_bottom ? (
            <RoomScrollToLatestButton
              is_loading={is_loading}
              is_mobile_layout={is_mobile_layout}
              on_click={() => scroll_to_bottom("smooth")}
            />
          ) : null}

          <RoomComposerPanel
            compact={is_mobile_layout}
            current_agent_name={current_agent_name ?? null}
            is_loading={is_loading}
            on_send_message={handle_send_message}
            on_stop={handle_stop}
          />
        </>
      )}
    </div>
  );
}
