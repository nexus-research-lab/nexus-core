export const OPERATION_MAX_TEXT_PREVIEW = 1200;
const OPERATION_MAX_RUNNABLE_ARTIFACT_PREVIEW = 32000;
const SECRET_KEY_PATTERN = /(api[_-]?key|token|password|secret|authorization|cookie|credential|private[_-]?key)/i;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})/g;

export function summarize_projected_value(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return truncate_projected_text(value.replace(SECRET_VALUE_PATTERN, "[REDACTED]"), 180);
  }
  try {
    return truncate_projected_text(JSON.stringify(redact_projected_value(value)), 180);
  } catch {
    return truncate_projected_text(String(value), 180);
  }
}

export function redact_projected_value(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]";
  }
  if (typeof value === "string") {
    return truncate_projected_text(value.replace(SECRET_VALUE_PATTERN, "[REDACTED]"), OPERATION_MAX_TEXT_PREVIEW);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => redact_projected_value(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        next[key] = "[REDACTED]";
        continue;
      }
      if (typeof item === "string" && key === "content" && looks_like_runnable_artifact(item)) {
        next[key] = truncate_projected_text(
          item.replace(SECRET_VALUE_PATTERN, "[REDACTED]"),
          OPERATION_MAX_RUNNABLE_ARTIFACT_PREVIEW,
        );
        continue;
      }
      next[key] = redact_projected_value(item, depth + 1);
    }
    return next;
  }
  return value;
}

export function truncate_projected_text(value: string, max_length: number): string {
  if (value.length <= max_length) {
    return value;
  }
  return `${value.slice(0, max_length - 1)}…`;
}

function looks_like_runnable_artifact(value: string): boolean {
  return /<!doctype html|<html[\s>]|<body[\s>]|<script[\s>]/i.test(value);
}
