import type { StageWindowState } from "../operation-desktop-types";

export interface StageWindowOverride {
  closed?: boolean;
  maximized?: boolean;
  minimized?: boolean;
  offset_x?: number;
  offset_y?: number;
  restore_token?: number;
}

export type StageNarrativePhase = "awakening" | "running" | "settling" | "completed";

export interface StageNarrativeState {
  phase: StageNarrativePhase;
  label: string;
  detail: string;
}

export type StageWindowList = StageWindowState[];
