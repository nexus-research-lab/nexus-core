import { cn } from "@/lib/utils";

import type { NexusOperationEvent } from "../operation-types";
import { icon_for_operation_kind } from "./operation-stage-helpers";
import type { StageEpisodeMap } from "./operation-stage-episodes";
import { episode_tone } from "./operation-stage-episodes";
import { PHASE_STATUS_META } from "./operation-stage-style";

export function StageEpisodeReel({
  active_event_id,
  episodes,
  max_count = 5,
  on_focus_event,
  title = "沉淀轨迹",
}: {
  active_event_id?: string;
  episodes: StageEpisodeMap;
  max_count?: number;
  on_focus_event?: (event: NexusOperationEvent) => void;
  title?: string;
}) {
  const visible_episodes = episodes.episodes.slice(-max_count);
  if (!visible_episodes.length) {
    return null;
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-(--text-soft)">
        <span>{title}</span>
        <span>{episodes.settled_count}/{episodes.total_count} 已沉淀</span>
      </div>
      <div className="space-y-1">
        {visible_episodes.map((episode) => {
          const event = episode.event;
          const Icon = icon_for_operation_kind(event.kind);
          const phase_meta = PHASE_STATUS_META[event.phase];
          const PhaseIcon = phase_meta.Icon;
          const tone = episode_tone(episode.state);
          const is_active = event.id === active_event_id;

          return (
            <button
              aria-label={`回看第 ${episode.index + 1} 步：${episode.action_label} ${episode.title}`}
              className={cn(
                "grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left text-[10px] transition hover:-translate-y-0.5 hover:border-[rgba(91,114,255,0.22)] hover:bg-[rgba(91,114,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.34)]",
                is_active
                  ? "border-[rgba(91,114,255,0.26)] bg-[rgba(91,114,255,0.10)]"
                  : tone === "settled"
                    ? "border-[rgba(47,184,132,0.16)] bg-[rgba(47,184,132,0.06)]"
                    : "border-white/46 bg-white/30",
              )}
              key={episode.id}
              onClick={() => on_focus_event?.(event)}
              title={`${episode.act_label} · ${episode.action_label} · ${episode.target}`}
              type="button"
            >
              <span className={cn(
                "grid h-[22px] w-[22px] place-items-center rounded-[8px] border",
                is_active
                  ? "border-[rgba(91,114,255,0.20)] bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]"
                  : tone === "settled"
                    ? "border-[rgba(47,184,132,0.18)] bg-white/58 text-[color:var(--success)]"
                    : "border-white/54 bg-white/58 text-(--icon-muted)",
              )}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[10.5px] font-black text-(--text-strong)">
                    {episode.index + 1}. {episode.action_label} · {episode.title}
                  </span>
                  <span className={cn(
                    "shrink-0 rounded-full px-1.5 py-px text-[8px] font-black",
                    tone === "active"
                      ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]"
                      : tone === "settled"
                        ? "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]"
                        : "bg-white/52 text-(--text-soft)",
                  )}>
                    {episode.state_label}
                  </span>
                </span>
                <span className="block truncate text-[9.5px] text-(--text-soft)">
                  {episode.detail || episode.target}
                </span>
              </span>
              <span className={cn(
                "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[8.5px] font-bold",
                phase_meta.class_name,
              )}>
                <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
                {phase_meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
