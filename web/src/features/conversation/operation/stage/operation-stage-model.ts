import type { LucideIcon } from "lucide-react";

import type { StageWindowState } from "../operation-desktop-types";
import type { OperationEvidence } from "../operation-types";

export interface StageWindowOverride {
  closed?: boolean;
  minimized?: boolean;
  offset_x?: number;
  offset_y?: number;
}

export type StageNarrativePhase = "awakening" | "running" | "settling" | "completed";

export interface StageNarrativeState {
  phase: StageNarrativePhase;
  label: string;
  detail: string;
}

export interface CompletionArtifact {
  id: string;
  label: string;
  value: string;
  type: OperationEvidence["type"] | "workspace";
  Icon: LucideIcon;
}

export interface HandoffItem {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

export interface HandoffChecklistItem {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

export interface ArchiveCapsuleItem {
  id: string;
  label: string;
  value: string;
  meta: string;
  tone: "neutral" | "success" | "warning";
  Icon: LucideIcon;
}

export type StageWindowList = StageWindowState[];
