import type { StageNarrativePhase } from "./operation-stage-model";

export function initial_revealed_window_count({
  minimum_count,
  phase,
  window_count,
}: {
  minimum_count: number;
  phase: StageNarrativePhase;
  window_count: number;
}): number {
  if (window_count <= 0) {
    return 0;
  }
  if (phase === "completed" || phase === "settling") {
    return window_count;
  }
  return Math.min(window_count, Math.max(1, minimum_count));
}
