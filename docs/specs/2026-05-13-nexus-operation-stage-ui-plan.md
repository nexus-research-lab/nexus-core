# Nexus 智能体操作流可视化方案

## 1. 目标

基于 `2026-05-13-agent-operation-stage-ui.md` 和 `agent-chat-ui-concepts.html` 的概念，做一版适配 Nexus 当前产品风格和技术链路的方案。

核心目标不是做一个更炫的工具日志，而是让用户在对话之外能看懂智能体正在做什么、做到哪一步、证据在哪里、是否需要用户介入。

更准确地说，Nexus Operation Stage 应该是一个 **Agent Computer**：用户看到的不是工具调用卡片，而是一台由智能体操作的轻量电脑。工具事件只是输入，最终展示的是“打开文件管理器、打开文档、编辑代码、运行终端、浏览网页、收起窗口、留下证据”的连续工作状态。

因此第一版实现不能只围绕 `Edit/Bash/Web` 做几张卡片。它必须先建立稳定的桌面/窗口/应用抽象，再把工具映射到这些抽象上。

本方案的边界：

- 聊天区仍然是沟通、审批、最终答案的真相源。
- 操作流可视化只负责执行可见性，不承载权限决策。
- 普通用户看到的是克制的操作舞台，不是 raw event log。
- 调试用户可以进入 debug 模式查看原始事件、映射结果和性能计数。

## 1.1 当前实现偏差

当前代码已经完成了前端投影和基础接入，但它仍然是一个 prototype-grade stage：

- `OperationStagePanel` 同时承担容器、窗口、scene、文档预览和 debug，后续继续补会失控。
- `surface -> scene` 过早绑定，导致 `Read/Edit/Write` 很容易都看起来像 editor diff。
- 窗口只是装饰容器，没有明确的打开、聚焦、最小化、关闭、收口生命周期。
- 文档、Markdown、Word、表格、图片、PDF、网页、终端、任务这些 app 能力还没有被作为一等抽象。
- 缺少“当前桌面状态”的模型，所以多窗口只能靠绝对定位临时拼。

下一步应把现有实现视为数据投影雏形，重做 UI 层骨架，而不是继续追加视觉细节。

## 2. 对两个输入方案的判断

### 2.1 概念稿可保留的部分

概念稿最有价值的是三点：

- 把工具调用从日志抽象成“场景”：打开目标、聚焦对象、执行动作、展示结果、收口总结。
- 明确聊天和执行可视化的责任边界：审批和最终回复在 chat，执行细节在 stage。
- 引入标准化 `OperationEvent`，避免 UI 直接解析原始 tool payload。

这些方向适合 Nexus。

### 2.2 demo 可保留的部分

HTML demo 表达出了正确的体验方向：

- 文件、网页、技能、终端、总结这些操作有不同视觉语义。
- 用户能看到“智能体像在操作一个工作台”。
- 每个动作都能被压缩成短 scene，而不是无限展开。

demo 的“cinematic replay”是需要保留的核心：右侧要像智能体正在操作一台电脑，而不是把工具结果放进普通面板。Nexus 适配不改变开窗、聚焦、执行、收口这个体验本质，只调整色彩、信息密度、状态语言和 debug 可见性。

### 2.3 Nexus 需要调整的点

Nexus 版本继续使用 `Operation Stage`：

- 它是 room/dm 工作区右侧的执行舞台，不是聊天里的工具日志。
- 默认仍是舞台式 canvas，可以使用深色背景和窗口编排，但外层 header、状态 chip、圆角、密度要贴近 Nexus。
- 动效服务于“打开目标、聚焦对象、执行动作、展示结果、关闭/收口”，不做永久装饰动画。
- 普通态只保留舞台本体和顶部当前动作；工具抽象、证据和性能计数进入显式 Debug。

## 3. 产品形态

### 3.1 桌面布局

在 Room / DM 的主会话里，保留当前结构：

- 左侧或主区域：聊天 feed，常驻挂载。
- 右侧辅助区域：现有 workspace / history / about 之外新增 `operation` stage。
- 当智能体运行中时，如果用户没有手动打开 workspace，右侧可以自动显示 Operation Stage；用户切走后不强制抢焦点，只保留轻状态入口。

Operation Stage 分四块：

