import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { NexusOperationEvent } from "../operation-types";
import type { StageNarrativeState } from "./operation-stage-model";

export function DynamicStageFrame({
  event,
  narrative,
  children,
}: {
  event: NexusOperationEvent;
  narrative: StageNarrativeState;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "operation-stage-frame relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[#edf2f7] p-4 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:overflow-y-auto max-md:overflow-x-hidden",
        `operation-stage-narrative-${narrative.phase}`,
      )}
      data-stage-experience-phase={narrative.phase}
    >
      <div className="operation-desktop-wallpaper pointer-events-none absolute inset-0" data-surface={event.surface} />
      <div className="operation-desktop-shadow" />
      <div className="relative h-full min-h-[280px] max-md:flex max-md:h-auto max-md:min-h-0 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:flex-col max-md:gap-3 max-md:overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
