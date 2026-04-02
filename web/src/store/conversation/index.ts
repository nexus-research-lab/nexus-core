import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createBrowserJSONStorage } from "@/lib/browser-storage";
import { ConversationStoreState } from "@/types/conversation";

import * as actions from "./actions";

interface PersistedConversationStoreState {
  conversations?: ConversationStoreState["conversations"];
  current_session_key?: string | null;
}

export const useConversationStore = create<ConversationStoreState>()(
  persist(
    (set, get) => ({
      conversations: [],
      current_session_key: null,
      loading: false,
      error: null,

      create_conversation: actions.createConversationAction(set),
      delete_conversation: actions.deleteConversationAction(set),
      update_conversation: actions.updateConversationAction(set),
      set_current_session_key: actions.setCurrentSessionKeyAction(set),
      sync_conversation_snapshot: actions.syncConversationSnapshotAction(set),
      get_conversation: actions.getConversationAction(get),
      load_conversations_from_server: actions.loadConversationsFromServerAction(set),
      clear_all_conversations: actions.clearAllConversationsAction(set),
    }),
    {
      name: "agent-ui-conversations",
      storage: createBrowserJSONStorage(),
      version: 3,
      migrate: (persisted_state: unknown): PersistedConversationStoreState => {
        const state = (persisted_state ?? {}) as PersistedConversationStoreState;
        return {
          conversations: Array.isArray(state.conversations) ? state.conversations : [],
          current_session_key: state.current_session_key ?? null,
        };
      },
      partialize: (state) => ({
        conversations: state.conversations,
        current_session_key: state.current_session_key,
      }),
    },
  ),
);

export function getConversationStoreSnapshot(): ConversationStoreState {
  return useConversationStore.getState();
}

export { generateConversationKey, createDefaultConversation } from "./utils";