1. 顶部状态条：当前 agent、round、当前动作、耗时、是否等待权限。
2. 舞台画布：只渲染当前最重要的一项工具动作，表现为拟真的窗口/终端/浏览器/文档阅读器。
3. Debug 映射：显式开启后显示 OperationKind、Surface、证据、截断和性能计数。
4. 终态总结：本轮打开了什么、改了什么、验证了什么、失败了什么。

### 3.2 移动端布局

移动端不做左右双栏。Operation Stage 收进会话 header 的一个状态入口：

- 运行中显示一行当前动作。
- 点开进入全屏/底部 sheet。
- sheet 内只显示当前动作和最近摘要，不保留桌面多窗口编排。

### 3.3 Room 多智能体

Room 下必须按 `round_id + agent_id` 组织操作流：

- group chat 默认展示当前活跃 agent 的操作摘要。
- 打开某个 thread detail 时，Operation Stage 聚焦该 agent 的执行过程。
- 多个 agent 并行时，不做多舞台并排；用 agent 列表显示运行态，用户选择一个 agent 查看详情。

## 4. 抽象模型

### 4.1 两层抽象

不要直接让 scene 组件识别 `Bash`、`Read`、`Skill` 等工具名。Nexus 应该分两层：

1. `OperationKind`：语义动作，描述智能体做了什么。
2. `OperationSurface`：展示表面，决定用哪个 UI 渲染。

```ts
type OperationKind =
  | "workspace_inspect"
  | "workspace_read"
  | "workspace_search"
  | "workspace_edit"
  | "command_run"
  | "command_stop"
  | "web_research"
  | "context_read"
  | "task_delegate"
  | "task_progress"
  | "plan_update"
  | "human_gate"
  | "artifact_update"
  | "round_summary"
  | "unknown";

type OperationSurface =
  | "workspace"
  | "editor"
  | "terminal"
  | "web"
  | "knowledge"
  | "task"
  | "conversation"
  | "summary"
  | "fallback";

type OperationPhase =
  | "queued"
  | "running"
  | "waiting"
  | "done"
  | "error"
  | "cancelled";

type NexusOperationEvent = {
  id: string;
  session_key: string;
  round_id: string;
  agent_id: string;
  message_id?: string | null;
  tool_use_id?: string | null;
  tool_name?: string | null;
  kind: OperationKind;
  surface: OperationSurface;
  phase: OperationPhase;
  title: string;
  target?: string | null;
  summary?: string | null;
  input_preview?: Record<string, unknown> | null;
  result_preview?: unknown;
  evidence?: OperationEvidence[];
  started_at?: number;
  updated_at: number;
  ended_at?: number | null;
};

type OperationEvidence = {
  type: "file" | "diff" | "terminal" | "url" | "skill" | "task" | "permission" | "artifact" | "error";
  label: string;
  value?: string | null;
  preview?: unknown;
};
```

### 4.2 当前工具来源

当前 Nexus 工具不是凭空假设，来源有三层代码证据：

- `web/src/features/agents/options/agent-options-constants.ts` 的 `AVAILABLE_AGENT_TOOLS` 是 agent 配置里可选工具的当前清单。
- `web/src/features/conversation/shared/message/blocks/tool-block.tsx` 的 `TOOL_TITLE_MAP` 是现有聊天工具块已经识别并展示的工具名。
- `web/src/types/conversation/message.ts` 与 `web/src/types/app/workspace-live.ts` 定义了前端可拿到的 `tool_use`、`tool_result`、`task_progress`、`workspace_event`、`permission_request`、`round_status` 等投影输入。

因此第一版应覆盖 `AVAILABLE_AGENT_TOOLS` 里的 18 个工具，并兼容现有聊天块里的 `MultiEdit` 标题映射，避免未来 runtime 返回该工具时降级体验突兀。

### 4.3 当前工具覆盖矩阵

当前 Nexus 前端已声明的工具可以完全被上面的语义层覆盖：

