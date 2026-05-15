# Operation Stage 后端补齐计划

## 目标

Operation Stage 前端先负责把工具事件投影成“智能体电脑”的可视化桌面。后端下一阶段要补齐两个能力：

- 工作区文件可以被舞台安全预览和运行，尤其是 HTML artifact。
- WebSearch / WebFetch / 未来 browser 工具可以升级为真实浏览器会话，而不是只有结果摘要。

## 阶段一：Workspace Raw File Serving

先补文件预览，不引入浏览器 runtime。

### API

建议新增只读接口：

```text
GET /nexus/v1/agents/{agent_id}/workspace/file/raw?path=<workspace_path>
GET /nexus/v1/agents/{agent_id}/workspace/file/meta?path=<workspace_path>
GET /nexus/v1/operation/stage/snapshot?key=<stage_key>
PUT /nexus/v1/operation/stage/snapshot
```

要求：

- 只允许读取该 agent/session 授权的 workspace 根目录内文件。
- path 必须做 clean 和 root escape 防护，禁止 `..` 越界。
- 根据扩展名返回明确 Content-Type。
- HTML 默认加隔离响应头，禁止读取 Nexus 主应用上下文。
- 大文件默认限制，例如 5MB；超过只返回 meta 和错误码。
- raw 读取要支持 ETag / Last-Modified，前端 iframe 可以稳定刷新。

### Stage 行为

- `Write/Edit` 产出 `.html/.htm/.xhtml` 后，舞台 Browser 优先加载 raw file URL。
- 如果消息里有完整 `content`，仍可使用 `iframe srcDoc` 即时预览。
- 有相对资源时，iframe 走 raw file URL 才能正确加载 CSS/JS/image。

## 阶段二：Browser Session Runtime

再补真实浏览器，不直接依赖用户系统 Chrome。

### Runtime

建议使用 Playwright + bundled Chromium：

- 后端作为 sidecar/service 管理 browser context。
- 每个 agent session 分配独立 browser context。
- 运行态包括 current_url、title、screenshot、DOM 摘要、console errors。
- 关闭 session 或长时间空闲后回收 context。

不建议第一版直接嵌系统 Chrome：

- 权限和用户 profile 难隔离。
- cookie / extension / 本地隐私风险大。
- 跨平台部署不可控。

### API

```text
POST /nexus/v1/agent-browser/sessions
POST /nexus/v1/agent-browser/sessions/{id}/navigate
POST /nexus/v1/agent-browser/sessions/{id}/click
POST /nexus/v1/agent-browser/sessions/{id}/type
POST /nexus/v1/agent-browser/sessions/{id}/evaluate
GET  /nexus/v1/agent-browser/sessions/{id}/screenshot
GET  /nexus/v1/agent-browser/sessions/{id}/state
DELETE /nexus/v1/agent-browser/sessions/{id}
```

WebSocket/SSE 事件：

- `browser.session.created`
- `browser.navigation.started`
- `browser.navigation.finished`
- `browser.screenshot.updated`
- `browser.console.error`
- `browser.session.closed`

## 阶段三：工具投影接入

### WebSearch

短期：

- 仍使用现有搜索工具结果。
- 前端 Browser 窗口渲染 query、搜索结果、来源摘要。

中期：

- 后端 browser session 打开搜索页或搜索结果镜像页。
- Stage Browser 显示真实 current_url 和 screenshot。

### WebFetch

短期：

- Browser 窗口打开 URL。
- 文本提取结果作为右侧/下方摘要。

中期：

- Playwright 导航到 URL。
- 返回 screenshot + extracted text + link list。

### HTML Artifact

短期：

- raw file serving 支持 iframe 可交互运行。

中期：

- browser runtime 可打开 artifact URL，进行 screenshot、点击测试、console error 捕获。

## 性能要求

### 后端

- Browser session 默认懒启动，只有工具需要浏览器交互时才创建。
- 每个 session 限制并发 page 数，默认 1 个 active page。
- screenshot 限频，建议 2-4 fps，不按每个 DOM 变化推送。
- DOM 摘要和截图分离，前端需要时再取。
- workspace raw file 支持缓存头，避免 iframe 每次 stage render 都重新读取。

### 前端

- 只有当前 active window 渲染完整内容。
- 背景窗口只显示轻量摘要，不挂 iframe / markdown / 长终端。
- Operation snapshot 本地持久化要限制数量和 preview 长度。
- Tool result 和 workspace content 必须截断、脱敏后进入 stage store。

## 验收标准

- 写入一个单文件 HTML 五子棋后，舞台 Browser 可以打开并交互点击。
- HTML 引用相对 CSS/JS/image 时，iframe 能正确加载。
- WebFetch 一个 URL 后，舞台 Browser 显示网页窗口和提取摘要。
- Browser runtime 开启后，后台能记录 current_url、title、screenshot、console error。
- 切走页面再回来，同一个 session 的舞台状态可恢复。
- 前端在 24 个 operation event、8 个 workspace live item 下保持流畅，不因 iframe/markdown 背景窗口导致明显卡顿。
