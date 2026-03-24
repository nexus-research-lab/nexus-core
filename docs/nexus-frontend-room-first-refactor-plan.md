# Nexus 前端 Room-First 重构方案

## 1. 背景

当前前端已经从 Next.js 迁移为 `Vite + React + React Router`，但信息架构仍然保留了较强的“单页状态切换”思路：

- 只有一个 `/` 路由；
- 页面切换主要依赖 `HomePage` 内部状态分支；
- `Agent`、`Room`、`Session`、`Conversation` 的概念未完全对齐；
- `Ask App` 仍被设计为输入框中的一种模式，而不是独立的系统级入口；
- `components/home/*`、`components/chat/*`、`components/workspace/*` 主要按视觉区块拆分，而不是按产品对象和页面职责拆分。

这导致两个问题：

1. **产品语义错位**：当前实现更接近“选中某个 Agent 后进入工作台”，而产品定义要求是“进入某个 Room，在 Room 中围绕成员协作”。
2. **工程结构失真**：路由、目录、状态模型仍以早期原型为中心，难以支撑后续 `nexus / room / contacts / conversation` 的独立演进。

本方案用于指导前端完成一次 **Room-First** 的长期重构。

---

## 2. 目标原则

### 2.1 产品目标

前端必须对齐以下产品模型：

- `launcher`：启动协作，不承载复杂系统管理；
- `room`：协作单元，是主要工作页面；
- `conversation`：`room` 内的对话线程；
- `nexus`：系统级组织与编排入口，对应当前 `Ask App`；
- `contacts`：联系人与 Agent 网络；
- `agent`：成员，而不是页面主入口。

### 2.2 工程目标

前端必须具备以下能力：

- 页面可寻址，可直接打开具体 `room / conversation / nexus conversation`；
- 浏览器前进后退可用；
- 页面语义与目录语义一致；
- 路由层与状态层分离；
- 页面容器、业务功能块、共享能力各自有清晰边界。

---

## 3. 术语对齐

### 3.1 最终术语

| 产品概念 | 前端术语 | 说明 |
| --- | --- | --- |
| 首页启动器 | `launcher` | 首页，负责快速启动协作 |
| 系统级编排入口 | `nexus` | 原 `Ask App`，独立页面与独立对话流 |
| 协作空间 | `room` | 用户与成员协作发生的地方 |
| 对话线程 | `conversation` | `room` 内的具体会话流 |
| 数字成员 | `agent` | 可加入 `room` 的成员 |
| 联系人网络 | `contacts` | 浏览、筛选、发起 1v1、邀请入 room |

### 3.2 当前错位映射

| 当前概念 | 问题 | 目标调整 |
| --- | --- | --- |
| `currentAgent` 驱动页面切换 | 错把成员当页面锚点 | 改为 `currentRoomId / currentConversationId` 驱动 |
| `session` 既像 room 又像 conversation | 概念混用 | 逐步收敛为 `conversation` |
| `Ask App` 是输入框模式 | 页面职责不清 | 独立为 `nexus` 页面 |
| 左侧 `Rooms` + 输入框 `Room` mode | 同页概念重复 | `room` 页左侧应展示 `conversations` |

---

## 4. 页面职责

### 4.1 `launcher`

职责：

- 搜索 `Agent`；
- 搜索 `Room`；
- 启动 1v1；
- 继续已有 `room`；
- 创建新的 `room`；
- 提示切换到 `nexus` 处理系统级组织动作。

不负责：

- 展示复杂运行参数；
- 承载深度协作对话；
- 作为 `nexus` 的长期聊天页。

### 4.2 `nexus`

职责：

- 系统级组织和编排；
- 创建 `agent`；
- 创建 `room`；
- 邀请成员；
- 查询网络状态；
- 承接长期 `nexus conversation`。

不负责：

- 替代某个具体专业成员完成业务对话；
- 混在 `room` 页面中作为输入框模式存在。

### 4.3 `room`