| 工具 | OperationKind | Surface | 普通模式展示 |
| --- | --- | --- | --- |
| `Read` | `workspace_read` | `workspace` / `editor` | 文件路径、只读预览、读取完成 |
| `LS` | `workspace_inspect` | `workspace` | 目录路径、条目摘要 |
| `Glob` | `workspace_inspect` | `workspace` | 匹配模式、命中数量、主要路径 |
| `Grep` | `workspace_search` | `workspace` | 搜索词、命中摘要、可跳转文件 |
| `Edit` | `workspace_edit` | `editor` | 目标文件、diff 摘要、变更行数 |
| `Write` | `workspace_edit` | `editor` | 新建/覆盖路径、预览、变更统计 |
| `NotebookEdit` | `workspace_edit` | `editor` | notebook 路径、cell 摘要 |
| `MultiEdit` | `workspace_edit` | `editor` | 多段 diff 摘要、变更文件和 hunk 统计 |
| `Bash` | `command_run` | `terminal` | 命令、cwd、输出尾部、退出状态 |
| `KillShell` | `command_stop` | `terminal` | 被终止进程/命令、终止状态 |
| `WebSearch` | `web_research` | `web` | query、来源列表、选中来源 |
| `WebFetch` | `web_research` | `web` | URL、抓取摘要、引用片段 |
| `Skill` | `context_read` | `knowledge` | skill 名称、读取片段、约束摘要 |
| `Task` | `task_delegate` | `task` | 子任务目标、状态、最近工具 |
| `TaskOutput` | `task_progress` | `task` | 子任务输出摘要 |
| `TodoWrite` | `plan_update` | `conversation` / `summary` | 计划更新摘要，不展开成重场景 |
| `EnterPlanMode` | `plan_update` | `conversation` | 进入规划状态 |
| `ExitPlanMode` | `plan_update` | `conversation` | 退出规划状态 |
| `AskUserQuestion` | `human_gate` | `conversation` | 在 chat 显示问题，stage 只显示等待 |

“完全覆盖”应理解为语义覆盖，而不是每个工具都有单独的拟真窗口。未来 MCP / connector / automation 工具也应先落到这些 kind；识别不了的工具走 `unknown + fallback`，显示工具名、目标、输入摘要、结果摘要，不允许让界面崩掉。

### 4.4 覆盖边界

能完全覆盖：

- 当前 Claude Code 风格工具。
- Nexus 自有 workspace live event。
- 权限请求和用户问答的等待态。
- 子任务、计划、技能、网页、命令、文件读写。
- 未知 MCP / connector 工具的基础可见性。

不能在第一版完全做到拟真细节：

- 如果 `Bash` 只在最终 `tool_result` 返回输出，不能伪造逐行实时终端；第一版只能显示 running 状态和最终尾部输出。
- 如果 `WebFetch` 没有来源标题和摘录，只能显示 URL 与结果摘要。
- 如果文件编辑没有 diff，只能根据 `workspace_event` 或 tool result 展示路径和变更统计。
- 如果浏览器类工具未来返回截图，需要专门的 browser scene 才能高质量展示。

因此第一版要保证“所有工具可解释”，不要承诺“所有工具都像真实 app 一样重放”。

## 5. 数据来源与投影

### 5.1 当前可用来源

当前实现里可以从这些地方投影操作流：

- `message` / `stream` 里的 assistant content block：`tool_use`、`tool_result`、`task_progress`。
- `workspace_event`：文件写入开始、增量、结束、删除，并带 `tool_use_id`。
- `permission_request` / `permission_request_resolved`：权限等待态。
- `round_status` / `stream_start` / `stream_end` / `stream_cancelled`：生命周期收口。
- `assistant.result_summary`：最终耗时、状态、usage、错误摘要。

### 5.2 Projector 位置

第一版建议先放在前端：

```text
web/src/features/conversation/operation/
  operation-projector.ts
  operation-types.ts
  operation-redaction.ts
  operation-preview-budget.ts
```

原因：

- 当前需要组合 message block、pending permission、workspace live store，前端已经拿到这些数据。
- 不改变现有后端协议，风险较低。
- 可以先用单元测试锁住工具映射和脱敏规则。

稳定后再考虑把标准事件上提到 `internal/protocol`，新增专门的 `operation_event`，或者扩展当前 `agent_runtime_event`。上提前不要让后端提前固化过细 UI 语义。

### 5.3 投影规则

Projector 做这些事：

- 按 `round_id + agent_id + tool_use_id` 合并工具开始、结果、权限、workspace live event。
- 工具名映射成 `OperationKind` 和 `OperationSurface`。
- 提取 `path`、`file_path`、`command`、`query`、`url`、`task`、`prompt` 等主目标。
- 对输入和结果做脱敏、截断、结构化摘要。
- 用 `workspace_event.tool_use_id` 给编辑工具补 diff / 写入状态。
- 对 unknown 工具保留最小可读信息。

