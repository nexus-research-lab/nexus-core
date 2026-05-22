import { useEffect } from "react";
import type { RefObject } from "react";

import {
  COMPOSER_DRAFT_EVENT,
} from "./composer-draft-events";
import type {
  ComposerDraftEventDetail,
} from "./composer-draft-events";

interface UseComposerDraftEventsOptions {
  is_input_locked: boolean;
  setAttachmentError: (error: string | null) => void;
  setInput: (updater: (current_value: string) => string) => void;
  set_mention_active: (active: boolean) => void;
  textarea_ref: RefObject<HTMLTextAreaElement | null>;
}

export function useComposerDraftEvents({
  is_input_locked,
  setAttachmentError,
  setInput,
  set_mention_active,
  textarea_ref,
}: UseComposerDraftEventsOptions) {
  useEffect(() => {
    const handle_composer_draft = (event: Event) => {
      if (is_input_locked) {
        return;
      }

      const detail = (event as CustomEvent<ComposerDraftEventDetail>).detail;
      const text = detail?.text?.trim();
      if (!text) {
        return;
      }

      setInput((current_value) => {
        if (detail.mode === "append" && current_value.trim()) {
          return `${current_value.trimEnd()}\n${text}`;
        }
        return text;
      });
      setAttachmentError(null);
      set_mention_active(false);
      requestAnimationFrame(() => {
        textarea_ref.current?.focus();
        const length = textarea_ref.current?.value.length ?? text.length;
        textarea_ref.current?.setSelectionRange(length, length);
      });
    };

    window.addEventListener(COMPOSER_DRAFT_EVENT, handle_composer_draft);
    return () => window.removeEventListener(COMPOSER_DRAFT_EVENT, handle_composer_draft);
  }, [
    is_input_locked,
    setAttachmentError,
    setInput,
    set_mention_active,
    textarea_ref,
  ]);
}
