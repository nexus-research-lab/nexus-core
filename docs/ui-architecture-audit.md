# Nexus UI 架构审计

> 目标：不改逻辑，只动样式和结构，把全局 UI/UX 收成长期可维护的系统。

---

## 1. 当前基线

### 1.1 目录现状

```
web/src/
├── app/
│   ├── globals.css                 # 15 行，纯样式入口
│   └── styles/
│       ├── theme-tokens.css        # Design Tokens
│       ├── theme-base.css          # Base Styles
│       └── theme-recipes.css       # Component Recipes
├── shared/
│   ├── theme/                      # ThemeContext + ThemeProvider
│   ├── i18n/                       # I18nProvider
│   └── ui/
│       ├── layout/                 # AppLayout / AppStage / AppStageBackdrop
│       ├── sidebar/                # SidebarWidePanel + panel-content
│       ├── workspace/              # Workspace 共享组件
│       ├── dialog/                 # Confirm / Permission / AgentOptions
│       ├── feedback/               # Loading / Lottie / Hero / Cursor
│       ├── theme/                  # ThemeSwitch
│       ├── i18n/                   # LanguageSwitch
│       └── segmented-pill.tsx
├── features/                       # 业务视图层
├── pages/                          # 路由页面
├── store/                          # Zustand
├── hooks/                          # 通用 hooks
├── lib/                            # 工具函数 / API
└── routes/                         # Router
```

### 1.2 当前规模

| 指标 | 当前值 |
|------|--------|
| `.tsx` 文件 | 121 |
| `shared/ui` 下 `.tsx` 文件 | 39 |
| 样式入口文件 | 4 |
| Design Tokens 数量 | 371 |
| Component Recipes 数量 | 49 |

### 1.3 已完成的结构调整

- `globals.css` 已退回成纯入口文件。
- 全局样式已经拆成 `Design Tokens / Base Styles / Component Recipes` 三层。
- `AppLayout` 已合并 `show_sidebar` 变体。
- `AppSidebar` passthrough 已删除，`AppStage` 直接使用 `SidebarWidePanel`。
- `WorkspaceTaskStrip` 已从 `WorkspaceSurfaceHeader` 中拆出。
- 废弃 re-export 已删除：`shared/ui/confirm-dialog.tsx`、`shared/ui/workspace-page-frame.tsx`、`shared/ui/workspace-pill-button.tsx`、`shared/ui/workspace-surface-header.tsx`。
- `sunny` 已切回 `light + overlay`，并改为本地视频资源。

---

## 2. 现在真正的问题

### 2.1 系统层已存在，但语义还没完全收口

当前三层已经拆开，但 `theme-tokens.css` 里仍然保留不少旧命名：

- `--glass-*`
- `--switch-*`
- `--app-stage-*`

这说明样式层虽然拆开了，但 token 语义还没有完全统一到：

- `surface`
- `card`
- `chip`
- `input`
- `divider`
- `glow`
- `motion`
- `text`

### 2.2 共享组件层还不够“硬”

以下组件已经是事实上的设计系统入口，但接口还不够稳定：

- `WorkspacePillButton`
- `WorkspaceSurfaceHeader`
- `WorkspaceConversationSwitcher`
- `WorkspaceTaskStrip`
- `WorkspaceStatusBadge`
- `SegmentedPill`

问题不是“没有共享组件”，而是这些共享组件仍然允许页面靠局部 class 改出另一套视觉，导致 feature 文件还在偷偷做视觉决定。

### 2.3 高频 feature 仍然残留大量视觉判断

重点集中在：

- `launcher/*`
- `room-conversation/*`
- `dm-conversation/*`
- `sidebar/*`
- `conversation-shared/*`

这些文件虽然已经开始复用系统层，但仍然包含大量：

- 直接写死的 `text-slate-*`
- 独立的圆角和阴影
- 自己定义的按钮密度
- 自己定义的面板节奏

这会让“逻辑层 + 视图层 + 视觉层”继续揉在一起。

### 2.4 文档曾长期落后于仓库

此前两份 UI 文档的问题不是内容太少，而是：

- 还把已完成的重构写成待做项
- 还引用了已经删除的路径
- 统计基线过旧

如果不修，后续任何 cleanup 都会误判风险和工作量。

---

## 3. 当前设计系统边界

### 3.1 Design Tokens

职责：

- 颜色
- 阴影
- 圆角
- 字体
- 透明度
- 动效时长和缓动

约束：

- 不放具体组件 class
- 不放页面专属结构
- `launcher-*` 和 `modal-*` 允许存在，但只作为域内 token

### 3.2 Base Styles

职责：

- `html/body`
- 默认排版
- 滚动条
- 选择态
- 焦点
- `prefers-reduced-motion`
- 主题切换的全局默认行为

约束：

- 不放 `glass-*`
- 不放 `modal-*`
- 不放 `app-stage` 这类具体视觉 recipe

### 3.3 Component Recipes

职责：

- `surface shell`
- `surface panel`
- `surface card`
- `chip / pill`
- `input shell`
- `divider`
- `dialog shell`
- `stage backdrop`
- `header tabs`

约束：

- 只提供“可复用外观”
- 不承载业务状态
- 页面只能组合，不再发明新质感

---

## 4. 下一步应该怎么推进

### P1. Token 语义收口

- 把旧的 `--glass-*`、`--switch-*`、`--app-stage-*` 改成语义分组命名。
- 把 `motion` 和 `text` 作为正式 token 组补齐。
- `sunny` 继续只控制 overlay，不进入颜色 token。

### P1. 共享组件硬化

- 给高频共享组件收口成稳定接口：
  - `variant`
  - `size`
  - `density`
  - `emphasis`
- 页面不再通过长串 class 改坏默认视觉。

### P1. 高频界面统一

按顺序推进：

1. 侧栏
2. Room / DM 头部
3. Task Strip
4. Composer / 工具条 / Thread 入口
5. Dialog
6. Launcher

### P2. 长尾 feature 去魔法数

目标不是把所有页面重写，而是把高频重复出现的视觉决定抽回系统层：

- 卡片密度
- 输入壳
- 小按钮
- header tab
- 状态 badge

---

## 5. 结论

当前仓库已经从“一个大 globals.css + 页面自己写样式”走到了“有设计系统雏形”的阶段。真正还没完成的，不是拆文件，而是两件事：

1. token 语义还不够干净  
2. feature 视图还没有完全停止自己做视觉决定

所以接下来的工作重点，不是继续发明新组件，而是把已有系统层收硬，把高频页面接回系统层。