## 6. UI 体验规则

### 6.0 核心产品模型：Agent Computer

Operation Stage 的普通态由四层组成：

1. `OperationProjector`：把 message、tool result、permission、workspace live event 投影成稳定操作事件。
2. `ScenePlanner`：把操作事件规划成桌面状态，而不是直接选择一个 React scene。
3. `WindowRuntime`：维护窗口生命周期、层级、焦点、最小化、关闭、收口。
4. `AppRendererRegistry`：根据窗口 app 类型渲染文件管理器、文档、代码、终端、浏览器、任务面板等真实内容。

数据流：

```text
runtime/message/workspace events
  -> OperationProjector
  -> ScenePlanner
  -> OperationDesktopState
  -> WindowRuntime
  -> AppRendererRegistry
  -> StageCanvas
```

`OperationDesktopState` 应该接近下面的结构：

```ts
type StageWindowKind =
  | "finder"
  | "code_editor"
  | "markdown_reader"
  | "word_reader"
  | "pdf_reader"
  | "spreadsheet"
  | "image_viewer"
  | "browser"
  | "terminal"
  | "task_board"
  | "evidence"
  | "summary"
  | "permission_wait"
  | "generic_tool";

type StageWindowState = {
  id: string;
  kind: StageWindowKind;
  title: string;
  subtitle?: string;
  target?: string;
  phase: "opening" | "focused" | "background" | "minimized" | "closing" | "closed" | "error";
  z: number;
  layout: "primary" | "secondary" | "inspector" | "terminal" | "compact" | "artifact";
  payload: unknown;
};

type OperationDesktopState = {
  activeWindowId: string | null;
  windows: StageWindowState[];
  minimized: StageWindowState[];
  artifacts: StageWindowState[];
  phase: OperationPhase;
};
```

这个模型的关键点是：工具名不直接决定画面。工具名先变成操作事件，操作事件再规划成“桌面上应该打开哪些窗口”。例如 `Read README.md` 不是 `workspace scene`，而是：

- 打开 `finder`，高亮 `README.md`。
- 打开 `markdown_reader`，渲染 Markdown 正文。
- 动作完成后 finder 可以退到 background，reader 保持 focused。

`Write report.docx` 也不是 editor diff，而是：

- 打开 `finder`。
- 打开 `word_reader` 或 `generic document writer`。
- 打开 `evidence`/`changes` 小窗显示写入结果。
- 完成后留下 artifact 窗口。

### 6.1 普通模式

普通模式只显示三类信息：

- 当前正在做什么。
- 这个动作针对什么目标。
- 结果或证据是什么。

不要显示：

- raw JSON payload。
- 永久在线的步骤编号条。
- 大段全量 terminal / file / web dump。
- 多个浮动窗口同时抢焦点。

普通态允许同时存在多个窗口，但只能有一个主焦点。其它窗口必须是清晰的背景/检查器/结果窗口，不能同时以同等权重抢视觉焦点。

### 6.1.1 必备窗口应用

第一版必须支持这些 app renderer：

| App renderer | 触发来源 | 视觉目标 | 最低内容要求 |
| --- | --- | --- | --- |
| `FinderWindow` | `LS`、`Glob`、`Grep`、`Read`、workspace live | 文件树/目录窗口 | 路径、文件名、状态、高亮目标 |
| `CodeEditorWindow` | 代码类 `Read/Edit/Write/MultiEdit` | 代码编辑器 | 行号、代码片段、变更统计 |
| `MarkdownReaderWindow` | `.md/.mdx` | Markdown 阅读器 | 标题、段落、列表、代码块简化渲染 |
| `DocumentWindow` | `.doc/.docx/.rtf/.pdf` | 文档页 | 白纸页、标题、段落、页感 |
| `SpreadsheetWindow` | `.csv/.tsv/.xls/.xlsx` | 表格 | 4-6 列网格、表头、截断单元格 |
| `ImageWindow` | 图片路径或 artifact | 图片预览 | 图片占位/真实缩略图、文件名 |
| `BrowserWindow` | `WebSearch/WebFetch` | 浏览器 | 地址栏、结果卡、来源预览 |
| `TerminalWindow` | `Bash/KillShell` | 终端 | 命令、cwd、输出尾部、退出/运行状态 |
| `TaskBoardWindow` | `Task/TaskOutput` | 子任务看板 | task、phase、最近工具、输出摘要 |
| `EvidenceWindow` | permission、diff、summary | 证据检查器 | 目标、摘要、状态、错误 |
| `SummaryWindow` | result summary | 收口面板 | 打开过什么、产出什么、失败什么 |
| `GenericToolWindow` | unknown 工具 | 兜底窗口 | 工具名、目标、脱敏输入/输出摘要 |

