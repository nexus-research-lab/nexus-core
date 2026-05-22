import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { StageWindowContent } from "../apps/operation-app-renderers";
import type {
  StageWindowKind,
  StageWindowState,
} from "../operation-desktop-types";
import {
  plan_operation_desktop,
  resolve_operation_event_window_id,
} from "../operation-scene-planner";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "../operation-types";
import { StageArchiveShelf } from "./operation-stage-archive-shelf";
import {
  StageCompletionLedger,
  StageOutcomeSummary,
} from "./operation-stage-completion";
import { build_stage_episodes } from "./operation-stage-episodes";
import {
  build_stage_narrative,
  collect_narrative_events,
  event_sequence_label,
  icon_for_window_kind,
  minimum_revealed_window_count,
  order_windows_for_reveal,
  position_for_window,
  useRevealedWindowCount,
} from "./operation-stage-helpers";
import type {
  StageNarrativeState,
  StageWindowOverride,
} from "./operation-stage-model";
import { SURFACE_ACCENT_CLASS_NAME } from "./operation-stage-style";
import { StageActGuide } from "./operation-stage-act-guide";
import { StageNarrativeRail, StageOperationRunway } from "./operation-stage-event-flow";
import { StageStatusBar } from "./operation-stage-status";
import { OperationStageWindow } from "./operation-stage-window";
import {
  BackgroundWindowSummary,
  StageFocusBeam,
  StageWindowControls,
  StageWindowDock,
  StageWindowsHiddenState,
  WindowSettlementBar,
} from "./operation-stage-window-controls";

