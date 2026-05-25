import { useEffect, useMemo, useState } from "react";

import { StageWindowContent } from "../apps/operation-app-renderers";
import type { StageWindowState } from "../operation-desktop-types";
import {
  plan_operation_desktop,
  resolve_operation_event_window_id,
} from "../operation-scene-planner";
import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "../operation-types";
import { EmptyStage } from "../operation-stage-idle";
import {
  build_stage_narrative,
  collect_narrative_events,
  icon_for_window_kind,
  is_stage_desktop_window_kind,
  minimum_revealed_window_count,
  order_windows_for_reveal,
  position_for_window,
  stage_app_label_for_window_kind,
  useRevealedWindowCount,
  window_content_mode_for_kind,
} from "./operation-stage-helpers";
import type {
  StageWindowOverride,
} from "./operation-stage-model";
import { StageAgentCursor, StageMacMenuBar, StageDesktopIcons } from "./operation-stage-mac-shell";
import { DynamicStageFrame } from "./operation-stage-frame";
import { OperationStageWindow } from "./operation-stage-window";
import {
  StageWindowDock,
  StageWindowsHiddenState,
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
  const desktop = useMemo(() => (
    plan_operation_desktop({ event: active_narrative_event, snapshot })
  ), [active_narrative_event, snapshot]);
  const desktop_windows = useMemo(() => (
    desktop.windows.filter((window) => is_stage_desktop_window_kind(window.kind))
  ), [desktop.windows]);
  const desktop_active_window_id = useMemo(() => (
    desktop_windows.some((window) => window.id === desktop.active_window_id)
      ? desktop.active_window_id
      : desktop_windows[0]?.id ?? null
  ), [desktop.active_window_id, desktop_windows]);
  const windows_for_reveal = useMemo(() => (
    order_windows_for_reveal(desktop_windows, desktop_active_window_id)
  ), [desktop_active_window_id, desktop_windows]);
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
    const next_active_window_id = desktop_active_window_id;
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
  }, [active_narrative_event.id, desktop_active_window_id]);

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
        if (override?.minimized === false && override.restore_token && window.phase === "minimized") {
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
      window.id === desktop_active_window_id && window.phase !== "minimized"
    ));
    const focused = explicit_active ?? visible_windows.find((window) => window.phase === "focused");
    return (focused ?? visible_windows[0] ?? null)?.id ?? null;
  }, [desktop_active_window_id, focused_window_id, visible_windows]);

  const active_window = useMemo(() => (
    visible_windows.find((window) => window.id === active_window_id) ?? null
  ), [active_window_id, visible_windows]);
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
        maximized: false,
        minimized: false,
        offset_x: Math.round(offset.x),
        offset_y: Math.round(offset.y),
      },
    }));
  };

  const toggle_zoom_window = (window_id: string) => {
    set_focused_window_id(window_id);
    set_window_overrides((current) => {
      const current_override = current[window_id];
      const next_maximized = !current_override?.maximized;
      return {
        ...current,
        [window_id]: {
          ...current_override,
          closed: false,
          maximized: next_maximized,
          minimized: false,
          offset_x: next_maximized ? 0 : current_override?.offset_x,
          offset_y: next_maximized ? 0 : current_override?.offset_y,
        },
      };
    });
  };

  const restore_window = (window_id: string) => {
    set_focused_window_id(window_id);
    const restore_token = Date.now();
    set_window_overrides((current) => ({
      ...current,
      [window_id]: {
        ...current[window_id],
        closed: false,
        minimized: false,
        restore_token,
      },
    }));
  };

  const restore_all_windows = () => {
    set_focused_window_id(desktop_active_window_id ?? desktop_windows[0]?.id ?? null);
    const restore_token = Date.now();
    set_window_overrides(Object.fromEntries(
      desktop_windows.map((window, index) => [window.id, {
        closed: false,
        minimized: false,
        restore_token: restore_token + index,
      }]),
    ));
  };

  const focus_event_window = (target_event: NexusOperationEvent) => {
    const target_window_id = resolve_operation_event_window_id(target_event, desktop_windows)
      ?? desktop_active_window_id
      ?? desktop_windows[0]?.id
      ?? null;
    if (!target_window_id) {
      return;
    }
    set_replay_event_id(target_event.id);
    restore_window(target_window_id);
  };

  if (!desktop_windows.length) {
    return (
      <EmptyStage
        snapshot={snapshot}
        subtitle={event.agent_id || "Nexus"}
      />
    );
  }

  return (
    <DynamicStageFrame event={event} narrative={narrative}>
      <StageMacMenuBar
        active_window={active_window}
      />
      <StageDesktopIcons windows={window_states} on_restore={restore_window} />
      <StageAgentCursor active_window={active_window} />
      {visible_windows.length ? visible_windows.map((window, index) => {
        const is_active = active_window_id === window.id && window.phase !== "minimized";
        const is_maximized = Boolean(window_overrides[window.id]?.maximized);
        return (
          <OperationStageWindow
            app_label={stage_app_label_for_window_kind(window.kind)}
            delay_ms={Math.min(index * 70, 280)}
            dimmed={!is_active && window.phase !== "minimized"}
            drag_offset={is_maximized ? { x: 0, y: 0 } : {
              x: window_overrides[window.id]?.offset_x ?? 0,
              y: window_overrides[window.id]?.offset_y ?? 0,
            }}
            focus={is_active}
            icon={icon_for_window_kind(window.kind)}
            key={window.id}
            content_mode={window_content_mode_for_kind(window.kind)}
            maximized={is_maximized}
            mobile_hidden={!is_active}
            minimized={window.phase === "minimized"}
            on_close={() => close_window(window.id)}
            on_drag={(offset) => move_window(window.id, offset)}
            on_focus={() => focus_window(window.id)}
            on_minimize={() => minimize_window(window.id)}
            on_zoom={() => toggle_zoom_window(window.id)}
            position_class_name={is_maximized
              ? "left-[4%] top-[8%] h-[78%] w-[92%]"
              : position_for_window(window, narrative.phase)}
            restore_token={window_overrides[window.id]?.restore_token}
            title={window.title}
            tone={window.kind === "terminal" ? "terminal" : "default"}
            z_index={is_active ? 44 : 8 + index}
          >
            <StageWindowContent window={window} on_focus_event={is_active ? focus_event_window : undefined} />
          </OperationStageWindow>
        );
      }) : desktop_windows.length ? (
        <StageWindowsHiddenState
          on_restore={restore_window}
          windows={window_states}
          on_restore_all={restore_all_windows}
        />
      ) : null}
      <StageWindowDock
        active_window_id={active_window_id}
        on_restore_all={restore_all_windows}
        windows={window_states}
        on_restore={restore_window}
      />
    </DynamicStageFrame>
  );
}
