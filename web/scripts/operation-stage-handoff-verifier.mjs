export function verify_handoff_spotlight_model({
  assert,
  build_operation_stage_handoff_spotlight_model,
  now,
}) {
  const base = {
    session_key: "session:handoff",
    round_id: "round-handoff",
    agent_id: "agent-stage",
    updated_at: now,
  };
  const write_event = {
    ...base,
    id: "handoff-write",
    tool_use_id: "tool-write",
    tool_name: "Write",
    kind: "workspace_edit",
    surface: "workspace",
    phase: "done",
    title: "Write gomoku",
    target: "gomoku.html",
    updated_at: now - 200,
  };
  const summary_event = {
    ...base,
    id: "handoff-summary",
    kind: "round_summary",
    surface: "summary",
    phase: "done",
    title: "Gomoku ready",
    summary: "五子棋小游戏已完成",
    updated_at: now,
  };
  const model = build_operation_stage_handoff_spotlight_model({
    completed_count: 2,
    event: summary_event,
    events: [write_event, summary_event],
    narrative_phase: "completed",
    snapshot: {
      key: "session:handoff",
      session_key: "session:handoff",
      active_event: summary_event,
      events: [write_event, summary_event],
      recent_evidence: [],
      workspace_events: [{
        id: "workspace-gomoku",
        path: "gomoku.html",
        status: "updated",
        timestamp: now - 100,
        tool_use_id: "tool-write",
      }],
      updated_at: now,
    },
    total_count: 2,
  });

  assert(model !== null, "completed handoff should produce spotlight model");
  assert(model.is_completed === true, "successful completed handoff should mark spotlight as completed");
  assert(model.steps[0].value === "nexus 字符场", "handoff should keep nexus character field as entry step");
  assert(model.steps[1].value === "2 个动作", `handoff should narrate event count, got ${model.steps[1].value}`);
  assert(model.steps[2].value === "gomoku.html", `handoff should use workspace artifact, got ${model.steps[2].value}`);

  const running_model = build_operation_stage_handoff_spotlight_model({
    completed_count: 1,
    event: { ...write_event, phase: "running" },
    events: [{ ...write_event, phase: "running" }],
    narrative_phase: "running",
    snapshot: null,
    total_count: 1,
  });
  assert(running_model === null, "running phase should not show completed handoff spotlight");
}
