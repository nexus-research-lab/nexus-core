import type { NexusOperationEvent } from "../operation-types";

const FILE_CONTENT_KEYS = [
  "content",
  "new_str",
  "newString",
  "replacement",
  "text",
  "body",
  "source",
] as const;

export function resolve_file_preview_value(
  event: NexusOperationEvent,
  payload_preview: unknown,
): unknown {
  return payload_preview
    ?? extract_file_content(event.input_preview)
    ?? event.result_preview
    ?? event.summary;
}

function extract_file_content(input: Record<string, unknown> | null | undefined): string | null {
  if (!input) {
    return null;
  }

  for (const key of FILE_CONTENT_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const patch = input.patch ?? input.diff;
  if (typeof patch === "string" && patch.trim()) {
    return patch;
  }

  return null;
}
