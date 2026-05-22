import type { CSSProperties } from "react";

import type { NexusOperationEvent } from "./operation-types";
import { SURFACE_META } from "./operation-stage-panel-style";
import type { SurfaceMeta } from "./operation-stage-panel-style";

export type StageTransitionIntent =
  | "browser"
  | "editor"
  | "permission"
  | "summary"
  | "task"
  | "terminal"
  | "workspace";

export function surface_meta_for_transition(
  event: NexusOperationEvent,
  intent: StageTransitionIntent,
): SurfaceMeta {
  if (event.surface !== "fallback") {
    return SURFACE_META[event.surface];
  }
  if (intent === "browser") {
    return SURFACE_META.web;
  }
  if (intent === "terminal") {
    return SURFACE_META.terminal;
  }
  if (intent === "workspace") {
    return SURFACE_META.workspace;
  }
  if (intent === "editor") {
    return SURFACE_META.editor;
  }
  if (intent === "task") {
    return SURFACE_META.task;
  }
  if (intent === "permission") {
    return SURFACE_META.conversation;
  }
  return SURFACE_META.summary;
}

export function build_stage_transition_style(intent: StageTransitionIntent): CSSProperties {
  const map: Record<StageTransitionIntent, Record<string, string>> = {
    browser: {
      "--operation-idle-exit-x": "16%",
      "--operation-idle-exit-y": "-2%",
      "--operation-idle-exit-scale": "1.06",
      "--operation-scene-enter-x": "28px",
      "--operation-scene-enter-y": "4px",
    },
    editor: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "-5%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "18px",
    },
    permission: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "0",
      "--operation-idle-exit-scale": "1.015",
      "--operation-idle-exit-blur": "4px",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "0",
    },
    summary: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "-2%",
      "--operation-idle-exit-scale": "1.03",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "12px",
    },
    task: {
      "--operation-idle-exit-x": "2%",
      "--operation-idle-exit-y": "-8%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "10px",
      "--operation-scene-enter-y": "8px",
    },
    terminal: {
      "--operation-idle-exit-x": "0",
      "--operation-idle-exit-y": "14%",
      "--operation-idle-exit-scale": ".96",
      "--operation-scene-enter-x": "0",
      "--operation-scene-enter-y": "34px",
    },
    workspace: {
      "--operation-idle-exit-x": "-14%",
      "--operation-idle-exit-y": "-1%",
      "--operation-idle-exit-scale": "1.05",
      "--operation-scene-enter-x": "-24px",
      "--operation-scene-enter-y": "8px",
    },
  };

  return map[intent] as CSSProperties;
}
