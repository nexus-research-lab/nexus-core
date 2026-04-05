# Nexus UI 清理与收口计划

> 原则：不改逻辑、不改路由、不改接口，只做样式系统和高频界面的系统化收口。

---

## 1. 当前基线

| 指标 | 当前值 |
|------|--------|
| `.tsx` 文件 | 121 |
| `globals.css` 行数 | 15 |
| `app/styles/*` 总行数 | 1004 |
| Design Tokens 数量 | 371 |
| Component Recipes 数量 | 49 |

### 当前已落地

- `globals.css` 已经变成纯入口。
- `theme-tokens.css / theme-base.css / theme-recipes.css` 已拆出。
- `AppLayoutNoSidebar` 已删除。
- `AppSidebar` passthrough 已删除。
- `WorkspaceTaskStrip` 已拆分。
- 废弃 re-export 已删除。
- `sunny` 已本地化并回到 `light + overlay` 路径。

---

## 2. 这轮清理的目标

### Goal A：把三层边界彻底定死

- `Design Tokens` 只保留设计令牌
- `Base Styles` 只保留全局默认行为
- `Component Recipes` 只保留可复用外观

### Goal B：把高频共享组件收成正式入口

优先统一：

- `WorkspacePillButton`
- `WorkspaceSurfaceHeader`
- `WorkspaceConversationSwitcher`
- `WorkspaceTaskStrip`
- `WorkspaceStatusBadge`
- `SegmentedPill`

### Goal C：把高频页面接回系统层

优先页面：

1. Sidebar
2. Room / DM Header
3. Conversation 主工作区
4. Dialog
5. Launcher

---

## 3. 执行阶段

## Phase 0：文档和基线校准

### 目的

修掉文档和仓库事实的偏差，避免继续按旧状态清理。

### 动作

- 更新 `ui-architecture-audit.md`
- 更新 `ui-cleanup-plan.md`
- 统一正式术语：
  - `Design Tokens`
  - `Base Styles`
  - `Component Recipes`

### 验收

- 文档不再引用已删除路径
- 文档不再把已完成重构写成待做项

---

## Phase 1：Token 语义收口

### 目的

把 token 从“组件命名”收成“语义命名”。

### 目标分组

- `surface`
- `card`
- `chip`
- `input`
- `divider`
- `glow`
- `motion`
- `text`

### 规则

- `launcher-*` 保留为域内 token
- `modal-*` 保留为域内 token
- `sunny` 不新增颜色 token
- 旧 token 别名只允许保留一轮，用于高频页面切换期

### 验收

- 主系统 token 不再出现 `glass-*` / `switch-*` / `app-stage-*` 这类组件导向命名
- `motion` 和 `text` 有独立分组

---

## Phase 2：Base Styles 固边

### 目的

让 Base Styles 只承担真正的全局默认行为。

### 保留内容

- `html/body`
- 默认排版
- 滚动条
- 选择态
- 焦点
- `prefers-reduced-motion`
- 主题切换基础过渡

### 明确不放

- `glass-*`
- `modal-*`
- `app-stage`
- 任何业务页面专属 recipe

### 验收

- `theme-base.css` 中不出现具体组件视觉
- `sunny` 的 reduced motion 规则归 base 控制

---

## Phase 3：Component Recipes 正式化

### 目的

把现在散落在共享组件和 feature 里的视觉规则，收成少量正式 recipe。

### 正式 recipe 清单

- `surface shell`
- `surface panel`
- `surface card`
- `chip / pill`
- `input shell`
- `divider`
- `dialog shell`
- `stage backdrop`
- `header tabs`
- `status badge`
- `task strip`
- `conversation switcher`

### 验收

- 页面不再自己拼同类阴影、圆角、密度
- 共享组件通过稳定 props 驱动，而不是通过局部 class 改写

---

## Phase 4：高频页面统一

### 4.1 Sidebar

- 统一头部、分区标题、列表项、底部控制区密度
- 固定标题字号、meta 字号、激活态和 hover 态

### 4.2 Room / DM Header

- 标题、badge、conversation switcher、tab、任务条、状态胶囊统一节奏
- 不再各自保留一套按钮尺寸和状态样式

### 4.3 Conversation 主工作区

- composer
- 滚动到底按钮
- thread 入口
- context 面板

统一接入 `card / chip / input / divider` 体系

### 4.4 Dialog

- 创建房间
- 加成员
- 技能详情
- 连接器详情
- 计划任务

统一 shell、标题栏、底栏、输入框节奏

### 4.5 Launcher

- 保留当前品牌气质
- 输入壳、推荐项、切换器、操作按钮接回主系统密度
- `launcher-*` token 继续局部化

---

## 4. 不做的事

| 提案 | 原因 |
|------|------|
| snake_case 改 camelCase | 全项目约定已稳定，收益低 |
| 替换右键菜单为新依赖 | 超出“只动样式”边界 |
| 改路由 / store / hooks | 不在本轮范围 |
| 把 `sunny` 做成独立第三套配色 | 已明确不走这条路 |

---

## 5. 验证方式

### 静态检查

- `cd web && npx tsc --noEmit`
- `cd web && npm run lint`
- `cd web && npm run build`

### 视觉验收

- `light / dark / sunny` 检查：
  - Launcher
  - Room
  - DM
  - Skills
  - Connectors
  - Contacts
  - Scheduled Tasks

### 体验验收

- `sunny` 不压正文
- `prefers-reduced-motion` 下 sunny 停止持续运动
- `hover / active / selected / disabled / loading` 状态在 chip、tab、button、card 上表现一致
- 主链路行为不变

---

## 6. 当前优先级

| 优先级 | 项目 |
|--------|------|
| P1 | Token 语义收口 |
| P1 | 高频共享组件硬化 |
| P1 | Sidebar / Room / DM Header 统一 |
| P2 | Conversation 主工作区统一 |
| P2 | Dialog 统一 |
| P2 | Launcher 对齐主系统 |

结论：这轮不是继续“删文件”，而是把已经拆出来的系统层真正收成稳定设计系统。
