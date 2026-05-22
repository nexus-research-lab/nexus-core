export const COMPOSER_DRAFT_EVENT = "nexus:conversation-composer-draft";

export interface ComposerDraftEventDetail {
  mode?: "append" | "replace";
  text: string;
}

export function emit_composer_draft(detail: ComposerDraftEventDetail) {
  window.dispatchEvent(new CustomEvent<ComposerDraftEventDetail>(COMPOSER_DRAFT_EVENT, {
    detail,
  }));
}