export function OperationStageDesktop({
  event,
  snapshot,
}: {
  event: NexusOperationEvent;
  snapshot: NexusOperationSnapshot | null;
}) {
  const [focused_window_id, set_focused_window_id] = useState<string | null>(null);
  const [replay_event_id, set_replay_event_id] = useState<string | null>(null);
  const [window_overrides, set_window_overrides] = useState<Record<string, StageWindowOverride>>({});
  const narrative = useMemo(() => build_stage_narrative(event, snapshot), [event, snapshot]);
  const narrative_events = useMemo(() => collect_narrative_events(event, snapshot), [event, snapshot]);
  const active_narrative_event_id = useMemo(() => (
    replay_event_id && narrative_events.some((item) => item.id === replay_event_id)
      ? replay_event_id
      : event.id
  ), [event.id, narrative_events, replay_event_id]);
  const active_narrative_event = useMemo(() => (
    narrative_events.find((item) => item.id === active_narrative_event_id) ?? event
  ), [active_narrative_event_id, event, narrative_events]);
  const episodes = useMemo(() => build_stage_episodes({
    active_event_id: active_narrative_event_id,
    events: narrative_events,
    narrative,
    snapshot,
  }), [active_narrative_event_id, narrative, narrative_events, snapshot]);
  const desktop = useMemo(() => (
    plan_operation_desktop({ event: active_narrative_event, snapshot })
  ), [active_narrative_event, snapshot]);
  const is_replay = active_narrative_event.id !== event.id;
  const windows_for_reveal = useMemo(() => (
    order_windows_for_reveal(desktop.windows, desktop.active_window_id)
  ), [desktop.active_window_id, desktop.windows]);
  const revealed_window_count = useRevealedWindowCount({
    event_key: `${active_narrative_event.round_id}:${active_narrative_event.id}:${active_narrative_event.phase}`,
    minimum_count: minimum_revealed_window_count({
      event_count: narrative_events.length,
      phase: narrative.phase,
      window_count: windows_for_reveal.length,
    }),
    phase: narrative.phase,
    window_count: windows_for_reveal.length,
  });

  useEffect(() => {
    set_focused_window_id(null);
    set_replay_event_id(null);
    set_window_overrides({});
  }, [event.round_id]);

  useEffect(() => {
    set_replay_event_id(null);
  }, [event.id]);

  useEffect(() => {
    const next_active_window_id = desktop.active_window_id;
    if (!next_active_window_id) {
      return;
    }

    set_focused_window_id(next_active_window_id);
    set_window_overrides((current) => ({
      ...current,
      [next_active_window_id]: {
        ...current[next_active_window_id],
        closed: false,
        minimized: false,
      },
    }));
  }, [active_narrative_event.id, desktop.active_window_id]);

  const window_states = useMemo(() => (
    windows_for_reveal
      .map((window): StageWindowState => {
        const override = window_overrides[window.id];
        if (override?.closed) {
          return { ...window, phase: "closed" };
        }
        if (override?.minimized) {
          return { ...window, phase: "minimized" };
        }
        if (override?.minimized === false && window.phase === "minimized") {
          return { ...window, phase: "background" };
        }
        if (focused_window_id === window.id && window.phase !== "closed" && window.phase !== "minimized") {
          return { ...window, phase: "focused" };
        }
        return window;
      })
      .slice(0, revealed_window_count)
      .sort((left, right) => {
        const left_z = left.id === focused_window_id ? 100 : left.z;
        const right_z = right.id === focused_window_id ? 100 : right.z;
        return left_z - right_z;
      })
  ), [focused_window_id, revealed_window_count, window_overrides, windows_for_reveal]);

  const visible_windows = useMemo(() => (
    window_states.filter((window) => window.phase !== "closed" && window.phase !== "minimized")
  ), [window_states]);

  const active_window_id = useMemo(() => {
    if (focused_window_id && visible_windows.some((window) => (
      window.id === focused_window_id && window.phase !== "minimized"
    ))) {
      return focused_window_id;
    }
    const explicit_active = visible_windows.find((window) => (
      window.id === desktop.active_window_id && window.phase !== "minimized"
    ));
    const focused = explicit_active ?? visible_windows.find((window) => window.phase === "focused");
    return (focused ?? visible_windows[0] ?? null)?.id ?? null;
  }, [desktop.active_window_id, focused_window_id, visible_windows]);

  const active_window = useMemo(() => (
    visible_windows.find((window) => window.id === active_window_id) ?? null
  ), [active_window_id, visible_windows]);
  const has_window_layout_changes = useMemo(() => (
    Object.values(window_overrides).some((override) => (
      override.closed ||
      override.minimized ||
      Boolean(override.offset_x) ||
      Boolean(override.offset_y)
    ))
  ), [window_overrides]);
  const has_window_position_changes = useMemo(() => (
    Object.values(window_overrides).some((override) => Boolean(override.offset_x) || Boolean(override.offset_y))
  ), [window_overrides]);

  const close_window = (window_id: string) => {
    set_focused_window_id((current) => current === window_id ? null : current);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        closed: true,
      },
    }));
  };

  const focus_window = (window_id: string) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: false,
      },
    }));
  };

  const minimize_window = (window_id: string) => {
    set_focused_window_id((current) => current === window_id ? null : current);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: true,
      },
    }));
  };

  const move_window = (window_id: string, offset: { x: number; y: number }) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        minimized: false,
        offset_x: Math.round(offset.x),
        offset_y: Math.round(offset.y),
      },
    }));
  };

  const restore_window = (window_id: string) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        closed: false,
        minimized: false,
      },
    }));
  };

  const restore_all_windows = () => {
    set_focused_window_id(desktop.active_window_id ?? desktop.windows[0]?.id ?? null);
    set_window_overrides(Object.fromEntries(
      desktop.windows.map((window) => [window.id, { closed: false, minimized: false }]),
    ));
  };

  const reset_window_positions = () => {
    set_window_overrides((current) => Object.fromEntries(
      Object.entries(current).map(([window_id, override]) => [
        window_id,
        {
          ...override,
          offset_x: 0,
          offset_y: 0,
        },
      ]),
    ));
  };

  const focus_event_window = (target_event: NexusOperationEvent) => {
    const target_window_id = resolve_operation_event_window_id(target_event, desktop.windows)
      ?? desktop.active_window_id
      ?? desktop.windows[0]?.id
      ?? null;
    if (!target_window_id) {
      return;
    }
    set_replay_event_id(target_event.id);
    restore_window(target_window_id);
  };

  return (
    <DynamicStageFrame event={event} narrative={narrative}>
      <StageStatusBar
        active_window={active_window}
        event={active_narrative_event}
        is_replay={is_replay}
        narrative={narrative}
        snapshot={snapshot}
        visible_window_count={visible_windows.length}
        window_count={desktop.windows.length}
      />
      <StageOperationRunway
        active_event_id={active_narrative_event_id}
        episodes={episodes}
        events={narrative_events}
        narrative={narrative}
        on_focus_event={focus_event_window}
      />
      <StageActGuide
        active_window={active_window}
        event={event}
        events={narrative_events}
        narrative={narrative}
        snapshot={snapshot}
      />
      {narrative.phase === "settling" ? (
        <StageCompletionLedger
          active_event_id={active_narrative_event_id}
          event={event}
          episodes={episodes}
          events={narrative_events}
          narrative={narrative}
          on_focus_event={focus_event_window}
          snapshot={snapshot}
        />
      ) : narrative.phase === "completed" && !is_replay ? null : (
        <StageNarrativeRail
          active_event_id={active_narrative_event_id}
          active_window={active_window}
          episodes={episodes}
          events={narrative_events}
          narrative={narrative}
          on_focus_event={focus_event_window}
          revealed_window_count={revealed_window_count}
          snapshot={snapshot}
          total_window_count={windows_for_reveal.length}
        />
      )}
      {visible_windows.length ? visible_windows.map((window, index) => {
        const is_active = active_window_id === window.id && window.phase !== "minimized";
        return (
          <OperationStageWindow
            delay_ms={Math.min(index * 70, 280)}
            dimmed={!is_active && window.phase !== "minimized"}
            drag_offset={{
              x: window_overrides[window.id]?.offset_x ?? 0,
              y: window_overrides[window.id]?.offset_y ?? 0,
            }}
            focus={is_active}
            footer={(
              <WindowSettlementBar
                active={is_active}
                event={window.payload.event}
                sequence_label={event_sequence_label(window.payload.event, narrative_events)}
                tone={window.kind === "terminal" ? "terminal" : "default"}
              />
            )}
            icon={icon_for_window_kind(window.kind)}
            key={window.id}
            mobile_hidden={!is_active}
            minimized={window.phase === "minimized"}
            on_close={() => close_window(window.id)}
            on_drag={(offset) => move_window(window.id, offset)}
            on_focus={() => focus_window(window.id)}
            on_minimize={() => minimize_window(window.id)}
            position_class_name={position_for_window(window, narrative.phase)}
            title={window.title}
            tone={window.kind === "terminal" ? "terminal" : "default"}
            z_index={is_active ? 44 : 8 + index}
          >
            {is_active ? (
              <StageWindowContent window={window} on_focus_event={focus_event_window} />
            ) : (
              <BackgroundWindowSummary
                sequence_label={event_sequence_label(window.payload.event, narrative_events)}
                window={window}
              />
            )}
          </OperationStageWindow>
        );
      }) : (
        <StageWindowsHiddenState
          window_count={desktop.windows.length}
          on_restore_all={restore_all_windows}
        />
      )}
      <StageWindowDock
        active_window_id={active_window_id}
        events={narrative_events}
        windows={window_states}
        on_restore={restore_window}
      />
      <StageWindowControls
        active_window={active_window}
        has_layout_changes={has_window_layout_changes}
        has_position_changes={has_window_position_changes}
        on_reset_positions={reset_window_positions}
        on_restore_all={restore_all_windows}
        visible_window_count={visible_windows.length}
        window_count={desktop.windows.length}
      />
      {narrative.phase === "completed" || narrative.phase === "settling" ? (
        <>
          <StageArchiveShelf
            event={event}
            episodes={episodes}
            events={narrative_events}
            narrative={narrative}
            snapshot={snapshot}
            windows={window_states}
          />
          {is_replay ? (
            <StageReplayReturn
              current_event={active_narrative_event}
              final_event={event}
              on_return={() => set_replay_event_id(null)}
            />
          ) : null}
          <StageOutcomeSummary
            event={event}
            episodes={episodes}
            events={narrative_events}
            narrative={narrative}
            snapshot={snapshot}
          />
        </>
      ) : null}
      {active_window?.kind === "terminal" || narrative.phase === "completed" || narrative.phase === "settling"
        ? null
        : <StageFocusBeam />}
    </DynamicStageFrame>
  );
}

function StageReplayReturn({
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
              {current_event.tool_name ?? current_event.title}
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
            {current_event.target ?? current_event.summary ?? "当前切片"}
          </span>
          <span>→</span>
          <span className="truncate rounded-[9px] bg-white/44 px-2 py-1.5">
            {final_event.title}
          </span>
        </div>
      </div>
    </div>
  );
}

function DynamicStageFrame({
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
