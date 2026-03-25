export interface AppConversationState {
  conversation_key: string | null;
  set_conversation_key: (conversation_key: string | null) => void;
  clear_conversation_key: () => void;
}