职责：

- 展示当前 `room`；
- 管理 `members`；
- 展示 `conversations`；
- 承载当前协作流；
- 展示推进状态与上下文。

说明：

- 1v1 和多人协作都属于 `room`；
- 二者共享页面骨架，但右侧信息和成员展示策略可不同。

### 4.4 `contacts`

职责：

- 浏览全部成员；
- 查看成员身份与技能；
- 发起 1v1；
- 邀请入 `room`。

---

## 5. 路由方案

### 5.1 目标路由

```txt
/                                   launcher
/nexus                              nexus 入口
/nexus/conversations/:conversationId
/rooms/:roomId
/rooms/:roomId/conversations/:conversationId
/contacts
/contacts/:agentId
```

### 5.2 路由设计原则

- `launcher` 保持轻；
- `nexus` 和 `room` 必须可直接打开；
- `conversation` 应成为 URL 可表达对象；
- 页面不能继续依赖 `HomePage` 内部状态分支来切换主视图。

### 5.3 第一阶段兼容策略

重构初期允许以下兼容形态：

- 先引入新路由骨架；
- 页面内部仍可复用现有组件；
- 路由与旧状态并存一小段时间；
- 最终以路由为主、状态为辅。

---

## 6. 目录结构

### 6.1 目标目录

```txt
src/
  app/
    router/
  pages/
    launcher/
    room/
    nexus/
    contacts/
  features/
    launcher-search/
    room-conversation/
    room-members/
    room-context/
    nexus-chat/
    contacts-list/
  types/
  shared/
    ui/
    hooks/
    lib/
    api/
  store/
```

### 6.2 各层职责

#### `app`

- 应用装配；
- 路由注册；
- 后续如有必要，再补 `providers`。

#### `pages`

- 页面级容器；
- 只做页面编排，不承载复杂局部业务。

#### `features`

- 按产品能力拆分业务功能块；
- 例如 `room-members`、`nexus-chat`、`launcher-search`。

#### `types`

- 统一放类型定义；
- 后续逐步把 `agent / room / conversation / message` 的类型集中整理。

#### `shared`

- 真正的共享能力；
- 包含通用 UI、API 封装、hooks、lib 工具。

#### `store`

- Zustand 等跨页面状态；
- 未来应围绕路由与页面状态边界收缩，而不是继续承接页面切换职责。

---

## 7. 当前文件迁移方向

### 7.1 页面层

| 当前文件 | 目标归属 |
| --- | --- |
| `web/src/pages/home-page.tsx` | 拆分为 `pages/launcher`、`pages/room`、`pages/nexus`、`pages/contacts` |
| `web/src/routes/app-router.tsx` | 迁移到 `app/router` |

### 7.2 组件层

| 当前文件 | 目标归属 |
| --- | --- |
| `components/home/console.tsx` | `pages/launcher` + `features/launcher-search` |
| `components/home/agent-workspace.tsx` | `pages/room` 容器 |
| `components/chat/*` | `features/room-conversation` 或 `features/nexus-chat` |
| `components/workspace/workspace-sidebar.tsx` | 拆为 `room-conversation` / `room-members` / `room-context` |
| `components/workspace/agent-inspector.tsx` | 根据单人 / 多人场景拆到 `room-members` 或 `room-context` |
| `components/message/*` | `features/room-conversation` 与 `shared/ui` 分层 |

### 7.3 控制器与状态

| 当前文件 | 问题 | 目标方向 |
| --- | --- | --- |
| `hooks/use-home-page-controller.ts` | 单页总控过重 | 拆成页面级 controller |
| `hooks/use-home-workspace-controller.ts` | 仍以 workspace 视角建模 | 重构为 room 视角 |
| `store/session/*` | `session` 语义待澄清 | 逐步收敛为 `conversation` |

---

## 8. 页面表达策略

### 8.1 `launcher`

页面元素：

- 中心 launcher；
- 最近 `rooms`；
- 最近活跃成员；
- `Ask Nexus` 入口提示。

