export function verify_html_artifact_opens_browser_srcdoc({
  assert,
  now,
  plan_operation_desktop,
  project_operation_snapshot,
}) {
  const html_content = "<html><body><main>gomoku board</main></body></html>";
  const messages = [{
    role: "assistant",
    message_id: "msg-browser-preview",
    session_key: "session:stage-browser",
    agent_id: "agent-stage",
    round_id: "round-browser-preview",
    timestamp: now - 1200,
    is_complete: true,
    content: [
      {
        type: "tool_use",
        id: "tool-html-preview",
        name: "Write",
        input: {
          file_path: "gomoku.html",
          content: html_content,
        },
      },
      {
        type: "tool_result",
        tool_use_id: "tool-html-preview",
        content: "created gomoku.html",
        is_error: false,
      },
    ],
    result_summary: {
      subtype: "success",
      duration_ms: 1200,
      duration_api_ms: 900,
      num_turns: 1,
      result: "created html gomoku",
      is_error: false,
      timestamp: now - 100,
    },
  }];
  const workspace_events = [{
    id: "workspace-browser-preview",
    agent_id: "agent-stage",
    path: "gomoku.html",
    status: "updated",
    version: 1,
    source: "agent",
    session_key: "session:stage-browser",
    tool_use_id: "tool-html-preview",
    event_type: "file_write_end",
    live_content: html_content,
    updated_at: now - 700,
  }];

  const snapshot = project_operation_snapshot({
    key: "session:stage-browser",
    session_key: "session:stage-browser",
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
  const browser_window = desktop.windows.find((window) => window.kind === "browser");
  assert(browser_window, "html stage should include a browser preview window");
  assert(browser_window.title === "gomoku.html", `browser preview should use artifact title, got ${browser_window.title}`);
  assert(browser_window.payload.srcdoc === html_content, "browser preview should carry workspace live html content as srcdoc");
}
