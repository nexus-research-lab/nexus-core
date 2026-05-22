import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ListChecks,
  RadioTower,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { build_operation_continuation_brief } from "../operation-stage-experience";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "../operation-types";
import type { StageEpisodeMap } from "./operation-stage-episodes";
import {
  collect_completion_artifacts,
} from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";

export function StageHandoffSpotlight({
  event,
  events,
  episodes,
  narrative,
  snapshot,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  episodes: StageEpisodeMap;
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}) {
  if (narrative.phase !== "settling" && narrative.phase !== "completed") {
    return null;
  }

  const artifacts = collect_completion_artifacts(event, snapshot);
  const continuation = build_operation_continuation_brief(event, events, snapshot);
  const failed_count = events.filter((item) => item.phase === "error" || item.phase === "cancelled").length;
  const is_completed = narrative.phase === "completed" && failed_count === 0;
  const primary_artifact = artifacts[0] ?? null;
  const artifact_label = primary_artifact?.value ?? event.target ?? event.summary ?? "本轮上下文";

  return (
    <div className="operation-stage-mobile-panel pointer-events-none absolute left-1/2 top-[98px] z-20 w-[min(420px,31vw)] -translate-x-1/2 max-xl:top-[150px] max-xl:w-[min(420px,calc(100%-2rem))] max-md:relative max-md:left-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:translate-x-0">
      <div className="operation-stage-handoff-spotlight rounded-[19px] border border-white/68 bg-[rgba(255,255,255,0.56)] p-3 shadow-[0_24px_64px_rgba(18,28,42,0.13)] backdrop-blur-2xl">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-[14px] border",
              is_completed
                ? "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.11)] text-[color:var(--success)]"
                : "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
            )}>
              {is_completed ? <CheckCircle2 className="h-4.5 w-4.5" /> : <RadioTower className="h-4.5 w-4.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-black text-(--text-strong)">
                {is_completed ? "工作台已完成交接" : "工作台正在收束"}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-soft)">
                {continuation.status_label} · {episodes.completed_count}/{episodes.total_count} 步
              </p>
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9px] font-black",
            failed_count
              ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]"
              : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
            {failed_count ? `${failed_count} 异常` : "ready"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 text-[9px] max-sm:grid-cols-1">
          <HandoffStep icon={<Sparkles className="h-3.5 w-3.5" />} label="入口" value="nexus 字符场" />
          <HandoffArrow />
          <HandoffStep icon={<ListChecks className="h-3.5 w-3.5" />} label="执行" value={`${events.length} 个动作`} />
          <HandoffArrow />
          <HandoffStep icon={<FileText className="h-3.5 w-3.5" />} label="交接" value={artifact_label} />
        </div>

        <div className="mt-3 rounded-[13px] border border-white/48 bg-white/36 p-2.5">
          <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-[9.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
              continuation
            </p>
            <span className="shrink-0 rounded-full bg-white/56 px-2 py-1 text-[8.5px] font-bold text-(--text-soft)">
              下一轮入口
            </span>
          </div>
          <p className="line-clamp-2 text-[10.5px] font-semibold leading-5 text-(--text-muted)">
            {continuation.status_detail}
          </p>
          <p className="mt-2 rounded-[10px] border border-white/48 bg-white/42 px-2 py-1.5 text-[10px] font-bold leading-4 text-(--text-strong)">
            {continuation.resume_prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

function HandoffStep({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[11px] border border-white/48 bg-white/36 px-2 py-2">
      <div className="flex items-center gap-1.5 text-(--icon-muted)">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[8px] bg-white/54">
          {icon}
        </span>
        <span className="truncate text-[8.5px] font-black uppercase tracking-[0.08em] text-(--text-soft)">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-[9.5px] font-bold text-(--text-strong)">{value}</p>
    </div>
  );
}

function HandoffArrow() {
  return (
    <div className="grid place-items-center text-(--icon-muted) max-sm:hidden">
      <ArrowRight className="h-3.5 w-3.5" />
    </div>
  );
}
