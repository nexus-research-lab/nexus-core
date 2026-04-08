import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createBrowserJSONStorage } from "@/lib/browser-storage";
import { ConversationStoreState } from "@/types/conversation";

import * as actions from "./actions";

interface PersistedConversationStoreState {
  conversations?: ConversationStoreState["conversations"];
}

export const useConversationStore = create<ConversationStoreState>()(
  persist(
    (set) => ({
      conversations: [],
      loading: false,
      error: null,

      sync_conversation_snapshot: actions.syncConversationSnapshotAction(set),
      load_conversations_from_server: actions.loadConversationsFromServerAction(set),
      clear_all_conversations: actions.clearAllConversationsAction(set),
    }),
    {
      name: "agent-ui-conversations",
      storage: createBrowserJSONStorage(),
      version: 4,
      migrate: (persisted_state: unknown): PersistedConversationStoreState => {
        const state = (persisted_state ?? {}) as PersistedConversationStoreState;
        return {
          conversations: Array.isArray(state.conversations) ? state.conversations : [],
        };
      },
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    },
  ),
);

export function getConversationStoreSnapshot(): ConversationStoreState {
  return useConversationStore.getState();
}
