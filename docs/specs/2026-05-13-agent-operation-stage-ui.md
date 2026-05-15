# Agent Operation Stage UI Design

## Goal

Design a reusable UI pattern for agent products where the user sees two coordinated surfaces:

- A clean conversation mainline for user intent, assistant reasoning summaries, approvals, and final answers.
- A real-time operation stage that renders tool calls as lifelike computer operations: opening files, reading documents, editing code, running commands, searching the web, inspecting browser output, and closing work surfaces after completion.

The goal is not to show a tool log. The goal is to make the invisible work of an agent legible, trustworthy, and calm.

## Product Principle

The chat is the source of truth for the conversation.

The operation stage is the source of truth for execution visibility.

Do not mix these responsibilities:

- User questions, approvals, permission decisions, and final responses stay in the chat.
- Tool execution, workspace navigation, file changes, web browsing, terminal output, and artifact handling are rendered in the operation stage.
- The stage should feel like the agent is operating a computer, not like a list of JSON events.

## Mental Model

The operation stage is a visual replay layer over tool calls.

Each tool call becomes a short scene:

1. Open the relevant surface.
2. Focus the target.
3. Perform the action.
4. Show the result.
5. Close or collapse the surface.

Examples:

- `filesystem.list`: open a file browser, navigate to the directory, show the selected folder.
- `filesystem.read`: open a file browser, select the file, open an editor preview.
- `filesystem.write` / `patch.apply`: open an editor, show inserted or changed lines, keep a diff summary.
- `web.search`: open a browser, type the query, show results, open a source preview, extract notes.
- `skill.use` / `mcp.read_resource`: open a document reader, highlight the relevant section, close it when done.
- `shell.run`: open a terminal, type the command, stream output, show exit status, close when done.
- `git.diff`: open a diff viewer and repository status surface.

The user should feel: "The agent is doing work in a workspace I can understand."

## Primary UX Layout

### Left: Conversation Mainline

Reference: Codex and Claude Code web-style transcript.

The left side should be quiet and readable:

- A single transcript with stable message layout.
- Compact user messages.
- Assistant messages optimized for long-form reading.
- Inline approval cards when user action is required.
- Minimal inline tool status only, such as "Reading files..." or "Running tests...".
- Fixed composer at the bottom.
- Model, permission, and workspace state should be visible but low-emphasis.

The chat must not show detailed tool logs by default. Detailed execution belongs in the stage.

### Right: Operation Stage

The right side should feel like a high-quality remote computer or workbench:

- Dark, focused canvas.
- One primary active scene at a time.
- Windows open and close with clear purpose.
- The active target is visually obvious.
- Long-running tools show progress or streaming output.
- Completed work collapses into summaries and artifacts.

The stage should not include a permanent stepper or numbered timeline unless the product is in debug mode. A bottom `1/2/3/4` strip feels like prototype navigation and should not appear in the normal product experience.

## Event Architecture

Do not let UI components parse raw tool payloads directly.

Introduce a normalized event layer:

```ts
type OperationSceneKind =
  | "workspace"
  | "edit"
  | "web"
  | "browser"
  | "terminal"
  | "git"
  | "document"
  | "summary";

type OperationPhase =
  | "opening"
  | "running"
  | "closing"
  | "done"
  | "error";

type OperationEvent = {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  scene: OperationSceneKind;
  phase: OperationPhase;
  title: string;
  target?: string;
  detail?: string;
  argsPreview?: Record<string, unknown>;
  resultPreview?: unknown;
  diffPreview?: unknown;
  artifacts?: unknown[];
  startedAt?: number;
  endedAt?: number;
};
```

The model or runtime may expose raw events such as:

- `tool_start`
- `tool_result`
- `tool_approval_required`
- `tool_approval_decision`
- `done`
- trace spans
- sandbox events
- workspace snapshots
- artifacts

Those raw events should be projected into `OperationEvent` before reaching UI scene components.

## Operation Projector

The `operationProjector` is the key abstraction.

Responsibilities:

- Convert raw runtime events into UI-ready `OperationEvent` objects.
- Map tool names to scene kinds.
- Redact secrets from arguments and results.
- Extract stable targets, such as file paths, URLs, commands, skill names, or git refs.
- Attach diff and artifact previews when available.
- Coalesce noisy events so the UI does not re-render on every small payload.
- Preserve ordering by run and tool call.

The projector can live in a shared runtime package or frontend runtime layer, but it should be tested independently.

### Tool-to-Scene Mapping

Use tool families, not individual one-off components:

