import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createBrowserJSONStorage } from "@/lib/browser-storage";
import { AppConversationState } from "@/types/app-conversation";

export const useAppConversationStore = create<AppConversationState>()(
  persist(
    (set) => ({
      session_key: null,

      set_session_key: (session_key: string | null) => {
        set({ session_key });
      },

      clear_session_key: () => {
        set({ session_key: null });
      },
    }),
    {
      name: "agent-ui-app-conversation",
      storage: createBrowserJSONStorage(),
      version: 3,
      partialize: (state) => ({
        session_key: state.session_key,
      }),
    },
  ),
);