这些 renderer 是产品能力，不是装饰。它们决定用户是否相信“智能体真的在操作电脑”。

### 6.1.2 窗口生命周期

每个窗口必须支持明确状态：

- `opening`：窗口出现，标题/目标可见。
- `focused`：当前动作目标，只有一个。
- `background`：仍可见但弱化。
- `minimized`：收进舞台边缘的 compact artifact，不是底部 dock。
- `closing`：动作收口后淡出。
- `closed`：从普通态移除，只在 summary/debug 可见。
- `error`：窗口保留，显示失败摘要和证据。

普通用户不需要手动操作这些窗口，但视觉上必须看得出智能体在打开、切换、最小化和关闭。

### 6.1.3 ScenePlanner 示例

| 操作 | 桌面规划 |
| --- | --- |
| `LS /repo/src` | `FinderWindow focused` |
| `Read README.md` | `FinderWindow background` + `MarkdownReaderWindow focused` |
| `Read spec.docx` | `FinderWindow background` + `DocumentWindow focused` |
| `Read data.csv` | `FinderWindow background` + `SpreadsheetWindow focused` |
| `Edit app.tsx` | `FinderWindow background` + `CodeEditorWindow focused` + `EvidenceWindow inspector` |
| `Write report.md` | `MarkdownReaderWindow focused` + `EvidenceWindow inspector` |
| `Bash pnpm test` | `TerminalWindow focused` + `EvidenceWindow compact` |
| `WebSearch query` | `BrowserWindow focused` + `MarkdownReaderWindow notes` |
| `Task` | `TaskBoardWindow focused` + `TerminalWindow compact` |
| round done | close active windows into `SummaryWindow focused` with artifacts |

### 6.2 Debug 模式

Debug 模式给研发使用，可以显示：

- 原始 `EventMessage`。
- `tool_use` / `tool_result` payload。
- projector 映射结果。
- coalescing 前后事件数量。
- render cost、scene mount 数、preview 截断信息。

Debug 模式必须显式开启，不进入普通用户默认体验。

### 6.3 权限与用户输入

权限卡和 `AskUserQuestion` 仍在 chat 里交互。

Operation Stage 只显示：

- “等待用户确认”
- tool 名称
- 风险摘要
- 等待时长

它不能提供 Allow / Deny 按钮，避免和当前 controller / observer 权限规则冲突。

### 6.4 错误体验

错误状态不要只显示红色。需要同时展示：

- 哪个动作失败。
- 失败阶段。
- 简短错误原因。
- 用户可继续看的证据，例如命令尾部输出或错误摘要。

如果 round 被中断，Operation Stage 收口为 `cancelled`，不伪装成失败。

## 7. 视觉风格

Nexus 版本遵循 `frontend-design-spec.md`，但这里的“舞台”是产品核心，不应被降级成普通右侧面板：

- `/app` 外层仍使用 rail / plane / card 的结构语言，Operation Stage 是右侧 plane 内的舞台画布。
- 舞台可以使用暗色 canvas 和窗口层叠，但底部 dock、常驻编号条、常驻工具抽象卡不进入普通态。
- 顶部状态、chip、窗口圆角、文字密度使用 Nexus 语气，不直接照搬原 demo 的强表演感。
- 动效最多三类：窗口入场/退场、目标高亮、场景切换。
- 文件树、编辑器、终端、网页摘要都应该像真实工具窗口，而不是宣传页模块。

建议组件：

```text
operation/
  model/
    operation-types.ts
    operation-projector.ts
    operation-desktop-types.ts
    operation-scene-planner.ts
    operation-preview-budget.ts
    operation-redaction.ts
  stage/
    operation-stage-panel.tsx
    operation-stage-canvas.tsx
    operation-window-runtime.tsx
    operation-stage-window.tsx
    operation-debug-panel.tsx
  apps/
    finder-window.tsx
    code-editor-window.tsx
    markdown-reader-window.tsx
    document-window.tsx
    spreadsheet-window.tsx
    image-window.tsx
    browser-window.tsx
    terminal-window.tsx
    task-board-window.tsx
    evidence-window.tsx
    summary-window.tsx
    generic-tool-window.tsx
```

