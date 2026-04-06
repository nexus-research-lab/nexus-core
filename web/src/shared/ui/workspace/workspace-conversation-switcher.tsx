/**
 * =====================================================
 * @File   : workspace-conversation-switcher.tsx
 * @Date   : 2026-04-04 21:57
 * @Author : leemysw
 * 2026-04-04 21:57   Create
 * =====================================================
 */

"use client";

import { useState } from "react";
import { Check, ChevronDown, LucideIcon, MessageSquare, MessageSquarePlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/shared/i18n/i18n-context";
import { RoomConversationView } from "@/types/conversation";

interface WorkspaceConversationSwitcherProps {
  conversations: RoomConversationView[];
  conversation_id: string | null;
  density?: "default" | "compact";
  on_select_conversation: (conversation_id: string) => void;
  on_create_conversation?: (title?: string) => Promise<string | null>;
  icon?: LucideIcon;
}

export function WorkspaceConversationSwitcher({
  conversations,
  conversation_id,
  density = "compact",
  on_select_conversation,
  on_create_conversation,
  icon: Icon = MessageSquare,
}: WorkspaceConversationSwitcherProps) {
  const { t } = useI18n();
  const [is_open, set_is_open] = useState(false);
  const [is_creating, set_is_creating] = useState(false);
  const trigger_style = is_open
    ? {
      background: "var(--surface-popover-background)",
      border: "1px solid var(--surface-popover-border)",
    }
    : {
      background: "var(--chip-default-background)",
      border: "1px solid var(--chip-default-border)",
    };

  const current_title =
    conversations.find((conversation) => conversation.conversation_id === conversation_id)?.title
    ?? t("room.choose_conversation");

  const handle_create = async () => {
    if (!on_create_conversation || is_creating) return;
    set_is_creating(true);
    set_is_open(false);
    try {
      await on_create_conversation();
    } finally {
      set_is_creating(false);
    }
  };

  return (
    <div className="relative">
      <button
        className={cn(
          "flex max-w-[168px] items-center gap-1 rounded-full text-[color:var(--text-default)] transition duration-150 ease-out",
          density === "compact" ? "h-5 px-2.5 text-[10.5px]" : "h-8 px-3 text-[11px]",
        )}
        style={trigger_style}
        onClick={() => set_is_open((prev) => !prev)}
        type="button"
      >
        <span className="max-w-[124px] truncate">{current_title}</span>
        <ChevronDown className={cn("h-3 w-3 text-[color:var(--icon-muted)] transition-transform", is_open && "rotate-180 text-[color:var(--icon-default)]")} />
      </button>

      {is_open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => set_is_open(false)}
          />
          <div
            className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-[18px] py-1"
            style={{
              background: "var(--surface-popover-background)",
              border: "1px solid var(--surface-popover-border)",
              backdropFilter: "blur(16px)",
            }}
          >
            {conversations.length > 0 ? (
              <>
                {conversations.map((conversation) => {
                  const is_active = conversation.conversation_id === conversation_id;
                  return (
                    <button
                      key={conversation.conversation_id}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-[7px] text-left text-[11px] transition duration-150 ease-out",
                        is_active
                          ? "border-y border-transparent font-semibold text-[color:var(--text-strong)]"
                          : "text-[color:var(--text-default)] hover:bg-[var(--surface-interactive-hover-background)] hover:text-[color:var(--text-strong)]",
                      )}
                      style={is_active ? {
                        background:
                          "var(--surface-interactive-active-background)",
                        borderColor: "var(--surface-interactive-active-border)",
                      } : undefined}
                      onClick={() => {
                        on_select_conversation(conversation.conversation_id);
                        set_is_open(false);
                      }}
                      type="button"
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", is_active ? "text-[color:var(--icon-default)]" : "text-[color:var(--icon-muted)]")} />
                      <span className="min-w-0 flex-1 truncate">
                        {conversation.title || t("room.untitled_conversation")}
                      </span>
                      {is_active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : null}
                    </button>
                  );
                })}
                {on_create_conversation ? (
                  <div className="mx-3 my-1 border-t divider-subtle" />
                ) : null}
                {on_create_conversation ? (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-[7px] text-left text-[11px] font-medium text-emerald-600 transition duration-150 ease-out hover:bg-[var(--surface-interactive-hover-background)] disabled:opacity-60"
                    disabled={is_creating}
                    onClick={handle_create}
                    type="button"
                  >
                    <MessageSquarePlus className={cn("h-3.5 w-3.5 shrink-0", is_creating && "animate-spin")} />
                    <span className="min-w-0 flex-1">
                      {is_creating ? t("room.creating") : t("room.new_conversation")}
                    </span>
                  </button>
                ) : null}
              </>
            ) : (
              <div className="px-3 py-2 text-[11px] text-[color:var(--text-soft)]">{t("room.no_conversations")}</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
