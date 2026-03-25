import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createBrowserJSONStorage } from "@/lib/browser-storage";
import { AppConversationState } from "@/types/app-conversation";

export const useAppConversationStore = create<AppConversationState>()(
  persist(
    (set) => ({
      conversation_key: null,

      set_conversation_key: (conversation_key: string | null) => {
        set({ conversation_key });
      },

      clear_conversation_key: () => {
        set({ conversation_key: null });
      },
    }),
    {
      name: "agent-ui-app-conversation",
      storage: createBrowserJSONStorage(),
      partialize: (state) => ({
        conversation_key: state.conversation_key,
      }),
    },
  ),
);