第一版不追求组件数量最少。它应该围绕 app renderer 拆清楚，避免把所有窗口都塞进一个 `operation-stage-panel.tsx`。工具数量可以增长，但 app renderer 数量应该稳定。

不要做一个工具一个组件；要做一个“窗口应用”一个组件。

## 8. 性能要求

### 8.1 更新频率

- projector 对高频事件做 50-150ms coalescing。
- stage 不跟随每个 token 更新；文本流仍由 chat feed 负责。
- `workspace_event.file_write_delta` 合并后再刷新 UI。
- terminal 输出最多 10-20 FPS 视觉刷新。

### 8.2 DOM 与渲染预算

- 普通模式只 mount 当前 scene、过渡所需上一 scene 和必要 header。
- 不把整轮工具历史全部展开成 DOM。
- 当前舞台区域正常态控制在 500 个 DOM 节点以内。
- 历史证据默认不常驻在舞台底部；进入 Debug 或终态总结查看。
- rare scene 懒加载，例如 browser screenshot、复杂 diff、debug panel。

### 8.3 预览预算

- 文件预览：默认 200 行或 50KB，先到为准。
- diff 预览：默认 80 个 changed hunks 或 30KB。
- terminal：保留 ring buffer，默认 500 行，普通模式展示最后 80 行。
- web：默认 5 个来源，每个来源 300 字以内。
- JSON：默认深度 4，超过后显示摘要和可展开 debug 入口。

### 8.4 动效预算

- 使用 `transform` 和 `opacity`。
- 不使用会持续触发布局的宽高动画。
- 尊重 `prefers-reduced-motion`。
- 不在 stage 上做永久扫描线、粒子、重背景动画。

## 9. 安全与隐私

Projector 必须先脱敏再进入 UI：

- API key、token、password、cookie、authorization header 必须隐藏。
- `.env`、凭证文件、auth json 默认只显示文件名和“已隐藏敏感内容”。
- 命令参数中出现密钥形态要替换成 `[REDACTED]`。
- web 抓取结果只展示摘录，不展示无限原文。
- debug 模式也默认脱敏，只有明确开发开关才能看 raw payload。

## 10. 第一版落地范围

第一版建议做到：

- 前端 `operation-projector`。
- 覆盖当前 `AVAILABLE_AGENT_TOOLS` 的 18 个工具，并兼容现有工具块的 `MultiEdit` 标题映射。
- 右侧 `operation` stage，并在 stage 模式下把聊天收成左侧 rail。
- `ScenePlanner`：从 active operation 生成 `OperationDesktopState`。
- `WindowRuntime`：窗口打开、聚焦、background、minimized、closing、closed 的视觉状态。
- 当前动作桌面：finder / code editor / markdown reader / document reader / spreadsheet / browser / terminal / task board / evidence / fallback / summary。
- workspace live event 与编辑工具联动。
- 权限等待态只读展示。
- projector 单元测试：工具映射、unknown fallback、脱敏、preview budget。
- scene planner 单元测试：常见工具到窗口组合的映射。

暂不做：

- 多舞台并排和全历史 round 重放。
- 后端新增正式 `operation_event` 协议。
- browser screenshot scene。
- 完整 git 专用 scene，除非底层工具能稳定提供 git diff/status 结构。
- 对所有历史 round 回放操作流；第一版优先当前运行中的 round。

## 10.1 实施计划

### P0：止损和结构整理

目标：停止继续在单文件里堆视觉分支。

- 保留已有 `operation-projector` 和 store。
- 新增 `operation-desktop-types.ts`。
- 新增 `operation-scene-planner.ts`，先返回静态窗口布局。
- 把 `OperationStagePanel` 收敛为数据读取和 shell，不再直接写所有场景。

完成标准：

- `OperationStagePanel` 不超过 250 行。
- 每个 app renderer 独立文件。
- 所有窗口从 `OperationDesktopState.windows` 渲染。

### P1：核心窗口系统

目标：让舞台像智能体电脑，而不是工具卡片。

