import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppRouteBuilders } from "@/app/router/route-paths";
import { ContactsDirectory } from "@/features/contacts/contacts-directory";
import { validateAgentNameApi } from "@/lib/agent-manage-api";
import { ensureDirectRoom } from "@/lib/room-api";
import { AppStage } from "@/shared/ui/app-stage";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import { AgentOptions } from "@/shared/ui/agent-options-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { WorkspacePageFrame } from "@/shared/ui/workspace-page-frame";
import { useAgentStore } from "@/store/agent";
import { useConversationStore } from "@/store/conversation";
import { AgentOptions as AgentConfigOptions } from "@/types/agent";
import { ContactsRouteParams } from "@/types/route";
import { initialOptions } from "@/config/options";

export function ContactsPage() {
  const params = useParams<ContactsRouteParams>();
  const navigate = useNavigate();
  const {
    agents,
    create_agent,
    update_agent,
    delete_agent,
    load_agents_from_server,
    loading,
  } = useAgentStore();
  const { conversations, load_conversations_from_server } = useConversationStore();
  const [is_dialog_open, set_is_dialog_open] = useState(false);
  const [dialog_mode, set_dialog_mode] = useState<"create" | "edit">("create");
  const [editing_agent_id, set_editing_agent_id] = useState<string | null>(null);
  const [pending_delete_agent_id, set_pending_delete_agent_id] = useState<string | null>(null);

  const selected_agent = useMemo(
    () => agents.find((agent) => agent.agent_id === params.agent_id) ?? agents[0] ?? null,
    [agents, params.agent_id],
  );
  const editing_agent = useMemo(
    () => agents.find((agent) => agent.agent_id === editing_agent_id) ?? null,
    [agents, editing_agent_id],
  );
  const dialog_initial_title = useMemo(
    () => (dialog_mode === "edit" ? editing_agent?.name : undefined),
    [dialog_mode, editing_agent?.name],
  );
  const dialog_initial_options = useMemo(() => {
    if (dialog_mode !== "edit" || !editing_agent) {
      return initialOptions;
    }

    return {
      model: editing_agent.options.model,
      permission_mode: editing_agent.options.permission_mode,
      allowed_tools: editing_agent.options.allowed_tools,
      disallowed_tools: editing_agent.options.disallowed_tools,
      max_turns: editing_agent.options.max_turns,
      max_thinking_tokens: editing_agent.options.max_thinking_tokens,
      skills_enabled: editing_agent.options.skills_enabled,
      setting_sources: editing_agent.options.setting_sources,
      system_prompt: editing_agent.options.system_prompt,
    };
  }, [dialog_mode, editing_agent]);

  const handle_open_direct_room = useCallback((agent_id: string) => {
    void ensureDirectRoom(agent_id).then((context) => {
      navigate(
        AppRouteBuilders.room_conversation(
          context.room.id,
          context.conversation.id,
        ),
      );
    });
  }, [navigate]);

  const handle_open_create_agent = useCallback(() => {
    set_dialog_mode("create");
    set_editing_agent_id(null);
    set_is_dialog_open(true);
  }, []);

  const handle_open_edit_agent = useCallback((agent_id: string) => {
    set_dialog_mode("edit");
    set_editing_agent_id(agent_id);
    set_is_dialog_open(true);
  }, []);

  const handle_validate_agent_name = useCallback(async (name: string) => {
    const exclude_agent_id = dialog_mode === "edit" ? editing_agent_id ?? undefined : undefined;
    return validateAgentNameApi(name, exclude_agent_id);
  }, [dialog_mode, editing_agent_id]);

  const handle_save_agent = useCallback(async (title: string, options: AgentConfigOptions) => {
    const next_options = {
      model: options.model,
      permission_mode: options.permission_mode,
      allowed_tools: options.allowed_tools,
      disallowed_tools: options.disallowed_tools,
      skills_enabled: options.skills_enabled,
      setting_sources: options.setting_sources,
      system_prompt: options.system_prompt,
    };

    if (dialog_mode === "create") {
      const created_agent_id = await create_agent({
        name: title,
        options: next_options,
      });
      navigate(AppRouteBuilders.contact_profile(created_agent_id));
      return;
    }

    if (dialog_mode === "edit" && editing_agent_id) {
      await update_agent(editing_agent_id, {
        name: title,
        options: next_options,
      });
    }
  }, [create_agent, dialog_mode, editing_agent_id, navigate, update_agent]);

  const handle_request_delete_agent = useCallback((agent_id: string) => {
    set_pending_delete_agent_id(agent_id);
  }, []);

  const handle_confirm_delete_agent = useCallback(async () => {
    if (!pending_delete_agent_id) {
      return;
    }

    const remaining_agents = agents.filter((agent) => agent.agent_id !== pending_delete_agent_id);
    await delete_agent(pending_delete_agent_id);
    set_pending_delete_agent_id(null);

    if (selected_agent?.agent_id === pending_delete_agent_id) {
      const next_agent = remaining_agents[0] ?? null;
      navigate(
        next_agent
          ? AppRouteBuilders.contact_profile(next_agent.agent_id)
          : AppRouteBuilders.contacts(),
      );
    }
  }, [agents, delete_agent, navigate, pending_delete_agent_id, selected_agent?.agent_id]);

  useEffect(() => {
    void load_agents_from_server();
    void load_conversations_from_server();
  }, [load_agents_from_server, load_conversations_from_server]);

  if (loading && !agents.length) {
    return <AppLoadingScreen />;
  }

  return (
    <AppStage active_rail_item="contacts">
      <WorkspacePageFrame content_padding_class_name="p-0">
        <ContactsDirectory
          agents={agents}
          conversations={conversations}
          on_open_direct_room={handle_open_direct_room}
          on_create_agent={handle_open_create_agent}
          on_edit_agent={handle_open_edit_agent}
          on_delete_agent={handle_request_delete_agent}
          selected_agent_id={params.agent_id}
        />
      </WorkspacePageFrame>

      <AgentOptions
        mode={dialog_mode}
        is_open={is_dialog_open}
        on_close={() => set_is_dialog_open(false)}
        on_save={handle_save_agent}
        on_validate_name={handle_validate_agent_name}
        initial_title={dialog_initial_title}
        initial_options={dialog_initial_options}
      />

      <ConfirmDialog
        is_open={Boolean(pending_delete_agent_id)}
        title="删除成员"
        message="删除后，该成员将不再出现在 Contacts 中。已有历史协作不会自动删除。"
        confirm_text="删除成员"
        on_confirm={() => {
          void handle_confirm_delete_agent();
        }}
        on_cancel={() => set_pending_delete_agent_id(null)}
        variant="danger"
      />
    </AppStage>
  );
}
