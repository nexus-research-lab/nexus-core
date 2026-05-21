import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

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
copyFileSync(join(operation_dir, "operation-types.js"), join(operation_dir, "operation-types"));
copyFileSync(join(operation_dir, "operation-desktop-types.js"), join(operation_dir, "operation-desktop-types"));
copyFileSync(join(operation_dir, "operation-preview.js"), join(operation_dir, "operation-preview"));
copyFileSync(join(operation_dir, "operation-stage-experience.js"), join(operation_dir, "operation-stage-experience"));

const { project_operation_snapshot } = await import(pathToFileURL(join(operation_dir, "operation-projector.js")));
const {
  plan_operation_desktop,
  resolve_operation_event_window_id,
} = await import(pathToFileURL(join(operation_dir, "operation-scene-planner.js")));
const {
  build_operation_continuation_brief,
  build_operation_live_episode,
  derive_operation_stage_experience_phase,
} = await import(pathToFileURL(join(operation_dir, "operation-stage-experience.js")));
const now = Date.now();

verify_stage_experience_state_machine(now);
verify_live_episode_narrates_running_round(now);
verify_workspace_live_stays_in_tool_round(now);
verify_multi_file_windows_keep_event_identity(now);
verify_terminal_result_envelope(now);
verify_completed_manifest_keeps_terminal_window_identity(now);
verify_pending_permissions_are_scoped_and_precise(now);
verify_live_round_placeholder(now);
verify_synthetic_error_summary(now);

console.log("operation-stage projector verification passed");

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

  assert(episode.status_label === "LIVE_OPERATION", `running tool should be narrated as live operation, got ${episode.status_label}`);
  assert(episode.progress_label === "3/3", `live episode should expose current event position, got ${episode.progress_label}`);
  assert(episode.settled_count === 2, `live episode should count settled predecessors, got ${episode.settled_count}`);
  assert(episode.previous_label.includes("Write"), `live episode should point to previous settled tool, got ${episode.previous_label}`);
  assert(episode.next_label.includes("命令退出"), `terminal live episode should wait for command exit, got ${episode.next_label}`);
  assert(episode.checkpoints.some((item) => item.label === "当前" && item.value === "执行"), "live episode should mark current step as executing");
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
  assert(manifest_window.payload.handoff_summary?.status_label === "READY_TO_CONTINUE", `completed manifest should expose handoff summary, got ${manifest_window.payload.handoff_summary?.status_label}`);
  assert(manifest_window.payload.handoff_summary?.resume_prompt.includes("gomoku.html"), "handoff resume prompt should point to current artifact");
  assert(!manifest_window.payload.handoff_summary?.resume_prompt.includes("stale-session.md"), "handoff resume prompt should not reference stale workspace artifact");
  const continuation_brief = build_operation_continuation_brief(snapshot.active_event, snapshot.events, snapshot);
  assert(continuation_brief.status_label === "READY_TO_CONTINUE", `completed stage continuation brief should be ready, got ${continuation_brief.status_label}`);
  assert(continuation_brief.primary_artifact === "gomoku.html", `completed stage continuation brief should point to current artifact, got ${continuation_brief.primary_artifact}`);
  assert(continuation_brief.resume_prompt.includes("gomoku.html"), "completed stage continuation prompt should point to current artifact");
  assert(desktop.windows.some((window) => window.kind === "browser"), "html artifact should remain open beside the run manifest");
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
  const active_css_desktop = plan_operation_desktop({
    event: css_event,
    snapshot,
  });
  assert(active_css_desktop.active_window_id?.includes(":document:style.css"), `active workspace write should focus its document window, got ${active_css_desktop.active_window_id}`);
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
  const desktop = plan_operation_desktop({
    event: snapshot.active_event,
    snapshot,
  });
  assert(desktop.active_window_id?.includes(":runtime-handoff"), `live round should focus runtime handoff window, got ${desktop.active_window_id}`);
  assert(desktop.windows.some((window) => window.kind === "runtime_handoff"), "live round should render a runtime handoff window");
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
