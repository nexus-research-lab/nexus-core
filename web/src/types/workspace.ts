import { AgentConversationIdentity } from "@/types/agent-conversation";
import { Conversation } from "@/types/conversation";

export interface HomeWorkspaceControllerOptions {
  current_agent_id: string | null;
  current_agent_conversation: Conversation | null;
  current_agent_session_identity: AgentConversationIdentity | null;
}
