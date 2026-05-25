import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import {
  display_stage_event_target,
  display_stage_event_title,
  fallback_stage_event_object_label,
  fallback_stage_event_target_label,
  is_low_signal_stage_label,
} from "../operation-stage-labels";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import type { StageEpisodeState, StageNarrativeState } from "./operation-stage-model";
import { SURFACE_LABEL } from "./operation-stage-style";

export interface StageEpisode {
  id: string;
  event: NexusOperationEvent;
  index: number;
  state: StageEpisodeState;
  act_label: string;
  action_label: string;
  title: string;
  target: string;
  surface_label: string;
  state_label: string;
  detail: string;
}

export interface StageEpisodeMap {
  active_episode: StageEpisode | null;
  completed_count: number;
  current_index: number;
  episodes: StageEpisode[];
  progress_label: string;
  settled_count: number;
  total_count: number;
  upcoming_count: number;
}

export function build_stage_episodes({
  active_event_id,
  events,
  narrative,
  snapshot,
}: {
  active_event_id: string;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}): StageEpisodeMap {
  const active_index = Math.max(0, events.findIndex((event) => event.id === active_event_id));
  const episodes = events.map((event, index) => {
    const state = resolve_episode_state(event, index, active_index, narrative);
    const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
    const title = episode_event_title(event);
    const target = episode_event_target(event);
    return {
      id: event.id,
      event,
      index,
      state,
      act_label: `第 ${index + 1} 步`,
      action_label: profile.action_label,
      title,
      target,
      surface_label: SURFACE_LABEL[event.surface],
      state_label: episode_state_label(event, state),
      detail: build_episode_detail(event, target, state, snapshot),
    };
  });

  const active_episode = episodes.find((episode) => episode.id === active_event_id)
    ?? episodes.at(-1)
    ?? null;
  const settled_count = episodes.filter((episode) => episode.state === "settled").length;
  const completed_count = episodes.filter((episode) => (
    episode.event.phase === "done" ||
    episode.event.phase === "cancelled" ||
    episode.event.phase === "error"
  )).length;
  const upcoming_count = episodes.filter((episode) => episode.state === "upcoming").length;

  return {
    active_episode,
    completed_count,
    current_index: active_episode ? active_episode.index : active_index,
    episodes,
    progress_label: `${Math.min(active_index + 1, Math.max(events.length, 1))}/${Math.max(events.length, 1)}`,
    settled_count,
    total_count: episodes.length,
    upcoming_count,
  };
}

function episode_event_title(event: NexusOperationEvent): string {
  return display_stage_event_title(event, SURFACE_LABEL[event.surface]);
}

function episode_event_target(event: NexusOperationEvent): string {
  return display_stage_event_target(event, SURFACE_LABEL[event.surface]);
}

export function episode_tone(
  state: StageEpisodeState,
): "active" | "settled" | "pending" {
  if (state === "active") {
    return "active";
  }
  if (state === "settled") {
    return "settled";
  }
  return "pending";
}

function resolve_episode_state(
  event: NexusOperationEvent,
  index: number,
  active_index: number,
  narrative: StageNarrativeState,
): StageEpisodeState {
  if (index === active_index) {
    return "active";
  }
  if (
    index < active_index ||
    event.phase === "done" ||
    event.phase === "cancelled" ||
    event.phase === "error" ||
    narrative.phase === "completed"
  ) {
    return "settled";
  }
  if (event.phase === "running" || event.phase === "waiting") {
    return "entered";
  }
  return "upcoming";
}

function episode_state_label(event: NexusOperationEvent, state: StageEpisodeState): string {
  if (state === "active") {
    return event.phase === "waiting" ? "等待确认" : "当前聚焦";
  }
  if (state === "settled") {
    return event.phase === "error" || event.phase === "cancelled" ? "异常沉淀" : "已沉淀";
  }
  if (state === "entered") {
    return event.phase === "waiting" ? "待确认" : "已登场";
  }
  return "待接续";
}

function build_episode_detail(
  event: NexusOperationEvent,
  target: string,
  state: StageEpisodeState,
  snapshot: NexusOperationSnapshot | null,
): string {
  if (state === "active") {
    return `${SURFACE_LABEL[event.surface]} 正在聚焦 ${target}`;
  }
  if (state === "settled") {
    const workspace_match = snapshot?.workspace_events.find((item) => item.path === event.target);
    if (workspace_match?.diff_stats) {
      return `已落盘 +${workspace_match.diff_stats.additions} -${workspace_match.diff_stats.deletions}`;
    }
    return event.phase === "error" ? "错误证据已保留" : "输出已进入回放记录";
  }
  if (state === "entered") {
    return "窗口已显影，等待输出沉淀";
  }
  return "等待前序工具完成后接续";
}
