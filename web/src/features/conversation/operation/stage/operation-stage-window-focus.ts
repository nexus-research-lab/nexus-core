import type { StageWindowState } from "../operation-desktop-types";

export function resolve_next_window_focus({
  current_focus_id,
  hidden_window_id,
  windows,
}: {
  current_focus_id: string | null;
  hidden_window_id: string;
  windows: StageWindowState[];
}): string | null {
  const visible_windows = windows.filter((window) => (
    window.id !== hidden_window_id &&
    window.phase !== "closed" &&
    window.phase !== "minimized"
  ));

  if (current_focus_id && visible_windows.some((window) => window.id === current_focus_id)) {
    return current_focus_id;
  }

  const focused_window = visible_windows.find((window) => window.phase === "focused");
  if (focused_window) {
    return focused_window.id;
  }

  return [...visible_windows]
    .sort((left, right) => right.z - left.z)[0]?.id ?? null;
}
