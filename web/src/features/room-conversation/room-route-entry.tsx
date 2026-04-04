import { ArrowRight, MessageSquare, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AppRouteBuilders } from "@/app/router/route-paths";
import { useI18n } from "@/shared/i18n/i18n-context";
import { WorkspaceActionBar, WorkspaceActionCard } from "@/shared/ui/workspace/workspace-action-bar";
import { Agent } from "@/types/agent";
import { Conversation } from "@/types/conversation";

interface RoomRouteEntryProps {
  room_id?: string;
  conversation_id?: string;
  agents: Agent[];
  conversations: Conversation[];
}

export function RoomRouteEntry({
  room_id,
  conversation_id,
  agents,
  conversations,
}: RoomRouteEntryProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const room_agent = agents[0] ?? null;
  const recent_room_conversations = conversations
    .filter((conversation): conversation is Conversation & { conversation_id: string } => (
      conversation.room_id === room_id && Boolean(conversation.conversation_id)
    ))
    .sort((left, right) => right.last_activity_at - left.last_activity_at)
    .slice(0, 4);

  return (
    <div className="grid flex-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="workspace-card rounded-[30px] px-6 py-6">
        <h2 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-slate-950/90">
          {room_agent ? room_agent.name : t("room.route_empty_title")}
        </h2>

        <WorkspaceActionBar variant="cards">
          <WorkspaceActionCard
            description={t("room.route_back_launcher_description")}
            icon={<MessageSquare className="h-5 w-5 text-slate-900/78" />}
            on_click={() => navigate(AppRouteBuilders.launcher())}
            title={t("room.route_back_launcher")}
          />
          <WorkspaceActionCard
            description={t("room.route_browse_agents_description")}
            icon={<Users className="h-5 w-5 text-slate-900/78" />}
            on_click={() => navigate(AppRouteBuilders.contacts())}
            title={t("room.route_browse_agents")}
          />
          <WorkspaceActionCard
            icon={<Sparkles className="h-5 w-5 text-slate-900/78" />}
            on_click={() => navigate(AppRouteBuilders.launcher())}
            title={t("room.route_handoff")}
          />
        </WorkspaceActionBar>
      </section>

      <aside className="workspace-card rounded-[30px] px-6 py-6">
        <div className="mt-4 grid gap-3">
          <div className="workspace-card rounded-3xl px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-700/46">Room</p>
            <p className="mt-1 text-sm font-semibold text-slate-950/86">{room_id ?? "-"}</p>
          </div>

          <div className="workspace-card rounded-3xl px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-700/46">
              {t("room.route_conversation")}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950/86">{conversation_id ?? "-"}</p>
          </div>

          {recent_room_conversations.length ? (
            <div className="workspace-card rounded-3xl px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-700/46">{t("room.route_recent")}</p>
              <div className="mt-3 space-y-2">
                {recent_room_conversations.map((conversation) => (
                  <button
                    key={conversation.conversation_id}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-3 text-left transition hover:bg-white/16"
                    onClick={() =>
                      navigate(
                        AppRouteBuilders.room_conversation(
                          conversation.room_id ?? room_id ?? "",
                          conversation.conversation_id,
                        ),
                      )
                    }
                    type="button"
                  >
                    <span className="truncate text-sm text-slate-900/84">
                      {conversation.title || t("room.untitled_conversation")}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-700/52" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
