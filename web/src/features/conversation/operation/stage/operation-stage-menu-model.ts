import type { StageWindowState } from "../operation-desktop-types";

export interface StageMenuStatus {
  activity_label: string;
  dock_label: string | null;
  window_label: string;
}

export function build_stage_menu_status(
  windows: StageWindowState[],
  active_window: StageWindowState | null,
  app_label_for_window: (window: StageWindowState) => string,
): StageMenuStatus {
  const open_windows = windows.filter((window) => window.phase !== "closed");
  const minimized_count = open_windows.filter((window) => window.phase === "minimized").length;
  const visible_count = open_windows.length - minimized_count;
  const active_app_label = active_window ? app_label_for_window(active_window) : "Nexus";

  return {
    activity_label: active_window ? `${active_app_label} 前台` : "桌面待命",
    dock_label: minimized_count > 0 ? `${minimized_count} 个在 Dock` : null,
    window_label: `${visible_count} 个窗口`,
  };
}