| Tool family | Scene |
| --- | --- |
| `filesystem.list`, `filesystem.read`, `search.grep` | `workspace` |
| `filesystem.write`, `filesystem.delete`, `filesystem.move`, `patch.apply` | `edit` |
| `web.search`, `web.extract`, `web.map` | `web` |
| `browser.open`, `browser.download` | `browser` |
| `shell.run`, `test.run` | `terminal` |
| `git.status`, `git.diff`, `git.add`, `git.commit`, `git.log`, `git.show` | `git` |
| `skill.*`, `prompt.*`, `mcp.resources`, `mcp.read_resource`, `context.trace` | `document` |
| final run result | `summary` |

Unknown tools should fall back to `workspace` or a generic `document` scene with a clear title, not crash the stage.

## Component Architecture

Keep the component set small and composable.

### Data Components

- `operationProjector`: raw event to `OperationEvent`.
- `sceneRegistry`: maps scene kinds to renderers.
- `useOperationReplay`: subscribes to runtime events and maintains current scene state.
- `previewBudget`: truncates large outputs and protects rendering cost.
- `redaction`: strips secrets from args and result previews.

### Conversation Components

- `ChatShell`
- `MessageList`
- `UserMessage`
- `AssistantMessage`
- `InlineToolStatus`
- `ApprovalCard`
- `Composer`
- `StreamingMarkdown`

### Stage Foundation Components

- `OperationStage`
- `SceneViewport`
- `StageHeader`
- `StageWindow`
- `WindowChrome`
- `SceneTransition`
- `TypingText`
- `ProgressBadge`
- `ArtifactSummary`
- `ReducedMotionFallback`

### Scene Components

Start with:

- `WorkspaceScene`
- `EditScene`
- `WebScene`
- `DocumentScene`
- `TerminalScene`
- `SummaryScene`

Add later:

- `GitScene`
- `BrowserScene`
- `ArtifactScene`
- `TestResultScene`

The first useful production version should be around 18-22 components. A polished full version can grow to 30-40 components, but it should not become one component per tool.

## Scene Behavior

### Workspace Scene

Use for reading and listing local workspace content.

Visual flow:

1. Open a file browser.
2. Navigate to the target folder.
3. Highlight the target file or directory.
4. If reading a file, open an editor preview.
5. Collapse into "file read" state when done.

Data needed:

- path
- directory entries if available
- file preview if available
- status and duration

### Edit Scene

Use for file writes, moves, deletes, and patches.

Visual flow:

1. Open editor or diff window.
2. Focus changed file.
3. Animate changed lines or diff blocks.
4. Show created/modified/deleted summary.
5. Keep artifact/diff summary available after closing.

Data needed:

- path
- diff summary
- created/modified/deleted paths
- optional before/after snapshots

### Web Scene

Use for web search, extraction, and map operations.

Visual flow:

1. Open browser.
2. Type query or URL.
3. Load result list.
4. Focus selected source.
5. Show source preview or extracted chunks.
6. Close browser after notes are captured.

Data needed:

- query or URL
- source list
- selected source
- extracted text or chunk preview
- provider and usage if available

### Document Scene

Use for skills, prompts, MCP resources, and context documents.

Visual flow:

1. Open document reader.
2. Show source name and path/URI.
3. Highlight relevant section.
4. Extract constraints or notes.
5. Close reader and return to workspace.

Data needed:

- document name
- source type
- URI or local path
- preview text

### Terminal Scene

Use for shell commands, tests, and command-like tools.

Visual flow:

1. Open terminal.
2. Type command.
3. Stream output.
4. Show exit status.
5. Collapse terminal on success, keep open on failure.

Data needed:

- command
- cwd
- streamed lines
- exit code
- duration

### Summary Scene

Use when the run ends or when a major phase completes.

Visual flow:

1. Close active windows.
2. Show compact cards:
   - opened
   - changed
   - generated
   - verified
3. Return focus to the chat final answer.

Data needed:

- opened files
- changed files
- artifacts
- commands
- errors

## Performance Requirements

This feature can become expensive if implemented naively.

Rules:

- Render only the active scene, the previous scene if needed for transition, and a compact summary.
- Do not render the full tool history as mounted DOM.
- Use virtualization for long chat transcripts.
- Coalesce operation events at 50-150 ms intervals.
- Use `transform` and `opacity` for animation; avoid layout-heavy animation.
- Keep terminal output in a ring buffer, for example 500-1000 lines.
- Never render full large files. Use preview windows with truncation.
- Lazy-load rare scene components such as `GitScene`, `BrowserScene`, or `ArtifactScene`.
- Use CSS containment where possible for the stage.
- Respect `prefers-reduced-motion`.

Suggested budgets:

- Stage update frequency: max 10-20 visual updates per second.
- Active DOM nodes in stage: under 800 for normal operation.
- File preview: default 200-400 lines or 50 KB, whichever comes first.
- Terminal preview: default 500 lines.
- Web result preview: default 5-10 sources.

