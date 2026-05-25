import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

import { verify_completed_round_replay_uses_event_slice } from "./operation-stage-replay-verifier.mjs";
import { verify_html_artifact_opens_browser_srcdoc } from "./operation-stage-browser-verifier.mjs";

const script_dir = dirname(fileURLToPath(import.meta.url));
const web_root = dirname(script_dir);
const out_dir = join(tmpdir(), "nexus-operation-stage-projector");
const operation_dir = join(out_dir, "src/features/conversation/operation");

rmSync(out_dir, { recursive: true, force: true });

execFileSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  [
    "exec",
    "tsc",
    "--project",
    "tsconfig.json",
    "--outDir",
    out_dir,
    "--noEmit",
    "false",
    "--declaration",
    "false",
    "--sourceMap",
    "false",
  ],
  {
    cwd: web_root,
    stdio: "inherit",
  },
);

writeFileSync(join(out_dir, "package.json"), "{\"type\":\"module\"}\n");

// The app uses bundler-style extensionless imports. Node's ESM loader needs
// matching files when executing the compiled projector directly.
copyFileSync(join(operation_dir, "operation-tool-catalog.js"), join(operation_dir, "operation-tool-catalog"));
copyFileSync(join(operation_dir, "operation-tool-inference.js"), join(operation_dir, "operation-tool-inference"));
copyFileSync(join(operation_dir, "operation-file-documents.js"), join(operation_dir, "operation-file-documents"));
copyFileSync(join(operation_dir, "operation-html-artifacts.js"), join(operation_dir, "operation-html-artifacts"));
copyFileSync(join(operation_dir, "operation-pending-permissions.js"), join(operation_dir, "operation-pending-permissions"));
copyFileSync(join(operation_dir, "operation-projection-preview.js"), join(operation_dir, "operation-projection-preview"));
copyFileSync(join(operation_dir, "operation-projection-timeline.js"), join(operation_dir, "operation-projection-timeline"));
copyFileSync(join(operation_dir, "operation-types.js"), join(operation_dir, "operation-types"));
copyFileSync(join(operation_dir, "operation-desktop-types.js"), join(operation_dir, "operation-desktop-types"));
copyFileSync(join(operation_dir, "operation-preview.js"), join(operation_dir, "operation-preview"));
copyFileSync(join(operation_dir, "operation-scene-generic-tool-window.js"), join(operation_dir, "operation-scene-generic-tool-window"));
copyFileSync(join(operation_dir, "operation-scene-planner-helpers.js"), join(operation_dir, "operation-scene-planner-helpers"));
copyFileSync(join(operation_dir, "operation-scene-window-policy.js"), join(operation_dir, "operation-scene-window-policy"));
copyFileSync(join(operation_dir, "operation-stage-labels.js"), join(operation_dir, "operation-stage-labels"));
copyFileSync(join(operation_dir, "operation-stage-experience.js"), join(operation_dir, "operation-stage-experience"));
copyFileSync(join(operation_dir, "operation-terminal-lines.js"), join(operation_dir, "operation-terminal-lines"));
copyFileSync(join(operation_dir, "operation-summary-events.js"), join(operation_dir, "operation-summary-events"));
copyFileSync(join(operation_dir, "operation-event-io.js"), join(operation_dir, "operation-event-io"));
mkdirSync(join(operation_dir, "stage"), { recursive: true });
copyFileSync(join(operation_dir, "stage/operation-stage-window-kinds.js"), join(operation_dir, "stage/operation-stage-window-kinds"));
copyFileSync(join(operation_dir, "stage/operation-stage-dock-model.js"), join(operation_dir, "stage/operation-stage-dock-model"));
copyFileSync(join(operation_dir, "stage/operation-stage-window-actions.js"), join(operation_dir, "stage/operation-stage-window-actions"));
copyFileSync(join(operation_dir, "stage/operation-stage-agent-cursor.js"), join(operation_dir, "stage/operation-stage-agent-cursor"));
copyFileSync(join(operation_dir, "stage/operation-stage-window-reveal.js"), join(operation_dir, "stage/operation-stage-window-reveal"));
copyFileSync(join(operation_dir, "stage/operation-stage-hidden-windows.js"), join(operation_dir, "stage/operation-stage-hidden-windows"));
copyFileSync(join(operation_dir, "stage/operation-stage-app-identity.js"), join(operation_dir, "stage/operation-stage-app-identity"));
copyFileSync(join(operation_dir, "stage/operation-stage-window-focus.js"), join(operation_dir, "stage/operation-stage-window-focus"));
copyFileSync(join(operation_dir, "stage/operation-stage-keyboard-target.js"), join(operation_dir, "stage/operation-stage-keyboard-target"));
copyFileSync(join(operation_dir, "stage/operation-stage-menu-model.js"), join(operation_dir, "stage/operation-stage-menu-model"));
copyFileSync(join(operation_dir, "stage/operation-stage-window-titlebar.js"), join(operation_dir, "stage/operation-stage-window-titlebar"));
mkdirSync(join(operation_dir, "apps"), { recursive: true });
copyFileSync(join(operation_dir, "apps/terminal-session-model.js"), join(operation_dir, "apps/terminal-session-model"));
copyFileSync(join(operation_dir, "apps/operation-app-surface-policy.js"), join(operation_dir, "apps/operation-app-surface-policy"));
copyFileSync(join(operation_dir, "apps/file-preview-value.js"), join(operation_dir, "apps/file-preview-value"));
copyFileSync(join(operation_dir, "apps/browser-result-items.js"), join(operation_dir, "apps/browser-result-items"));
copyFileSync(join(operation_dir, "apps/finder-item-details.js"), join(operation_dir, "apps/finder-item-details"));
copyFileSync(join(operation_dir, "apps/run-manifest-console.js"), join(operation_dir, "apps/run-manifest-console"));
copyFileSync(join(operation_dir, "apps/run-manifest-sources.js"), join(operation_dir, "apps/run-manifest-sources"));
copyFileSync(join(operation_dir, "apps/activity-monitor-data.js"), join(operation_dir, "apps/activity-monitor-data"));

