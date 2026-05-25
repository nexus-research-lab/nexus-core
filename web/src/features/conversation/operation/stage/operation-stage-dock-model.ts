import type { StageWindowKind, StageWindowState } from "../operation-desktop-types";

export interface DockPinnedApp {
  app_label: string;
  kind: StageWindowKind;
}

export interface DockAppGroup {
  app_label: string;
  count: number;
  is_active: boolean;
  is_running: boolean;
  window: StageWindowState;
}

export interface DockAppSlot {
  app_label: string;
  count: number;
  is_active: boolean;
  is_running: boolean;
  kind: StageWindowKind;
  window: StageWindowState | null;
}

export function build_dock_app_slots(
  app_groups: DockAppGroup[],
  pinned_apps: DockPinnedApp[],
): DockAppSlot[] {
  const groups_by_label = new Map(app_groups.map((app) => [app.app_label, app]));
  const pinned_labels = new Set(pinned_apps.map((app) => app.app_label));
  const pinned_slots = pinned_apps.map((app): DockAppSlot => {
    const group = groups_by_label.get(app.app_label);
    return {
      app_label: app.app_label,
      count: group?.count ?? 0,
      is_active: Boolean(group?.is_active),
      is_running: Boolean(group?.is_running),
      kind: group?.window.kind ?? app.kind,
      window: group?.window ?? null,
    };
  });
  const extra_slots = app_groups
    .filter((app) => !pinned_labels.has(app.app_label))
    .map((app): DockAppSlot => ({
      app_label: app.app_label,
      count: app.count,
      is_active: app.is_active,
      is_running: app.is_running,
      kind: app.window.kind,
      window: app.window,
    }));

  return [...pinned_slots, ...extra_slots];
}

export function group_dock_windows_by_app(
  windows: StageWindowState[],
  active_window_id: string | null,
  app_label_for_kind: (kind: StageWindowKind) => string,
): DockAppGroup[] {
  const groups = new Map<string, DockAppGroup>();

  for (const window of windows) {
    const app_label = app_label_for_kind(window.kind);
    const existing = groups.get(app_label);
    const is_active = window.id === active_window_id;
    const is_running = window.phase !== "closed";
    if (!existing) {
      groups.set(app_label, {
        app_label,
        count: is_running ? 1 : 0,
        is_active,
        is_running,
        window,
      });
      continue;
    }
    const had_running_window = existing.is_running;
    existing.count += is_running ? 1 : 0;
    existing.is_active = existing.is_active || is_active;
    existing.is_running = existing.is_running || is_running;
    if (is_active || (!had_running_window && is_running)) {
      existing.window = window;
    }
  }

  return [...groups.values()];
}