交互重点：

- 数秒内开始一次协作；
- 当用户输入系统组织意图时，引导进入 `nexus`。

### 8.2 `nexus`

页面元素：

- `nexus` 对话主区；
- 最近系统动作；
- 推荐组织动作；
- 可选的快捷模板。

交互重点：

- 接收自然语言系统指令；
- 不与 `room composer` 混用。

### 8.3 `room`

页面元素：

- `room header`；
- `conversations` 导航；
- `members` 列表；
- 当前协作流；
- 上下文与推进状态。

交互重点：

- 默认就是 room 对话输入；
- 通过 `@成员` 指派；
- 多个 `conversation` 之间可切换。

### 8.4 1v1 room 与多人 room 的差异

#### 1v1

- 页面可弱化成员区；
- 右侧强调当前成员状态与上下文。

#### 多人

- 页面应强化成员列表、分工、当前活跃成员；
- `conversation` 与 `task progress` 的关系更重要。

---

## 9. 状态模型改造

### 9.1 当前问题

当前主切换依赖：

- `currentAgent`
- `currentSession`

这会把“选中成员”和“进入协作空间”混成一件事。

### 9.2 目标状态

应逐步引入以下页面级状态：

- `activeSurface`: `launcher | nexus | room | contacts`
- `currentRoomId`
- `currentConversationId`
- `currentAgentId` 仅作为成员选择，不作为主页面锚点

### 9.3 迁移原则

- 路由优先于全局状态；
- 全局状态只保存缓存与视图辅助信息；
- 页面主身份由 URL 决定。

---

## 10. 分阶段执行

### 阶段 1：蓝图与路由骨架

目标：

- 固定术语；
- 固定目录；
- 引入目标路由骨架；
- 不大改现有 UI。

交付：

- 本方案文档；
- 新路由结构；
- 页面骨架占位。

### 阶段 2：页面拆分

目标：

- 把当前 `HomePage` 拆成 `launcher / room / nexus / contacts`；
- 用路由替代单页状态分支。

交付：

- 页面容器拆分；
- 旧入口兼容跳转；
- 基础导航能力可用。

### 阶段 3：状态模型重构

目标：

- 从 `currentAgent` 驱动迁移到 `currentRoomId / currentConversationId`；
- `session` 向 `conversation` 收敛。

交付：

- 页面状态重构；
- 会话数据适配层；
- `room` 内 `conversation` 切换能力。

### 阶段 4：页面语义与交互重做

目标：

- 移除当前不正确的 `Agent / Room / Ask App` 输入切换；
- `room` 页面使用统一 `room composer`；
- `nexus` 页面使用独立 `nexus composer`。

交付：

- 页面元素与交互完全对齐产品模型；
- 1v1 和多人协作差异化表达。

### 阶段 5：视觉与性能收尾

目标：

- 统一玻璃语言；
- 收敛滤镜与重渲染；
- 做浏览器兼容和性能回归。

交付：

- 视觉统一；
- 性能优化；
- 回归验证记录。

---

## 11. 提交策略

本次长程任务不使用“大爆炸式重构”，而采用小步稳定提交：

1. 每个阶段拆成独立提交；
2. 路由、状态、页面、视觉不要混在一个提交里；
3. 每次提交必须保证：
   - `cd web && npx tsc --noEmit`
   - `cd web && npm run lint`
4. 如涉及用户可见流程变更，更新相应文档。

---

## 12. 验收标准

当以下条件全部成立时，本次前端重构视为完成：

- `launcher / nexus / room / contacts` 均有独立页面入口；
- `room` 与 `conversation` 的页面语义完全分离；
- `nexus` 不再作为输入框内模式存在；
- `room` 页面不再出现概念重复的 `Rooms / Room` 混用；
- 页面切换主要依赖路由，而非单页状态分支；
- 目录结构与产品对象一致；
- 视觉语言在不同页面间统一但不混用职责。