const { project_operation_snapshot } = await import(pathToFileURL(join(operation_dir, "operation-projector.js")));
const {
  plan_operation_desktop,
  resolve_operation_event_window_id,
} = await import(pathToFileURL(join(operation_dir, "operation-scene-planner.js")));
const {
  build_operation_continuation_brief,
  build_operation_live_episode,
  derive_operation_stage_experience_phase,
  merge_operation_stage_snapshots_for_restore,
} = await import(pathToFileURL(join(operation_dir, "operation-stage-experience.js")));
const {
  fallback_stage_event_object_label,
  fallback_stage_event_target_label,
  is_low_signal_stage_label,
} = await import(pathToFileURL(join(operation_dir, "operation-stage-labels.js")));
const {
  is_stage_desktop_window_kind,
  window_content_mode_for_kind,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-window-kinds.js")));
const {
  build_dock_app_slots,
  group_dock_windows_by_app,
  resolve_dock_slot_presentation,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-dock-model.js")));
const {
  resolve_operation_window_keyboard_action,
  should_handle_stage_desktop_keyboard_action,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-window-actions.js")));
const {
  agent_cursor_action_label,
  agent_cursor_anchor_class,
  agent_cursor_intent_for_window_kind,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-agent-cursor.js")));
const {
  initial_revealed_window_count,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-window-reveal.js")));
const {
  summarize_hidden_stage_windows,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-hidden-windows.js")));
const {
  dock_icon_skin_for_kind,
  stage_menu_items_for_window_kind,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-app-identity.js")));
const {
  resolve_next_window_focus,
  resolve_cycled_window_focus,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-window-focus.js")));
const {
  should_ignore_stage_desktop_keyboard_target,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-keyboard-target.js")));
const {
  build_stage_menu_status,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-menu-model.js")));
const {
  build_stage_window_titlebar_state,
} = await import(pathToFileURL(join(operation_dir, "stage/operation-stage-window-titlebar.js")));
const {
  build_terminal_entries,
} = await import(pathToFileURL(join(operation_dir, "apps/terminal-session-model.js")));
const {
  app_surface_for_window_kind,
} = await import(pathToFileURL(join(operation_dir, "apps/operation-app-surface-policy.js")));
const {
  resolve_file_preview_value,
} = await import(pathToFileURL(join(operation_dir, "apps/file-preview-value.js")));
const {
  build_browser_result_items,
} = await import(pathToFileURL(join(operation_dir, "apps/browser-result-items.js")));
const {
  finder_file_kind_label,
  finder_preview_lines,
  resolve_finder_selected_item,
} = await import(pathToFileURL(join(operation_dir, "apps/finder-item-details.js")));
const {
  console_event_level,
  console_event_subsystem,
} = await import(pathToFileURL(join(operation_dir, "apps/run-manifest-console.js")));
const {
  collect_manifest_log_sources,
} = await import(pathToFileURL(join(operation_dir, "apps/run-manifest-sources.js")));
const {
  activity_cpu_label,
  activity_cpu_load,
  activity_pid_label,
} = await import(pathToFileURL(join(operation_dir, "apps/activity-monitor-data.js")));
const now = Date.now();

verify_desktop_window_kind_contract();
verify_dock_model_groups_windows_by_mac_app();
verify_window_keyboard_actions_match_mac_window_controls();
verify_agent_cursor_tracks_active_mac_app();
verify_initial_window_reveal_avoids_desktop_clutter_flash();
verify_hidden_stage_uses_desktop_state_instead_of_mission_control();
verify_unclassified_tool_activity_opens_nexus_app_window(now);
verify_current_unclassified_tool_opens_beside_existing_app_window(now);
verify_generic_tool_uses_nexus_tool_surface();
verify_nexus_tool_app_has_own_desktop_identity();
verify_window_focus_moves_to_next_visible_window();
verify_desktop_keyboard_target_policy();
verify_stage_menu_status_tracks_desktop_windows();
verify_stage_window_titlebar_state();
verify_stage_experience_state_machine(now);
verify_live_episode_narrates_running_round(now);
verify_api_retry_runtime_projection(now);
verify_active_event_stays_with_latest_round(now);
verify_error_summary_settles_live_handoff(now);
verify_stage_restore_merge_preserves_round_context(now);
verify_workspace_live_stays_in_tool_round(now);
verify_multi_file_windows_keep_event_identity(now);
verify_extensionless_workspace_file_opens_code_app(now);
verify_terminal_result_envelope(now);
verify_terminal_entries_render_real_command_result(now);
verify_browser_fallback_builds_search_results(now);
verify_finder_details_reflect_selected_workspace_item(now);
verify_console_events_use_mac_app_subsystems(now);
verify_activity_monitor_process_metrics();
verify_completed_manifest_keeps_terminal_window_identity(now);
verify_completed_round_replay_uses_event_slice({
  assert,
  now,
  plan_operation_desktop,
  project_operation_snapshot,
});
verify_html_artifact_opens_browser_srcdoc({
  assert,
  now,
  plan_operation_desktop,
  project_operation_snapshot,
});
verify_pending_permissions_are_scoped_and_precise(now);
verify_live_round_placeholder(now);
verify_synthetic_error_summary(now);

console.log("operation-stage projector verification passed");

function verify_desktop_window_kind_contract() {
  const expected_desktop_apps = [
    "browser",
    "code_editor",
    "finder",
    "generic_tool",
    "image_viewer",
    "markdown_reader",
    "pdf_reader",
    "permission_wait",
    "run_manifest",
    "spreadsheet",
    "task_board",
    "terminal",
    "word_reader",
  ];
  for (const kind of expected_desktop_apps) {
    assert(is_stage_desktop_window_kind(kind), `${kind} should be rendered as a desktop app window`);
  }
  for (const kind of ["evidence", "summary"]) {
    assert(!is_stage_desktop_window_kind(kind), `${kind} should not render as a standalone desktop app window`);
  }
  for (const kind of expected_desktop_apps.filter((kind) => kind !== "permission_wait")) {
    assert(window_content_mode_for_kind(kind) === "flush", `${kind} should fill its app window content area`);
  }
  assert(window_content_mode_for_kind("permission_wait") === "inset", "permission wait should keep inset content as a system prompt");
}

function verify_dock_model_groups_windows_by_mac_app() {
  const app_label_for_kind = (kind) => ({
    browser: "Safari",
    code_editor: "Code",
    finder: "访达",
    markdown_reader: "预览",
    terminal: "终端",
  })[kind] ?? "Nexus";
  const windows = [
    mock_stage_window({ id: "browser:a", kind: "browser", phase: "background" }),
    mock_stage_window({ id: "browser:b", kind: "browser", phase: "focused" }),
    mock_stage_window({ id: "code:a", kind: "code_editor", phase: "closed" }),
    mock_stage_window({ id: "preview:a", kind: "markdown_reader", phase: "minimized" }),
  ];
  const groups = group_dock_windows_by_app(windows, "browser:b", app_label_for_kind);
  const safari_group = groups.find((group) => group.app_label === "Safari");
  assert(safari_group?.count === 2, `Dock should group Safari windows, got ${safari_group?.count}`);
  assert(safari_group?.is_active, "Dock Safari group should be active when one Safari window is focused");
  assert(safari_group?.window.id === "browser:b", `Dock should keep the focused Safari window, got ${safari_group?.window.id}`);
  const code_group = groups.find((group) => group.app_label === "Code");
  assert(code_group?.count === 0, `Dock should not count closed Code windows as running, got ${code_group?.count}`);
  assert(!code_group?.is_running, "Dock should mark closed Code window as not running");

  const slots = build_dock_app_slots(groups, [
    { app_label: "访达", kind: "finder" },
    { app_label: "Safari", kind: "browser" },
    { app_label: "Code", kind: "code_editor" },
  ]);
  assert(slots[0].app_label === "访达", `Dock should preserve pinned app order, got ${slots[0].app_label}`);
  assert(slots[1].app_label === "Safari" && slots[1].count === 2, "Dock Safari slot should reflect grouped running windows");
  assert(slots[2].app_label === "Code" && slots[2].window?.id === "code:a", "Dock Code slot should keep recoverable closed window");
  assert(slots.at(-1)?.app_label === "预览", `Dock should append unpinned running apps, got ${slots.at(-1)?.app_label}`);

  const safari_presentation = resolve_dock_slot_presentation(slots[1], "Search");
  assert(safari_presentation.state === "active", `Dock active Safari slot should present as active, got ${safari_presentation.state}`);
  assert(safari_presentation.title === "Safari · 2 个窗口 · 当前", `Dock active Safari title should summarize grouped windows, got ${safari_presentation.title}`);
  const code_presentation = resolve_dock_slot_presentation(slots[2], "app.ts");
  assert(code_presentation.state === "recoverable", `Dock closed Code slot should be recoverable, got ${code_presentation.state}`);
  assert(!code_presentation.is_disabled, "Dock closed Code slot should remain clickable for restore");
  const idle_finder_presentation = resolve_dock_slot_presentation(slots[0], "访达");
  assert(idle_finder_presentation.state === "idle", `Dock pinned Finder slot should present as idle, got ${idle_finder_presentation.state}`);
  assert(idle_finder_presentation.is_disabled, "Dock idle pinned app without a window should be disabled");
  const preview_slot = slots.at(-1);
  const preview_presentation = resolve_dock_slot_presentation(preview_slot, "README.md");
  assert(preview_presentation.state === "minimized", `Dock minimized Preview slot should present as minimized, got ${preview_presentation.state}`);
}

function verify_window_keyboard_actions_match_mac_window_controls() {
  assert(resolve_operation_window_keyboard_action({ key: "Enter" }) === "focus", "Enter should focus a desktop window");
  assert(resolve_operation_window_keyboard_action({ key: " " }) === "focus", "Space should focus a desktop window");
  assert(resolve_operation_window_keyboard_action({ key: "Escape" }) === "minimize", "Escape should minimize the focused window");
  assert(resolve_operation_window_keyboard_action({ key: "w", metaKey: true }) === "close", "Cmd+W should close the focused window");
  assert(resolve_operation_window_keyboard_action({ key: "M", metaKey: true }) === "minimize", "Cmd+M should minimize the focused window");
  assert(resolve_operation_window_keyboard_action({ key: "f", metaKey: true, ctrlKey: true }) === "zoom", "Ctrl+Cmd+F should zoom the focused window");
  assert(resolve_operation_window_keyboard_action({ key: "Enter", metaKey: true }) === "zoom", "Cmd+Enter should zoom the focused window");
  assert(resolve_operation_window_keyboard_action({ key: "`", metaKey: true }) === "cycle_next", "Cmd+` should cycle to the next desktop window");
  assert(resolve_operation_window_keyboard_action({ key: "`", metaKey: true, shiftKey: true }) === "cycle_previous", "Cmd+Shift+` should cycle to the previous desktop window");
  assert(resolve_operation_window_keyboard_action({ key: "w", metaKey: true, shiftKey: true }) === null, "Modified Cmd+W should not trigger the simple close action");
  assert(resolve_operation_window_keyboard_action({ key: "a", metaKey: true }) === null, "Unrelated shortcuts should stay with the app content");
  assert(!should_handle_stage_desktop_keyboard_action("focus"), "Desktop-level shortcuts should not hijack Enter or Space focus behavior");
  assert(should_handle_stage_desktop_keyboard_action("cycle_next"), "Desktop-level shortcuts should handle window cycling");
  assert(should_handle_stage_desktop_keyboard_action("close"), "Desktop-level shortcuts should handle active window closing");
}

function verify_agent_cursor_tracks_active_mac_app() {
  assert(agent_cursor_intent_for_window_kind("browser") === "browse", "Safari windows should show a browsing cursor intent");
  assert(agent_cursor_action_label("browse") === "正在浏览", "Browsing cursor intent should use a user-facing browsing label");
  assert(agent_cursor_intent_for_window_kind("terminal") === "run", "Terminal windows should show a running cursor intent");
  assert(agent_cursor_intent_for_window_kind("code_editor") === "type", "Code windows should show an editing cursor intent");
  assert(agent_cursor_intent_for_window_kind("permission_wait") === "approve", "Permission windows should show an approval cursor intent");

  const browser_anchor = agent_cursor_anchor_class(mock_stage_window({ id: "cursor:browser", kind: "browser", phase: "focused" }));
  const terminal_anchor = agent_cursor_anchor_class({
    ...mock_stage_window({ id: "cursor:terminal", kind: "terminal", phase: "focused" }),
    layout: "terminal",
  });
  assert(browser_anchor.includes("right-"), `Browser cursor should anchor near the browser window, got ${browser_anchor}`);
  assert(terminal_anchor.includes("left-"), `Terminal cursor should anchor near the terminal window, got ${terminal_anchor}`);
  assert(browser_anchor !== terminal_anchor, "Cursor anchors should move between app windows instead of staying static");
}

function verify_initial_window_reveal_avoids_desktop_clutter_flash() {
  assert(initial_revealed_window_count({
    minimum_count: 1,
    phase: "running",
    window_count: 5,
  }) === 1, "Running stage should reveal only the first window on the first paint");
  assert(initial_revealed_window_count({
    minimum_count: 2,
    phase: "awakening",
    window_count: 5,
  }) === 2, "Awakening stage should respect the minimum narrative window count");
  assert(initial_revealed_window_count({
    minimum_count: 1,
    phase: "completed",
    window_count: 5,
  }) === 5, "Completed stage should reveal the full review desktop immediately");
  assert(initial_revealed_window_count({
    minimum_count: 1,
    phase: "running",
    window_count: 0,
  }) === 0, "Empty desktop should stay empty on the first paint");
}

function verify_hidden_stage_uses_desktop_state_instead_of_mission_control() {
  const minimized_summary = summarize_hidden_stage_windows([
    mock_stage_window({ id: "hidden:terminal", kind: "terminal", phase: "minimized" }),
    mock_stage_window({ id: "hidden:browser", kind: "browser", phase: "minimized" }),
  ]);
  assert(minimized_summary.hidden_count === 2, `Hidden summary should count hidden windows, got ${minimized_summary.hidden_count}`);
  assert(minimized_summary.label === "2 个窗口在 Dock", `Minimized desktop should point users to Dock, got ${minimized_summary.label}`);

  const mixed_summary = summarize_hidden_stage_windows([
    mock_stage_window({ id: "hidden:terminal", kind: "terminal", phase: "minimized" }),
    mock_stage_window({ id: "hidden:browser", kind: "browser", phase: "closed" }),
  ]);
  assert(mixed_summary.label === "1 个在 Dock · 1 个已关闭", `Mixed hidden desktop should avoid Mission Control language, got ${mixed_summary.label}`);
  assert(!mixed_summary.label.toLowerCase().includes("mission"), "Hidden desktop summary should not use Mission Control panel language");
}

function verify_unclassified_tool_activity_opens_nexus_app_window(now) {
  const event = {
    id: "tool-plan-update",
    session_key: "session:stage",
    round_id: "round-generic-tool",
    agent_id: "agent-stage",
    tool_use_id: "tool-plan",
    tool_name: "TodoWrite",
    kind: "plan_update",
    surface: "summary",
    phase: "running",
    title: "更新计划",
    target: "todos",
    input_preview: {
      todos: [{ content: "打开 Safari 预览", status: "pending" }],
    },
    updated_at: now,
  };
  const desktop = plan_operation_desktop({
    event,
    snapshot: {
      key: "session:stage",
      session_key: "session:stage",
      active_event: event,
      events: [event],
      recent_evidence: [],
      workspace_events: [],
      updated_at: now,
    },
  });
  assert(desktop.windows.length === 1, `Unclassified tool activity should still open one app window, got ${desktop.windows.length}`);
  assert(desktop.windows[0].kind === "generic_tool", `Unclassified tool activity should open a Nexus app window, got ${desktop.windows[0].kind}`);
  assert(desktop.active_window_id === desktop.windows[0].id, "Unclassified tool app window should become the active desktop window");
  assert(desktop.windows[0].payload.related_events?.[0]?.tool_name === "TodoWrite", "Generic app window should keep original tool identity");
}

function verify_current_unclassified_tool_opens_beside_existing_app_window(now) {
  const read_event = {
    id: "tool-read",
    session_key: "session:stage",
    round_id: "round-mixed-tools",
    agent_id: "agent-stage",
    tool_use_id: "tool-read",
    tool_name: "Read",
    kind: "workspace_read",
    surface: "workspace",
    phase: "done",
    title: "读取文件",
    target: "/workspace/app.ts",
    input_preview: {
      file_path: "/workspace/app.ts",
    },
    result_preview: "export const app = true;",
    updated_at: now - 10,
  };
  const plan_event = {
    id: "tool-plan-update",
    session_key: "session:stage",
    round_id: "round-mixed-tools",
    agent_id: "agent-stage",
    tool_use_id: "tool-plan",
    tool_name: "TodoWrite",
    kind: "plan_update",
    surface: "summary",
    phase: "running",
    title: "更新计划",
    target: "todos",
    input_preview: {
      todos: [{ content: "打开 Safari 预览", status: "pending" }],
    },
    updated_at: now,
  };
  const desktop = plan_operation_desktop({
    event: plan_event,
    snapshot: {
      key: "session:stage",
      session_key: "session:stage",
      active_event: plan_event,
      events: [read_event, plan_event],
      recent_evidence: [],
      workspace_events: [],
      updated_at: now,
    },
  });
  const generic_window = desktop.windows.find((window) => window.kind === "generic_tool");
  assert(generic_window, "Current unclassified tool should open its own Nexus app window even when prior app windows exist");
  assert(generic_window.payload.event.id === plan_event.id, "Nexus app window should belong to the current unclassified tool");
  assert(desktop.active_window_id === generic_window.id, "Current unclassified tool window should become the focused app window");
  assert(desktop.windows.some((window) => window.kind === "code_editor"), "Existing document app window should remain on the desktop");
}

function verify_generic_tool_uses_nexus_tool_surface() {
  assert(app_surface_for_window_kind("generic_tool") === "nexus_tool", "Generic tool windows should render as the Nexus tool app");
  assert(app_surface_for_window_kind("code_editor") === "document", "Code windows should keep document preview rendering");
  assert(app_surface_for_window_kind("browser") === "specialized", "Browser windows should keep specialized app rendering");
}

function verify_nexus_tool_app_has_own_desktop_identity() {
  const nexus_menu = stage_menu_items_for_window_kind("generic_tool");
  assert(nexus_menu.includes("工具"), `Nexus tool app menu should expose tool actions, got ${nexus_menu.join(",")}`);
  assert(!nexus_menu.includes("终端"), `Nexus tool app menu should not reuse Code terminal menus, got ${nexus_menu.join(",")}`);
  const nexus_skin = dock_icon_skin_for_kind("generic_tool");
  assert(nexus_skin.includes("91,114,255"), `Nexus tool Dock skin should use the Nexus app identity, got ${nexus_skin}`);
  assert(dock_icon_skin_for_kind("code_editor") !== nexus_skin, "Nexus tool Dock skin should differ from Code");
}

function verify_window_focus_moves_to_next_visible_window() {
  const windows = [
    mock_stage_window({ id: "finder", kind: "finder", phase: "background", z: 12 }),
    mock_stage_window({ id: "browser", kind: "browser", phase: "focused", z: 40 }),
    mock_stage_window({ id: "terminal", kind: "terminal", phase: "background", z: 24 }),
    mock_stage_window({ id: "code", kind: "code_editor", phase: "minimized", z: 36 }),
  ];
  assert(resolve_next_window_focus({
    current_focus_id: "terminal",
    hidden_window_id: "browser",
    windows,
  }) === "terminal", "Hiding another window should preserve the current focused window");
  assert(resolve_next_window_focus({
    current_focus_id: "browser",
    hidden_window_id: "browser",
    windows,
  }) === "terminal", "Hiding the focused window should focus the topmost visible replacement");
  assert(resolve_next_window_focus({
    current_focus_id: "browser",
    hidden_window_id: "terminal",
    windows: windows.map((window) => window.id === "browser" ? { ...window, phase: "minimized" } : window),
  }) === "finder", "Focus fallback should skip minimized windows");
  assert(resolve_cycled_window_focus({
    current_focus_id: "browser",
    direction: "next",
    windows,
  }) === "terminal", "Window cycle should move to the next visible window by z order");
  assert(resolve_cycled_window_focus({
    current_focus_id: "browser",
    direction: "previous",
    windows,
  }) === "finder", "Reverse window cycle should wrap to the previous visible window by z order");
  assert(resolve_cycled_window_focus({
    current_focus_id: null,
    direction: "next",
    windows,
  }) === "browser", "Window cycle should start from the topmost visible window when focus is empty");
}

function verify_desktop_keyboard_target_policy() {
  assert(should_ignore_stage_desktop_keyboard_target({ tag_name: "input" }), "Desktop shortcuts should ignore text inputs");
  assert(should_ignore_stage_desktop_keyboard_target({ tag_name: "textarea" }), "Desktop shortcuts should ignore textareas");
  assert(should_ignore_stage_desktop_keyboard_target({ tag_name: "div", is_content_editable: true }), "Desktop shortcuts should ignore contenteditable areas");
  assert(!should_ignore_stage_desktop_keyboard_target({ tag_name: "button" }), "Desktop shortcuts should still work from window controls and desktop buttons");
  assert(!should_ignore_stage_desktop_keyboard_target({ tag_name: "div" }), "Desktop shortcuts should work from the desktop frame");
}

function verify_stage_menu_status_tracks_desktop_windows() {
  const windows = [
    mock_stage_window({ id: "terminal", kind: "terminal", phase: "focused" }),
    mock_stage_window({ id: "browser", kind: "browser", phase: "background" }),
    mock_stage_window({ id: "code", kind: "code_editor", phase: "minimized" }),
    mock_stage_window({ id: "finder", kind: "finder", phase: "closed" }),
  ];
  const status = build_stage_menu_status(windows, windows[0], (window) => ({
    browser: "Safari",
    code_editor: "Code",
    finder: "访达",
    terminal: "终端",
  })[window.kind] ?? "Nexus");
  assert(status.activity_label === "终端 前台", `Menu bar should expose the foreground app, got ${status.activity_label}`);
  assert(status.window_label === "2 个窗口", `Menu bar should count visible app windows, got ${status.window_label}`);
  assert(status.dock_label === "1 个在 Dock", `Menu bar should count minimized windows, got ${status.dock_label}`);

  const idle_status = build_stage_menu_status([], null, () => "Nexus");
  assert(idle_status.activity_label === "桌面待命", `Idle menu bar should report standby, got ${idle_status.activity_label}`);
  assert(idle_status.window_label === "0 个窗口", `Idle menu bar should report zero windows, got ${idle_status.window_label}`);
  assert(idle_status.dock_label === null, `Idle menu bar should omit Dock count, got ${idle_status.dock_label}`);
}

function verify_stage_window_titlebar_state() {
  const focused = build_stage_window_titlebar_state({
    app_label: "Safari",
    focused: true,
    maximized: false,
    minimized: false,
    title: "gomoku.html",
  });
  assert(focused.aria_label === "Safari window: gomoku.html", `Focused titlebar should expose app window label, got ${focused.aria_label}`);
  assert(focused.status_label === "前台", `Focused titlebar should report foreground status, got ${focused.status_label}`);
  assert(focused.zoom_label === "缩放 gomoku.html", `Focused titlebar should expose zoom action, got ${focused.zoom_label}`);

  const background = build_stage_window_titlebar_state({
    focused: false,
    maximized: true,
    minimized: false,
    title: "Nexus Console",
  });
  assert(background.aria_label === "Nexus Console", `Titlebar without app label should keep plain aria label, got ${background.aria_label}`);
  assert(background.status_label === "后台", `Background titlebar should report background status, got ${background.status_label}`);
  assert(background.zoom_title === "还原窗口", `Maximized titlebar should offer restore, got ${background.zoom_title}`);

  const minimized = build_stage_window_titlebar_state({
    app_label: "Code",
    focused: false,
    maximized: false,
    minimized: true,
    title: "app.ts",
  });
  assert(minimized.status_label === "已最小化", `Minimized titlebar should report minimized status, got ${minimized.status_label}`);
}

function mock_stage_window({
  id,
  kind,
  phase,
  z = 1,
}) {
  return {
    id,
    kind,
    layout: "primary",
    payload: {
      event: {
        id: `${id}:event`,
        session_key: "session:dock",
        round_id: "round:dock",
        agent_id: "agent-stage",
        message_id: "msg-dock",
        kind: "unknown",
        surface: "fallback",
        phase,
        updated_at: 1,
      },
      snapshot: null,
    },
    phase,
    title: id,
    z,
  };
}

function verify_stage_experience_state_machine(now) {
  const base_event = {
    id: "event-state",
    session_key: "session:stage",
    round_id: "round-state",
    agent_id: "agent-stage",
    kind: "round_summary",
    surface: "summary",
    title: "State",
    updated_at: now,
  };
  assert(
    derive_operation_stage_experience_phase(null, null) === "idle",
    "missing active event should keep stage in idle phase",
  );
  assert(
    derive_operation_stage_experience_phase({ ...base_event, phase: "queued" }, null) === "awakening",
    "queued event should enter awakening phase",
  );
  assert(
    derive_operation_stage_experience_phase({ ...base_event, phase: "running" }, null) === "running",
    "running event should enter running phase",
  );
  assert(
    derive_operation_stage_experience_phase({ ...base_event, phase: "waiting" }, null) === "running",
    "waiting event should remain in running phase with a checkpoint surface",
  );
  assert(
    derive_operation_stage_experience_phase({ ...base_event, phase: "error" }, null) === "settling",
    "error event should settle into review phase",
  );

  const single_done_event = { ...base_event, phase: "done" };
  assert(
    derive_operation_stage_experience_phase(single_done_event, {
      key: "session:stage",
      session_key: "session:stage",
      active_event: single_done_event,
      events: [single_done_event],
      recent_evidence: [],
      workspace_events: [],
      updated_at: now,
    }) === "settling",
    "single completed event should settle before full completion",
  );

  const previous_tool_event = {
    ...base_event,
    id: "event-state-tool",
    kind: "workspace_read",
    surface: "workspace",
    phase: "done",
    title: "Read",
    target: "gomoku.html",
    updated_at: now - 100,
  };
  assert(
    derive_operation_stage_experience_phase(single_done_event, {
      key: "session:stage",
      session_key: "session:stage",
      active_event: single_done_event,
      events: [previous_tool_event, single_done_event],
      recent_evidence: [],
      workspace_events: [],
      updated_at: now,
    }) === "completed",
    "multi-step completed round should enter completed phase",
  );
}

function verify_live_episode_narrates_running_round(now) {
  const base = {
    session_key: "session:stage-live",
    round_id: "round-live",
    agent_id: "agent-stage",
    updated_at: now,
  };
  const read_event = {
    ...base,
    id: "live-read",
    tool_use_id: "tool-read",
    tool_name: "Read",
    kind: "workspace_read",
    surface: "editor",
    phase: "done",
    title: "Read index",
    target: "index.html",
    updated_at: now - 300,
  };
  const write_event = {
    ...base,
    id: "live-write",
    tool_use_id: "tool-write",
    tool_name: "Write",
    kind: "workspace_edit",
    surface: "editor",
    phase: "done",
    title: "Write gomoku",
    target: "gomoku.html",
    updated_at: now - 200,
  };
  const terminal_event = {
    ...base,
    id: "live-bash",
    tool_use_id: "tool-bash",
    tool_name: "Bash",
    kind: "command_run",
    surface: "terminal",
    phase: "running",
    title: "Run open",
    target: "open gomoku.html",
    updated_at: now - 100,
  };
  const episode = build_operation_live_episode(
    terminal_event,
    [read_event, write_event, terminal_event],
    {
      key: "session:stage-live",
      session_key: "session:stage-live",
      active_event: terminal_event,
      events: [read_event, write_event, terminal_event],
      recent_evidence: [],
      workspace_events: [],
      updated_at: now,
    },
  );

  assert(episode.status_label === "现场执行", `running tool should be narrated as live operation, got ${episode.status_label}`);
  assert(episode.progress_label === "3/3", `live episode should expose current event position, got ${episode.progress_label}`);
  assert(episode.settled_count === 2, `live episode should count settled predecessors, got ${episode.settled_count}`);
  assert(episode.previous_label.includes("Write"), `live episode should point to previous settled tool, got ${episode.previous_label}`);
  assert(episode.next_label.includes("命令退出"), `terminal live episode should wait for command exit, got ${episode.next_label}`);
  assert(episode.checkpoints.some((item) => item.label === "当前" && item.value === "执行"), "live episode should mark current step as executing");
}

function verify_api_retry_runtime_projection(now) {
  const messages = [{
    role: "assistant",
    message_id: "system_api_retry_round-retry",
    session_key: "session:retry",
    agent_id: "agent-stage",
    round_id: "round-retry",
    timestamp: now - 1000,
    is_complete: false,
    content: [{
      type: "system_event",
      subtype: "api_retry",
      label: "API 正在重试",
      content: "模型请求暂未成功，正在重试",
      tone: "warning",
      icon: "retry",
      source_message_id: "system_api_retry_round-retry",
      timestamp: now - 100,
    }],
  }];

  const snapshot = project_operation_snapshot({
    key: "session:retry",
    session_key: "session:retry",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: ["round-retry"],
    workspace_events: [],
  });
  const active_event = snapshot.active_event;
  assert(active_event?.title === "API 正在重试", `api retry should become explicit stage title, got ${active_event?.title}`);
  assert(active_event?.target === "模型请求暂未成功，正在重试", `api retry should preserve retry detail, got ${active_event?.target}`);
  assert(active_event?.evidence?.some((item) => item.label === "api_retry"), "api retry event should carry retry evidence");
  const episode = build_operation_live_episode(active_event, snapshot.events, snapshot);
  assert(episode.status_label === "API 重试中", `api retry should narrate as retrying, got ${episode.status_label}`);
  assert(episode.next_label.includes("模型响应"), `api retry should wait for model response, got ${episode.next_label}`);
}

function verify_active_event_stays_with_latest_round(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-old-running",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-old",
    timestamp: now - 3000,
    is_complete: false,
    content: [{
      type: "tool_use",
      id: "tool-old-bash",
      name: "Bash",
      input: {
        command: "sleep 999",
      },
    }],
  }, {
    role: "assistant",
    message_id: "msg-new-summary",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-new",
    timestamp: now - 1000,
    is_complete: true,
    content: [{
      type: "text",
      text: "new round done",
    }],
    result_summary: {
      subtype: "success",
      duration_ms: 500,
      duration_api_ms: 400,
      num_turns: 1,
      result: "new round done",
      is_error: false,
      timestamp: now - 900,
    },
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events: [],
  });

  assert(snapshot.events.some((event) => event.round_id === "round-old" && event.phase === "running"), "fixture should include an older running event");
  assert(snapshot.active_event?.round_id === "round-new", `active event should follow latest round, got ${snapshot.active_event?.round_id}`);
  assert(snapshot.active_event?.kind === "round_summary", `latest completed round should focus summary, got ${snapshot.active_event?.kind}`);
}

function verify_error_summary_settles_live_handoff(now) {
  const live_handoff = {
    id: "live-round:round-error",
    session_key: "session:error",
    round_id: "round-error",
    agent_id: "agent-stage",
    message_id: "system_api_retry_round-error",
    kind: "unknown",
    surface: "conversation",
    phase: "running",
    title: "API 正在重试",
    target: "模型请求暂未成功，正在重试",
    evidence: [{ type: "status", label: "api_retry", value: "API 正在重试" }],
    updated_at: now - 1000,
  };
  const error_summary = {
    id: "summary-error",
    session_key: "session:error",
    round_id: "round-error",
    agent_id: "agent-stage",
    kind: "round_summary",
    surface: "summary",
    phase: "error",
    title: "本轮执行异常",
    target: "1 turns",
    summary: "Failed to authenticate",
    evidence: [{ type: "error", label: "error", value: "Failed to authenticate" }],
    updated_at: now,
    ended_at: now,
  };
  const current = {
    key: "session:error",
    session_key: "session:error",
    active_event: live_handoff,
    events: [live_handoff],
    recent_evidence: [],
    workspace_events: [],
    updated_at: now - 900,
  };
  const next = {
    key: "session:error",
    session_key: "session:error",
    active_event: error_summary,
    events: [error_summary],
    recent_evidence: error_summary.evidence,
    workspace_events: [],
    updated_at: now,
  };

  const merged = merge_operation_stage_snapshots_for_restore(current, next);
  const settled_handoff = merged.events.find((event) => event.id === live_handoff.id);
  assert(merged.active_event?.id === error_summary.id, "error summary should remain active after merge");
  assert(settled_handoff?.phase === "error", `stale live handoff should be settled as error, got ${settled_handoff?.phase}`);
  const brief = build_operation_continuation_brief(merged.active_event, merged.events, merged);
  assert(brief.checkpoints.every((item) => !String(item.value).includes("个活动")), "error completion brief should not report active running windows");
}

function verify_stage_restore_merge_preserves_round_context(now) {
  const restored_read = {
    id: "restored-read",
    session_key: "session:restore",
    round_id: "round-restore",
    agent_id: "agent-stage",
    tool_use_id: "tool-read",
    tool_name: "Read",
    kind: "workspace_read",
    surface: "editor",
    phase: "done",
    title: "Read",
    target: "index.html",
    updated_at: now - 400,
  };
  const restored_write = {
    id: "restored-write",
    session_key: "session:restore",
    round_id: "round-restore",
    agent_id: "agent-stage",
    tool_use_id: "tool-write",
    tool_name: "Write",
    kind: "workspace_edit",
    surface: "editor",
    phase: "done",
    title: "Write",
    target: "gomoku.html",
    updated_at: now - 300,
  };
  const projected_summary = {
    id: "projected-summary",
    session_key: "session:restore",
    round_id: "round-restore",
    agent_id: "agent-stage",
    kind: "round_summary",
    surface: "summary",
    phase: "done",
    title: "本轮执行收口",
    target: "1 turns",
    updated_at: now - 100,
  };
  const current = {
    key: "session:restore",
    session_key: "session:restore",
    active_event: restored_write,
    events: [restored_read, restored_write],
    recent_evidence: [{ type: "artifact", label: "gomoku", value: "gomoku.html" }],
    workspace_events: [{
      id: "workspace-gomoku",
      agent_id: "agent-stage",
      path: "gomoku.html",
      status: "updated",
      version: 1,
      source: "agent",
      session_key: "session:restore",
      tool_use_id: "tool-write",
      live_content: "<html />",
      updated_at: now - 250,
      event_type: "file_write_end",
    }],
    updated_at: now - 200,
  };
  const next = {
    key: "session:restore",
    session_key: "session:restore",
    active_event: projected_summary,
    events: [projected_summary],
    recent_evidence: [{ type: "status", label: "duration", value: "1s" }],
    workspace_events: [],
    updated_at: now,
  };

  const merged = merge_operation_stage_snapshots_for_restore(current, next);
  assert(merged.active_event?.id === "projected-summary", "restore merge should keep projected active event");
  assert(merged.events.some((event) => event.id === "restored-read"), "restore merge should preserve earlier read event from restored stage snapshot");
  assert(merged.events.some((event) => event.id === "restored-write"), "restore merge should preserve earlier write event from restored stage snapshot");
  assert(merged.events.at(-1)?.id === "projected-summary", "restore merge should keep projected summary at the end of the round");
  assert(merged.workspace_events.some((item) => item.path === "gomoku.html"), "restore merge should preserve workspace artifact for restored round");
  assert(merged.recent_evidence.some((item) => item.label === "duration"), "restore merge should include fresh projected evidence");
  assert(merged.recent_evidence.some((item) => item.label === "gomoku"), "restore merge should include restored artifact evidence");
}

function verify_workspace_live_stays_in_tool_round(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-summary",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-stage",
    timestamp: now - 1000,
    is_complete: true,
    content: [
      {
        type: "tool_use",
        id: "tool-write",
        name: "Write",
        input: {
          file_path: "gomoku.html",
          content: "<html />",
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-write",
        content: "wrote gomoku.html",
        is_error: false,
      },
    ],
    result_summary: {
      subtype: "success",
      duration_ms: 1200,
      duration_api_ms: 900,
      num_turns: 1,
      result: "done",
      is_error: false,
      timestamp: now - 500,
    },
  }];
  const workspace_events = [{
    id: "workspace-late",
    agent_id: "agent-stage",
    path: "gomoku.html",
    status: "updated",
    version: 1,
    source: "agent",
    session_key: "session:stage",
    tool_use_id: "tool-write",
    event_type: "file_write_end",
    live_content: "<html />",
    diff_stats: {
      additions: 1,
      deletions: 0,
      changed_lines: 1,
    },
    updated_at: now,
  }, {
    id: "workspace-stale",
    agent_id: "agent-stage",
    path: "stale-session.md",
    status: "updated",
    version: 8,
    source: "agent",
    session_key: "session:old",
    tool_use_id: "tool-stale",
    event_type: "file_write_end",
    live_content: "old session content",
    updated_at: now - 200,
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events,
  });
  const workspace_event = snapshot.events.find((event) => event.id === "workspace:workspace-late");
  assert(workspace_event, "workspace live event should be projected");
  assert(!snapshot.workspace_events.some((item) => item.path === "stale-session.md"), "workspace events from another session should not enter stage snapshot");
  assert(!snapshot.events.some((event) => event.target === "stale-session.md"), "workspace events from another session should not be projected as current stage events");
  assert(workspace_event.round_id === "round-stage", `workspace live event should stay in tool round, got ${workspace_event.round_id}`);
  assert(snapshot.active_event?.kind === "round_summary", `completed stage should focus round summary, got ${snapshot.active_event?.kind}`);
  const desktop = plan_operation_desktop({
    event: snapshot.active_event,
    snapshot,
  });
  assert(desktop.active_window_id?.includes(":run-manifest"), `completed stage should focus run manifest, got ${desktop.active_window_id}`);
  const manifest_window = desktop.windows.find((window) => window.kind === "run_manifest");
  assert(manifest_window, "completed stage should render a run manifest window");
  assert(manifest_window.title === "Nexus Console", `completed manifest should use Console window title, got ${manifest_window.title}`);
  assert(manifest_window.payload.handoff_summary?.status_label === "可继续", `completed manifest should expose handoff summary, got ${manifest_window.payload.handoff_summary?.status_label}`);
  assert(manifest_window.payload.handoff_summary?.resume_prompt.includes("gomoku.html"), "handoff resume prompt should point to current artifact");
  assert(!manifest_window.payload.handoff_summary?.resume_prompt.includes("stale-session.md"), "handoff resume prompt should not reference stale workspace artifact");
  const continuation_brief = build_operation_continuation_brief(snapshot.active_event, snapshot.events, snapshot);
  assert(continuation_brief.status_label === "可继续", `completed stage continuation brief should be ready, got ${continuation_brief.status_label}`);
  assert(continuation_brief.primary_artifact === "gomoku.html", `completed stage continuation brief should point to current artifact, got ${continuation_brief.primary_artifact}`);
  assert(continuation_brief.resume_prompt.includes("gomoku.html"), "completed stage continuation prompt should point to current artifact");
  const browser_window = desktop.windows.find((window) => window.kind === "browser");
  assert(browser_window?.phase === "background", `html artifact should remain open beside the run manifest, got ${browser_window?.phase}`);
  const terminal_window = desktop.windows.find((window) => window.kind === "terminal");
  if (terminal_window) {
    assert(terminal_window.phase === "minimized", `completed terminal should return to Dock, got ${terminal_window.phase}`);
  }
  const code_window = desktop.windows.find((window) => window.kind === "code_editor");
  assert(code_window?.phase === "minimized", `completed source editor should return to Dock when Safari shows the artifact, got ${code_window?.phase}`);
  assert(!desktop.windows.some((window) => window.target === "stale-session.md"), "completed stage should not render stale workspace windows");
  const write_event = snapshot.events.find((event) => event.tool_use_id === "tool-write");
  assert(write_event, "write tool event should be projected");
  const write_window_id = resolve_operation_event_window_id(write_event, desktop.windows);
  assert(write_window_id?.includes(":document:gomoku.html"), `write event should focus gomoku document window, got ${write_window_id}`);
  const summary_window_id = resolve_operation_event_window_id(snapshot.active_event, desktop.windows);
  assert(summary_window_id?.includes(":run-manifest"), `summary event should focus run manifest window, got ${summary_window_id}`);
}

function verify_multi_file_windows_keep_event_identity(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-multi-file",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-multi-file",
    timestamp: now - 1500,
    is_complete: true,
    content: [
      {
        type: "tool_use",
        id: "tool-html",
        name: "Write",
        input: {
          file_path: "gomoku.html",
          content: "<html><body>board</body></html>",
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-html",
        content: "created gomoku.html",
        is_error: false,
      },
      {
        type: "tool_use",
        id: "tool-css",
        name: "Write",
        input: {
          file_path: "style.css",
          content: "body { margin: 0; }",
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-css",
        content: "created style.css",
        is_error: false,
      },
    ],
    result_summary: {
      subtype: "success",
      duration_ms: 1500,
      duration_api_ms: 1200,
      num_turns: 1,
      result: "created app",
      is_error: false,
      timestamp: now - 100,
    },
  }];
  const workspace_events = [{
    id: "workspace-html",
    agent_id: "agent-stage",
    path: "gomoku.html",
    status: "updated",
    version: 1,
    source: "agent",
    session_key: "session:stage",
    tool_use_id: "tool-html",
    event_type: "file_write_end",
    live_content: "<html><body>board</body></html>",
    updated_at: now - 600,
  }, {
    id: "workspace-css",
    agent_id: "agent-stage",
    path: "style.css",
    status: "updated",
    version: 1,
    source: "agent",
    session_key: "session:stage",
    tool_use_id: "tool-css",
    event_type: "file_write_end",
    live_content: "body { margin: 0; }",
    updated_at: now - 500,
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events,
  });
  const desktop = plan_operation_desktop({
    event: snapshot.active_event,
    snapshot,
  });
  assert(desktop.windows.some((window) => window.id.includes(":document:gomoku.html")), "multi-file stage should keep gomoku document window");
  assert(desktop.windows.some((window) => window.id.includes(":document:style.css")), "multi-file stage should keep style document window");
  const html_event = snapshot.events.find((event) => event.tool_use_id === "tool-html");
  const css_event = snapshot.events.find((event) => event.tool_use_id === "tool-css");
  assert(html_event, "html write event should exist");
  assert(css_event, "css write event should exist");
  const html_window_id = resolve_operation_event_window_id(html_event, desktop.windows);
  const css_window_id = resolve_operation_event_window_id(css_event, desktop.windows);
  assert(html_window_id?.includes(":document:gomoku.html"), `html event should focus gomoku window, got ${html_window_id}`);
  assert(css_window_id?.includes(":document:style.css"), `css event should focus style window, got ${css_window_id}`);
  assert(
    resolve_file_preview_value(html_event, null) === "<html><body>board</body></html>",
    "html write window should render file content before tool result text",
  );
  assert(
    resolve_file_preview_value(css_event, null) === "body { margin: 0; }",
    "css write window should render file content before tool result text",
  );
  assert(
    resolve_file_preview_value(html_event, "<html><body>live board</body></html>") === "<html><body>live board</body></html>",
    "workspace live content should override stale write input in Code window",
  );
  const active_css_desktop = plan_operation_desktop({
    event: css_event,
    snapshot,
  });
  assert(active_css_desktop.active_window_id?.includes(":document:style.css"), `active workspace write should focus its document window, got ${active_css_desktop.active_window_id}`);
}

function verify_extensionless_workspace_file_opens_code_app(now) {
  const read_event = {
    id: "tool-read-makefile",
    session_key: "session:stage",
    round_id: "round-extensionless-file",
    agent_id: "agent-stage",
    tool_use_id: "tool-read",
    tool_name: "Read",
    kind: "workspace_read",
    surface: "workspace",
    phase: "done",
    title: "Read Makefile",
    target: "Makefile",
    result_preview: "test:\n\tpnpm test",
    updated_at: now,
  };
  const snapshot = {
    key: "session:stage",
    session_key: "session:stage",
    active_event: read_event,
    events: [read_event],
    recent_evidence: [],
    workspace_events: [],
    updated_at: now,
  };
  const desktop = plan_operation_desktop({
    event: read_event,
    snapshot,
  });
  const document_window = desktop.windows.find((window) => window.target === "Makefile");
  assert(document_window, "extensionless workspace file should still open a document window");
  assert(document_window.kind === "code_editor", `extensionless workspace file should open in Code, got ${document_window.kind}`);
  assert(app_surface_for_window_kind(document_window.kind) === "document", "extensionless workspace file should render as document content");
}

function verify_terminal_result_envelope(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-terminal",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-terminal",
    timestamp: now - 1000,
    is_complete: true,
    content: [
      {
        type: "tool_use",
        id: "tool-bash",
        name: "Bash",
        input: {
          command: "printf \"1\\n2\\n\"",
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-bash",
        content: "1\n2\n",
        is_error: false,
        error_code: null,
      },
    ],
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events: [],
  });
  const terminal_event = snapshot.events.find((event) => event.tool_use_id === "tool-bash");
  assert(terminal_event, "terminal tool event should be projected");
  assert(terminal_event.kind === "command_run", `terminal kind should be command_run, got ${terminal_event.kind}`);
  assert(terminal_event.surface === "terminal", `terminal surface should be terminal, got ${terminal_event.surface}`);
  assert(terminal_event.result_preview?.content === "1\n2\n", "terminal output content should be preserved");
  assert(terminal_event.result_preview?.is_error === false, "terminal success state should be preserved");
}

function verify_terminal_entries_render_real_command_result(now) {
  const success_event = {
    id: "terminal-success",
    session_key: "session:stage",
    round_id: "round-terminal",
    agent_id: "agent-stage",
    message_id: "msg-terminal",
    kind: "command_run",
    surface: "terminal",
    phase: "done",
    tool_name: "Bash",
    target: "printf \"1\\n2\\n\"",
    input_preview: {
      command: "printf \"1\\n2\\n\"",
      cwd: "/Users/berhand/.nexus/workspace/Miles",
    },
    result_preview: {
      content: "1\n2\n",
      is_error: false,
      exit_code: 0,
    },
    updated_at: now,
  };
  const error_event = {
    ...success_event,
    id: "terminal-error",
    phase: "error",
    target: "cat missing.txt",
    input_preview: {
      command: "cat missing.txt",
      cwd: "/Users/berhand/.nexus/workspace/Miles",
    },
    result_preview: {
      content: "cat: missing.txt: No such file or directory\n",
      is_error: true,
      exit_status: 1,
    },
  };

  const [success_entry] = build_terminal_entries({
    command: "",
    event: success_event,
    fallback_lines: [],
    related_events: [],
  });
  const [error_entry] = build_terminal_entries({
    command: "",
    event: error_event,
    fallback_lines: [],
    related_events: [],
  });

  assert(success_entry.command === "printf \"1\\n2\\n\"", `terminal entry should preserve command, got ${success_entry.command}`);
  assert(success_entry.stdout.join("\n") === "1\n2", `terminal success content should become stdout, got ${success_entry.stdout.join("\\n")}`);
  assert(success_entry.stderr.length === 0, `terminal success should not populate stderr, got ${success_entry.stderr.length}`);
  assert(success_entry.exit_label === "退出 0", `terminal success should show exit 0, got ${success_entry.exit_label}`);
  assert(success_entry.exit_tone === "success", `terminal success should use success tone, got ${success_entry.exit_tone}`);
  assert(error_entry.stderr.join("\n").includes("missing.txt"), `terminal error content should become stderr, got ${error_entry.stderr.join("\\n")}`);
  assert(error_entry.stdout.length === 0, `terminal error should not populate stdout, got ${error_entry.stdout.length}`);
  assert(error_entry.exit_label === "退出 1", `terminal error should show exit 1, got ${error_entry.exit_label}`);
  assert(error_entry.exit_tone === "error", `terminal error should use error tone, got ${error_entry.exit_tone}`);
}

function verify_browser_fallback_builds_search_results(now) {
  const event = {
    id: "web-search",
    session_key: "session:stage",
    round_id: "round-web",
    agent_id: "agent-stage",
    message_id: "msg-web",
    kind: "web_research",
    surface: "web",
    phase: "done",
    tool_name: "web_search",
    target: "nexus stage mac desktop",
    summary: "Search completed",
    updated_at: now,
  };

  const items = build_browser_result_items({
    event,
    query: "nexus stage mac desktop",
    lines: [
      "https://example.com/stage",
      "[Nexus Desktop](https://nexus.example.com/desktop) Window design notes",
      "Local summary without a URL",
    ],
  });

  assert(items.length === 3, `browser fallback should keep search result rows, got ${items.length}`);
  assert(items[0].url === "https://example.com/stage", `plain URL result should preserve URL, got ${items[0].url}`);
  assert(items[0].title.includes("example.com"), `plain URL result should derive readable title, got ${items[0].title}`);
  assert(items[1].title === "Nexus Desktop", `markdown link result should preserve title, got ${items[1].title}`);
  assert(items[1].url === "https://nexus.example.com/desktop", `markdown link result should preserve URL, got ${items[1].url}`);
  assert(items[2].url.startsWith("nexus-search://"), `plain text result should become a local search row, got ${items[2].url}`);
  assert(items[2].snippet === "Local summary without a URL", `plain text result should preserve snippet, got ${items[2].snippet}`);
}

function verify_finder_details_reflect_selected_workspace_item(now) {
  const items = [{
    id: "workspace-html",
    agent_id: "agent-stage",
    path: "src/gomoku.html",
    status: "updated",
    version: 3,
    source: "agent",
    session_key: "session:stage",
    tool_use_id: "tool-html",
    event_type: "file_write_end",
    live_content: "<main>\n  <h1>Gomoku</h1>\n</main>\n",
    updated_at: now,
  }, {
    id: "workspace-css",
    agent_id: "agent-stage",
    path: "src/style.css",
    status: "updated",
    version: 2,
    source: "agent",
    session_key: "session:stage",
    tool_use_id: "tool-css",
    event_type: "file_write_end",
    live_content: "body { margin: 0; }\n",
    updated_at: now,
  }];

  const selected = resolve_finder_selected_item(items, "src/gomoku.html");
  assert(selected?.path === "src/gomoku.html", `Finder should resolve selected file, got ${selected?.path}`);
  assert(finder_file_kind_label("src/gomoku.html") === "网页文件", "Finder should label html files as web files");
  assert(finder_file_kind_label("src/app.tsx") === "JavaScript 源代码", "Finder should label tsx files as JavaScript source");
  const preview_lines = finder_preview_lines(selected);
  assert(preview_lines.length === 3, `Finder preview should preserve non-empty live content lines, got ${preview_lines.length}`);
  assert(preview_lines[1].includes("Gomoku"), `Finder preview should include selected file content, got ${preview_lines[1]}`);
}

function verify_console_events_use_mac_app_subsystems(now) {
  const base_event = {
    id: "console-event",
    session_key: "session:stage",
    round_id: "round-console",
    agent_id: "agent-stage",
    message_id: "msg-console",
    kind: "unknown",
    surface: "summary",
    phase: "done",
    updated_at: now,
  };

  assert(console_event_level({ ...base_event, phase: "done" }.phase) === "INFO", "Console should map done events to INFO");
  assert(console_event_level({ ...base_event, phase: "running" }.phase) === "INFO", "Console should map running events to INFO");
  assert(console_event_level({ ...base_event, phase: "waiting" }.phase) === "NOTICE", "Console should map waiting events to NOTICE");
  assert(console_event_level({ ...base_event, phase: "error" }.phase) === "ERROR", "Console should map error events to ERROR");
  assert(console_event_subsystem({ ...base_event, surface: "terminal" }) === "Terminal", "Console subsystem should use Terminal for command events");
  assert(console_event_subsystem({ ...base_event, surface: "web" }) === "Safari", "Console subsystem should use Safari for web events");
  assert(console_event_subsystem({ ...base_event, surface: "workspace" }) === "Finder", "Console subsystem should use Finder for workspace events");
  assert(console_event_subsystem({ ...base_event, surface: "editor" }) === "Code", "Console subsystem should use Code for editor events");

  const sources = collect_manifest_log_sources([
    { ...base_event, id: "terminal", surface: "terminal" },
    { ...base_event, id: "web", surface: "web" },
    { ...base_event, id: "editor", surface: "editor" },
  ]);
  assert(sources[0]?.label === "这台 Mac", `Console source list should begin with this Mac, got ${sources[0]?.label}`);
  assert(sources.some((source) => source.label === "Nexus" && source.count === 3), "Console source list should include Nexus desktop source");
  assert(sources.some((source) => source.label === "Terminal"), "Console source list should include Terminal source");
  assert(sources.some((source) => source.label === "Safari"), "Console source list should include Safari source");
  assert(sources.some((source) => source.label === "Code"), "Console source list should include Code source");
}

function verify_activity_monitor_process_metrics() {
  assert(activity_pid_label("task-one") === activity_pid_label("task-one"), "Activity Monitor PID should be deterministic");
  assert(activity_pid_label("task-one") !== activity_pid_label("task-two"), "Activity Monitor PID should vary per process id");
  assert(activity_cpu_label("running", 0) === "12.0", `running task CPU should start at 12.0, got ${activity_cpu_label("running", 0)}`);
  assert(activity_cpu_label("waiting", 2) === "1.2", `waiting task CPU should stay low, got ${activity_cpu_label("waiting", 2)}`);
  assert(activity_cpu_label("done", 1) === "0.0", `completed task CPU should be idle, got ${activity_cpu_label("done", 1)}`);
  const active_load = activity_cpu_load(2, 0);
  assert(active_load.total > active_load.system, "Activity Monitor total CPU should include system and user load");
  assert(active_load.total <= 96, `Activity Monitor total CPU should be capped, got ${active_load.total}`);
  const idle_load = activity_cpu_load(0, 2);
  assert(idle_load.total < active_load.total, "Activity Monitor idle CPU should be lower than active CPU");
}

function verify_completed_manifest_keeps_terminal_window_identity(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-completed-terminal",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-completed-terminal",
    timestamp: now - 1500,
    is_complete: true,
    content: [
      {
        type: "tool_use",
        id: "tool-bash",
        name: "Bash",
        input: {
          command: "open gomoku.html",
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-bash",
        content: "opened gomoku.html",
        is_error: false,
      },
    ],
    result_summary: {
      subtype: "success",
      duration_ms: 1500,
      duration_api_ms: 1200,
      num_turns: 1,
      result: "opened",
      is_error: false,
      timestamp: now - 100,
    },
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events: [],
  });
  const desktop = plan_operation_desktop({
    event: snapshot.active_event,
    snapshot,
  });
  const terminal_window = desktop.windows.find((window) => window.kind === "terminal");
  assert(terminal_window, "completed stage should keep terminal window when the round had command events");
  assert(terminal_window.payload.event.surface === "terminal", `terminal window should keep terminal event identity, got ${terminal_window.payload.event.surface}`);
  assert(terminal_window.payload.event.tool_name === "Bash", `terminal window should keep Bash event identity, got ${terminal_window.payload.event.tool_name}`);
}

function verify_pending_permissions_are_scoped_and_precise(now) {
  const messages = [{
    role: "assistant",
    message_id: "msg-permission",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-permission",
    timestamp: now - 1000,
    is_complete: false,
    content: [
      {
        type: "tool_use",
        id: "tool-ls",
        name: "Bash",
        input: {
          command: "ls",
        },
      },
      {
        type: "tool_use",
        id: "tool-pwd",
        name: "Bash",
        input: {
          command: "pwd",
        },
      },
    ],
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [{
      request_id: "permission-current",
      tool_name: "Bash",
      tool_input: {
        command: "pwd",
      },
      session_key: "session:stage",
      agent_id: "agent-stage",
      message_id: "msg-permission",
      risk_label: "medium",
      summary: "需要确认 pwd",
    }, {
      request_id: "permission-stale-session",
      tool_name: "Bash",
      tool_input: {
        command: "rm -rf old",
      },
      session_key: "session:old",
      agent_id: "agent-stage",
      message_id: "msg-permission",
      risk_label: "high",
      summary: "旧会话权限",
    }, {
      request_id: "permission-stale-agent",
      tool_name: "Write",
      tool_input: {
        file_path: "stale-agent.md",
      },
      session_key: "session:stage",
      agent_id: "agent-old",
      risk_label: "high",
      summary: "旧智能体权限",
    }, {
      request_id: "permission-unscoped",
      tool_name: "Edit",
      tool_input: {
        file_path: "unscoped.md",
      },
      risk_label: "medium",
      summary: "缺少归属的权限",
    }],
    live_round_ids: ["round-permission"],
    workspace_events: [],
  });

  const ls_event = snapshot.events.find((event) => event.tool_use_id === "tool-ls");
  const pwd_event = snapshot.events.find((event) => event.tool_use_id === "tool-pwd");
  assert(ls_event?.phase === "running", `unmatched Bash tool should keep running, got ${ls_event?.phase}`);
  assert(pwd_event?.phase === "waiting", `exact Bash permission should attach to pwd, got ${pwd_event?.phase}`);
  assert(pwd_event?.summary === "需要确认 pwd", "matched permission summary should be attached to the precise tool");
  assert(!snapshot.events.some((event) => event.id === "permission:permission-stale-session"), "permission from another session should not enter stage events");
  assert(!snapshot.events.some((event) => event.id === "permission:permission-stale-agent"), "permission from another agent should not enter stage events");
  assert(!snapshot.events.some((event) => event.id === "permission:permission-unscoped"), "unscoped permission should not enter a session-specific stage");
}

function verify_live_round_placeholder(now) {
  const messages = [{
    role: "user",
    message_id: "msg-user",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-live",
    timestamp: now - 1000,
    content: "写一个五子棋小游戏",
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: ["round-live"],
    workspace_events: [],
  });
  assert(snapshot.active_event?.id === "live-round:round-live", "live round without tool events should create a placeholder event");
  assert(snapshot.active_event?.phase === "running", `live round placeholder should be running, got ${snapshot.active_event?.phase}`);
  assert(snapshot.active_event?.surface === "conversation", `live round placeholder should use conversation surface, got ${snapshot.active_event?.surface}`);
  assert(snapshot.active_event?.title === "桌面待命", `live round placeholder should read as a desktop idle state, got ${snapshot.active_event?.title}`);
  assert(snapshot.active_event?.target === "等待第一个应用窗口", `live round placeholder should wait for the first app window, got ${snapshot.active_event?.target}`);
  const desktop = plan_operation_desktop({
    event: snapshot.active_event,
    snapshot,
  });
  assert(desktop.active_window_id === null, `live round should keep the desktop idle before tools, got ${desktop.active_window_id}`);
  assert(desktop.windows.length === 0, `live round should not open app windows before tools, got ${desktop.windows.length}`);
  assert(!desktop.windows.some((window) => window.kind === "summary"), "live round should not reuse summary window before tools exist");
}

function verify_synthetic_error_summary(now) {
  const messages = [{
    role: "user",
    message_id: "msg-user-error",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-error",
    timestamp: now - 186000,
    content: "写一个五子棋小游戏",
  }, {
    role: "assistant",
    message_id: "msg-synthetic-error",
    session_key: "session:stage",
    agent_id: "agent-stage",
    round_id: "round-error",
    timestamp: now - 1000,
    is_complete: true,
    model: "<synthetic>",
    content: [{
      type: "text",
      text: "Failed to authenticate. API Error: 401",
    }],
    result_summary: {
      subtype: "success",
      duration_ms: 1000,
      duration_api_ms: 0,
      num_turns: 1,
      is_error: false,
      timestamp: now,
    },
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage",
    session_key: "session:stage",
    agent_id: "agent-stage",
    messages,
    pending_permissions: [],
    live_round_ids: [],
    workspace_events: [],
  });
  assert(snapshot.active_event?.phase === "error", `synthetic API error should project as error, got ${snapshot.active_event?.phase}`);
  assert(snapshot.active_event?.title === "本轮执行异常", `synthetic API error title should be abnormal, got ${snapshot.active_event?.title}`);
  assert(snapshot.active_event?.evidence?.some((item) => item.type === "error"), "synthetic API error should keep error evidence");
  assert(snapshot.active_event?.result_preview?.is_error === true, "synthetic API error summary preview should be marked as error");
  assert(snapshot.active_event?.result_preview?.subtype === "error", `synthetic API error summary preview should use error subtype, got ${snapshot.active_event?.result_preview?.subtype}`);
  assert(snapshot.active_event?.started_at === now - 186000, "summary event should start from the first message in the round");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
