import type { StageWindowState } from "../operation-desktop-types";

export interface StageWindowLaunchState {
  delay_ms: number;
  origin: "active" | "desktop" | "dock";
}

export function build_stage_window_launch_state({
  index,
  is_active,
  window,
}: {
  index: number;
  is_active: boolean;
  window: StageWindowState;
}): StageWindowLaunchState {
  if (is_active || window.phase === "focused") {
    return {
      delay_ms: 0,
      origin: "active",
    };
  }
  if (window.layout === "artifact" || window.kind === "finder") {
    return {
      delay_ms: Math.min(420, 220 + index * 90),
      origin: "desktop",
    };
  }
  return {
    delay_ms: Math.min(520, 140 + index * 110),
    origin: "dock",
  };
}
