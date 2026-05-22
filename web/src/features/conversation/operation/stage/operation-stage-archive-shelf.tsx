import { AlertTriangle, ListTree } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import type { StageEpisodeMap } from "./operation-stage-episodes";
import { collect_archive_capsules } from "./operation-stage-helpers";
import type { StageNarrativeState } from "./operation-stage-model";

export function StageArchiveShelf({
  event,
  events,
  episodes,
  narrative,
  snapshot,
  windows,
}: {
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  episodes: StageEpisodeMap;
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
  windows: StageWindowState[];
}) {
  const archive_items = useMemo(() => collect_archive_capsules({
    event,
    events,
    snapshot,
    windows,
  }), [event, events, snapshot, windows]);
  const archived_count = episodes.settled_count || episodes.completed_count;

  return (
    <div className="operation-stage-mobile-panel absolute bottom-[82px] left-1/2 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 max-md:relative max-md:bottom-auto max-md:left-auto max-md:mt-3 max-md:w-full max-md:translate-x-0">
      <div className="rounded-[18px] border border-white/68 bg-white/54 p-3 shadow-[0_20px_52px_rgba(18,28,42,0.12)] backdrop-blur-xl">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border",
              event.phase === "error"
                ? "border-[rgba(223,93,98,0.22)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]"
                : "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
            )}>
              {event.phase === "error" ? <AlertTriangle className="h-4 w-4" /> : <ListTree className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">现场归档</p>
              <p className="truncate text-[10px] text-(--text-soft)">
                {narrative.phase === "settling" ? "窗口正在落盘为可回看的执行记录" : "工具窗口已沉淀为可追溯工作现场"}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/56 bg-white/50 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            {archived_count}/{episodes.total_count} 已归档
          </span>
        </div>

        <div className="mb-2.5 grid grid-cols-3 gap-1.5 text-center">
          <ArchiveMetric label="已沉淀" value={episodes.settled_count} />
          <ArchiveMetric label="已完成" value={episodes.completed_count} />
          <ArchiveMetric label="待接续" value={episodes.upcoming_count} />
        </div>

        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {archive_items.map((item, index) => {
            const Icon = item.Icon;
            return (
              <div
                className={cn(
                  "relative min-w-0 overflow-hidden rounded-[13px] border px-2.5 py-2",
                  item.tone === "warning"
                    ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
                    : item.tone === "success"
                      ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/52 bg-white/36",
                )}
                key={item.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-[10px]",
                    item.tone === "warning"
                      ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                      : item.tone === "success"
                        ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                        : "bg-white/58 text-(--icon-muted)",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-black text-(--text-strong)">
                      {item.label}
                    </span>
                    <span className="block truncate text-[9px] font-semibold text-(--text-soft)">
                      {item.value}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-semibold text-(--text-soft)">
                  <span>{item.meta}</span>
                  <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ArchiveMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/46 bg-white/34 px-2 py-1.5">
      <div className="truncate text-[12px] font-black text-(--text-strong)">{value}</div>
      <div className="mt-0.5 truncate text-[8.5px] font-bold text-(--text-soft)">{label}</div>
    </div>
  );
}