- 实现 `OperationStageCanvas`。
- 实现 `OperationStageWindow` 和轻量 `WindowChrome`。
- 支持 `focused/background/minimized/error` 样式。
- 支持 stage 模式无外层标题栏。
- 支持移动端降级为单窗口全屏。

完成标准：

- 同一个 operation 能生成 1-4 个窗口。
- 主窗口和辅助窗口权重清晰。
- 关闭/最小化/缩放是视觉生命周期，不是用户操作入口。

### P2：文件和文档应用

目标：覆盖用户最敏感的“打开文件/Word/Markdown/表格/图片”体验。

- `FinderWindow`
- `CodeEditorWindow`
- `MarkdownReaderWindow`
- `DocumentWindow`
- `SpreadsheetWindow`
- `ImageWindow`
- `GenericToolWindow`

完成标准：

- `.md` 不显示成代码。
- `.docx/.pdf` 显示成文档页。
- `.csv/.xlsx` 显示成表格。
- 代码类文件显示行号、代码片段、diff 统计。
- unknown 文件不会崩，走 generic preview。

### P3：运行和研究应用

目标：覆盖智能体最常见的外部操作。

- `TerminalWindow`
- `BrowserWindow`
- `TaskBoardWindow`
- `EvidenceWindow`
- `SummaryWindow`

完成标准：

- Bash 显示命令、输出尾部、运行/失败/完成状态。
- WebSearch/WebFetch 显示地址栏、来源、摘录、研究笔记。
- Task 显示子任务状态和最近输出。
- Summary 负责收口，不让完成态停留在随机工具窗口。

### P4：性能和验证

目标：确保它能作为核心显示功能长期打开。

- Projector 限制最近消息和事件数量。
- Preview budget 单独封装。
- Debug panel 显示截断、事件数量、窗口数量。
- 加 scene planner 测试。
- 用真实 room 跑 `Read/Edit/Bash/WebSearch/Task/Permission` 烟测。

完成标准：

- typecheck/lint/build 通过。
- 长会话不会每次扫全量历史。
- 普通态窗口 DOM 控制在预算内。
- 用户不展开工具块也能理解当前执行。

## 11. 后续演进

第二阶段可以考虑：

- 把稳定后的 operation event schema 上提到 `internal/protocol` 并生成 TS 类型。
- 后端在 runtime mapper 中补充更稳定的 `tool_start/tool_progress/tool_end`。
- 为 git、browser、artifact 增加专用 surface。
- 支持历史 round 的压缩回放。
- 在 Room 多 agent 并行时增加 per-agent operation queue。

## 12. 验收标准

方案成功的标准：

- 用户不展开 raw 工具块也能知道智能体正在做什么。
- chat 仍然承担沟通、审批、最终答案。
- 当前 Nexus 工具都能被映射，不存在无法展示导致 UI 崩溃的工具。
- 大输出不会拖慢聊天流和 room 页面。
- 权限等待不会和 controller / observer 规则冲突。
- Operation Stage 保留舞台式开窗、聚焦、执行、收口体验，同时看起来属于 Nexus，而不是另一个 demo 产品。

不可接受的完成标准：

- 只有 edit diff 看起来完整，其它工具只是文字摘要。
- 所有文件都用代码窗口展示。
- `Read .md`、`Read .docx`、`Read .csv` 的视觉没有明显区别。
- 没有窗口打开、聚焦、最小化、关闭的生命周期表达。
- 舞台像右侧信息栏，而不是智能体电脑。
- Debug 信息进入普通态，导致核心舞台杂乱。
- 只通过 typecheck/build，没有真实 room 页面视觉烟测。

必须验收的真实场景：

1. `Read README.md`：Finder 打开，Markdown reader 聚焦。
2. `Read report.docx`：Finder 打开，Document reader 聚焦。
3. `Read data.csv`：Spreadsheet window 聚焦。
4. `Edit app.tsx`：Code editor 聚焦，Evidence/diff inspector 辅助。
5. `Bash pnpm test`：Terminal 聚焦，输出尾部可读。
6. `WebSearch operation stage`：Browser 聚焦，来源和 notes 分窗。
7. `Task`：Task board 聚焦，子任务输出可读。
8. 权限等待：Chat 负责按钮，Stage 只显示 waiting computer state。
9. Round done：窗口收起，Summary window 展示 artifact 和结果。

只有这些场景都能看出“智能体正在操作一台电脑”，第一版才算真正可用。
