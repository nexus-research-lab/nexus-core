import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  display_stage_event_target,
  display_stage_event_title,
} from "../operation-stage-labels";
import type { NexusOperationEvent } from "../operation-types";
import type { StageNarrativeState } from "./operation-stage-model";
import { SURFACE_ACCENT_CLASS_NAME } from "./operation-stage-style";

export function StageReplayReturn({
  current_event,
  final_event,
  on_return,
}: {
  current_event: NexusOperationEvent;
  final_event: NexusOperationEvent;
  on_return: () => void;
}) {
  return (
    <div className="operation-stage-mobile-panel absolute right-[31%] top-3 z-30 w-[min(310px,24vw)] max-xl:right-4 max-xl:top-[92px] max-xl:w-[min(330px,calc(100%-2rem))] max-md:relative max-md:right-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full">
      <div className="rounded-[15px] border border-[rgba(91,114,255,0.20)] bg-white/62 p-2.5 shadow-[0_16px_42px_rgba(18,28,42,0.10)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.10em] text-(--text-strong)">
              现场回放中
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-(--text-soft)">
              {display_stage_event_title(current_event)}
            </p>
          </div>
          <button
            className="shrink-0 rounded-full border border-[rgba(91,114,255,0.20)] bg-[rgba(91,114,255,0.08)] px-2 py-1 text-[9px] font-bold text-[color:var(--primary)] transition hover:bg-[rgba(91,114,255,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.30)]"
            onClick={on_return}
            type="button"
          >
            回到交接
          </button>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 text-[9px] font-semibold text-(--text-soft)">
          <span className="truncate rounded-[9px] bg-white/44 px-2 py-1.5">
            {display_stage_event_target(current_event)}
          </span>
          <span>-&gt;</span>
          <span className="truncate rounded-[9px] bg-white/44 px-2 py-1.5">
            {display_stage_event_title(final_event)}
          </span>
        </div>
      </div>
    </div>
  );
}

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
        "operation-stage-frame relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,247,251,0.86)_42%,rgba(234,239,247,0.92))] p-4 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:overflow-y-auto max-md:overflow-x-hidden",
        `operation-stage-narrative-${narrative.phase}`,
      )}
      data-stage-experience-phase={narrative.phase}
    >
      <div
        className={cn(
          "operation-stage-aura absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br opacity-[0.28] blur-3xl",
          SURFACE_ACCENT_CLASS_NAME[event.surface],
        )}
      />
      <div className="operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.32]" />
      <div className="operation-stage-light" />
      <div className="operation-desktop-shadow" />
      <div className="relative h-full min-h-[280px] max-md:flex max-md:h-auto max-md:min-h-0 max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:flex-col max-md:gap-3 max-md:overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