## Security and Privacy

The stage must be useful without leaking secrets.

Requirements:

- Redact API keys, tokens, passwords, cookies, auth headers, and secret-looking values.
- Do not show full `.env` or credential files by default.
- For destructive operations, rely on chat approval cards, not stage controls.
- The stage can show "approval waiting" state, but approval decisions happen in chat.
- Web search previews should show sources and excerpts, not raw unbounded page dumps.
- If a tool result contains sensitive raw payloads, the projector must replace them with a safe summary.

## Accessibility

Requirements:

- Stage content should not be the only place where important state appears. Chat should still contain concise status.
- Support reduced motion.
- Ensure color is not the only indicator of status.
- Terminal output and file previews should be readable with sufficient contrast.
- Windows and scenes need semantic labels if implemented as interactive components.

## Product Modes

The operation stage should support modes:

### Normal Mode

Default user experience.

- No bottom numbered scene strip.
- No debug event list.
- One active operation at a time.
- Smooth scene transitions.
- Compact history summary only.

### Debug Mode

For developers.

- Raw event viewer.
- Tool call payloads.
- Scene mapping result.
- Timing and performance counters.
- Links to trace, sandbox events, and artifacts.

### Reduced Mode

For low-power devices or reduced-motion preference.

- Static scene cards.
- No typing animation.
- No window choreography.
- Same information hierarchy.

## Implementation Plan

### Phase 1: Design and Contracts

Deliverables:

- This design document.
- `OperationEvent` schema.
- Tool-to-scene mapping table.
- Redaction and preview budget rules.

Exit criteria:

- Other projects can implement the same pattern without knowing this codebase.

### Phase 2: Runtime Projection

Deliverables:

- `operationProjector`.
- Tests for tool family mapping.
- Tests for redaction.
- Tests for large output truncation.

Exit criteria:

- Raw tool events can be converted into stable operation events.

### Phase 3: Conversation Mainline

Deliverables:

- Codex/Claude Code style transcript.
- Inline approval card.
- Minimal inline tool status.
- Fixed composer.

Exit criteria:

- Chat remains readable during long tool runs.
- Approvals are easy to understand and act on.

### Phase 4: Core Operation Stage

Deliverables:

- `OperationStage`.
- `WorkspaceScene`.
- `EditScene`.
- `WebScene`.
- `DocumentScene`.
- `TerminalScene`.
- `SummaryScene`.

Exit criteria:

- Common tool calls render as realistic operation flows.
- Unknown tools render through a safe fallback.

### Phase 5: Performance and Polish

Deliverables:

- Event coalescing.
- Terminal ring buffer.
- File preview budget.
- Lazy scene loading.
- Reduced motion mode.
- Debug mode.

Exit criteria:

- Long runs remain smooth.
- The UI does not degrade when many tools are called.

### Phase 6: Advanced Scenes

Deliverables:

- `GitScene`.
- `BrowserScene`.
- `ArtifactScene`.
- `TestResultScene`.

Exit criteria:

- Repository and browser-heavy workflows feel first-class.

## Acceptance Criteria

The implementation is successful when:

- A user can understand what the agent is doing without reading raw logs.
- Chat remains the primary source for communication and decisions.
- Approvals never move into the operation stage.
- Files, web searches, skill reads, and commands each have distinct visual flows.
- The UI remains smooth during long runs.
- Large outputs are safely summarized.
- Unknown tools degrade gracefully.
- The same design can be reused in another agent project by implementing the `OperationEvent` contract.

## Handoff Prompt for Other Projects

Use this prompt when asking another agent or team to implement the pattern:

```text
Implement an agent UI with two coordinated surfaces:

1. A clean Codex/Claude Code style conversation mainline. It owns user messages, assistant responses, approvals, permission decisions, and final answers.
2. A right-side Operation Stage that renders tool calls as realistic computer operations. It must not be a raw event log.

Introduce a normalized OperationEvent layer between runtime events and UI components. Do not make one component per tool. Map tool families into scene kinds:
- workspace: filesystem list/read/search
- edit: writes, moves, deletes, patches
- web: web search/extract/map
- browser: browser open/download/screenshot
- terminal: shell/test commands
- git: status/diff/add/commit/log/show
- document: skills, prompts, MCP resources, context
- summary: close windows and summarize results

The Operation Stage should show one active scene at a time. Use window choreography to make the agent feel like it is operating a computer: open the relevant surface, focus the target, perform the action, show result, then close or summarize.

Performance requirements:
- render only active scene plus compact summary
- coalesce frequent events
- truncate large files and terminal output
- lazy-load rare scenes
- use transform/opacity animations
- support prefers-reduced-motion
- redact secrets before rendering

Approvals stay inline in chat. The stage may show waiting state but must not become the permission surface.
```
