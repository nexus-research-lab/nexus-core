export interface AppConversationState {
  session_key: string | null;
  set_session_key: (session_key: string | null) => void;
  clear_session_key: () => void;
}
