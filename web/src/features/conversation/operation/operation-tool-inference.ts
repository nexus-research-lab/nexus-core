import type { OperationToolProfile } from "./operation-tool-catalog";

export function infer_operation_tool_profile(
  tool_name: string,
  profiles: Record<string, OperationToolProfile>,
  default_target_keys: readonly string[],
): OperationToolProfile | null {
  const normalized = normalize_tool_name_for_match(tool_name);
  const tokens = tokenize_tool_name_for_match(normalized);

  if (matches_any(normalized, ["askuserquestion", "requestuserinput", "request_user_input", "question"]) || tokens.has("permission")) {
    return profiles.AskUserQuestion;
  }
  if (matches_any(normalized, ["todowrite", "updateplan", "update_plan", "plan"])) {
    return profiles.TodoWrite;
  }
  if (matches_any(normalized, ["spawnagent", "spawn_agent", "waitagent", "wait_agent", "taskoutput"])) {
    return profiles.TaskOutput;
  }
  if (tokens.has("task") || tokens.has("agent")) {
    return profiles.Task;
  }
  if (matches_any(normalized, ["killshell", "kill_shell", "stopcommand", "stop_command", "cancel"])) {
    return profiles.KillShell;
  }
  if (matches_any(normalized, [
    "bash",
    "shell",
    "terminal",
    "execcommand",
    "exec_command",
    "runcommand",
    "run_command",
    "writestdin",
    "write_stdin",
  ])) {
    return profiles.Bash;
  }
  if (matches_any(normalized, ["websearch", "web_search", "searchquery", "search_query", "bravesearch"])) {
    return profiles.WebSearch;
  }
  if (matches_any(normalized, [
    "webfetch",
    "web_fetch",
    "fetch",
    "openurl",
    "open_url",
    "browser",
    "chrome",
    "screenshot",
    "computeruse",
    "computer_use",
  ])) {
    return profiles.WebFetch;
  }
  if (matches_any(normalized, ["applypatch", "apply_patch", "multiedit", "multi_edit", "replace", "patch"])) {
    return profiles.MultiEdit;
  }
  if (matches_any(normalized, ["writefile", "write_file", "createfile", "create_file", "create"])) {
    return profiles.Write;
  }
  if (matches_any(normalized, ["editfile", "edit_file", "edit", "updatefile", "update_file"])) {
    return profiles.Edit;
  }
  if (matches_any(normalized, ["grep", "searchfile", "search_file", "searchtext", "search_text", "rg"])) {
    return profiles.Grep;
  }
  if (matches_any(normalized, ["glob", "listfile", "list_file", "listfiles", "list_files", "ls", "directory"])) {
    return profiles.LS;
  }
  if (matches_any(normalized, ["readfile", "read_file", "read", "cat", "viewfile", "view_file"])) {
    return profiles.Read;
  }
  if (matches_any(normalized, ["skill", "context", "docs", "documentation"])) {
    return profiles.Skill;
  }
  if (matches_any(normalized, ["summary", "final", "respond"])) {
    return {
      action: "summary",
      action_label: "交接",
      title: "执行交接",
      kind: "round_summary",
      surface: "summary",
      target_keys: default_target_keys,
      evidence_type: "status",
    };
  }

  return null;
}

function normalize_tool_name_for_match(tool_name: string): string {
  return tool_name.trim().toLowerCase().replace(/^mcp__/, "").replace(/^functions\./, "");
}

function matches_any(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value === pattern || value.includes(pattern));
}

function tokenize_tool_name_for_match(tool_name: string): Set<string> {
  return new Set(tool_name.split(/[^a-z0-9]+/).filter(Boolean));
}
