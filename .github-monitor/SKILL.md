# GitHub Monitor - nexus-core

自动化监控和合并 nexus-research-lab/nexus-core 仓库的 PR 和分支变更。

## 🎯 功能特性

- ✅ **实时响应** - 通过 webhook 立即处理 PR/推送事件（0-5秒）
- ✅ **AI 代码审查** - 使用 Codex 审查代码变更
- ✅ **自动合并** - 审查通过后自动 squash 合并
- ✅ **分支同步** - 自动创建分支到 main 的 PR
- ✅ **定时备份** - 每 15 分钟 cron 检查（可选）
- ✅ **状态监控** - 完善的日志和健康检查

## 🏗️ 系统架构

```
GitHub 事件
    ↓ (实时 webhook)
ngrok 隧道
    ↓
Webhook Server (localhost:18790)
    ↓
触发 monitor.sh
    ↓
Codex AI 审查代码
    ↓
自动合并 PR (squash)
```

## 📁 文件结构

```
.github-monitor/
├── config.json           # 配置文件
├── monitor.sh            # 监控脚本（核心逻辑）
├── webhook-server.js     # Webhook 接收服务器
├── start.sh              # 启动所有服务
├── stop.sh               # 停止所有服务
├── status.sh             # 检查服务状态
├── cron-setup.sh         # 设置定时任务
├── SKILL.md              # 本文件
├── monitor.log           # 监控运行日志
├── webhook.log           # Webhook 日志
└── ngrok.log             # Ngrok 日志
```

## 🚀 快速开始

### 启动服务
```bash
bash /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/start.sh
```

### 检查状态
```bash
bash /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/status.sh
```

### 停止服务
```bash
bash /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/stop.sh
```

### 手动运行监控
```bash
bash /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/monitor.sh
```

## ⚙️ 配置

编辑 `config.json`:

```json
{
  "repo": "nexus-research-lab/nexus-core",
  "mainBranch": "main",
  "checkInterval": "15m",
  "autoMerge": {
    "enabled": true,
    "requireCI": true,
    "requireReview": false,
    "mergeMethod": "squash"
  },
  "codex": {
    "enabled": true,
    "reviewPrompt": "Review this code..."
  }
}
```

### 配置项说明

- **repo**: 监控的仓库
- **checkInterval**: 定时检查间隔
- **autoMerge.requireCI**: 是否要求 CI 通过
- **autoMerge.requireReview**: 是否需要人工审批
- **autoMerge.mergeMethod**: 合并方式 (merge/squash/rebase)
- **codex.enabled**: 是否使用 Codex 审查

## 🔧 服务管理

### Webhook Server
- **端口**: 18790
- **健康检查**: http://localhost:18790/health
- **Webhook 端点**: http://localhost:18790/webhook

### Ngrok
- **本地端口**: 18790
- **公网地址**: https://unfeoffed-entertainingly-oda.ngrok-free.dev
- **管理界面**: http://localhost:4040

### GitHub Actions
- **Workflow**: `.github/workflows/auto-merge.yml`
- **Secret**: `OPENCLAW_WEBHOOK_URL`
- **触发条件**: PR 打开/更新，分支推送

## 📊 监控流程

### 实时流程（Webhook）

1. **PR 创建/更新**
   - GitHub Actions 触发
   - 调用 webhook URL
   - Webhook server 接收事件
   - 立即运行 monitor.sh

2. **分支推送**
   - GitHub Actions 触发
   - 调用 webhook URL
   - 检查是否需要创建 PR

### 定时流程（Cron，备份）

- 每 15 分钟运行一次
- 检查所有开放的 PR
- 检查所有分支状态
- 确保没有遗漏

### AI 审查流程

1. 获取 PR diff
2. 调用 Codex 审查
3. 检查项：
   - Bug 或错误
   - 安全问题
   - 代码质量
   - 破坏性变更
4. 返回 APPROVE 或 REJECT

### 自动合并条件

- ✅ PR 是 mergeable 状态
- ✅ CI 通过（如果配置）
- ✅ Codex 审查通过
- ✅ 无冲突

## 🔍 日志查看

```bash
# 监控日志
tail -f /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/monitor.log

# Webhook 日志
tail -f /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/webhook.log

# Ngrok 日志
tail -f /Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/ngrok.log
```

## 🛠️ 故障排查

### Webhook 无响应
```bash
# 检查服务状态
bash status.sh

# 测试 webhook
curl -X POST https://unfeoffed-entertainingly-oda.ngrok-free.dev/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","repo":"nexus-research-lab/nexus-core"}'

# 检查日志
tail -f webhook.log
```

### PR 未自动合并
```bash
# 手动运行检查
bash monitor.sh

# 检查 PR 状态
gh pr list --repo nexus-research-lab/nexus-core

# 查看 PR 详情
gh pr view <PR_NUMBER> --repo nexus-research-lab/nexus-core
```

### Ngrok 断开
```bash
# 重启服务
bash stop.sh
bash start.sh

# 检查 ngrok 状态
curl http://localhost:4040/api/tunnels
```

## 🔐 安全考虑

- ✅ Webhook 只接收来自 GitHub 的事件
- ✅ 使用 GitHub Token 进行认证
- ✅ 本地存储，数据不外泄
- ✅ Ngrok 使用 HTTPS 加密

## 📝 维护

### 开机自启（macOS launchd）

创建 `~/Library/LaunchAgents/com.openclaw.github-monitor.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.github-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/aibox/.openclaw/workspace/PROJECTS/nexus-core/.github-monitor/start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

加载：
```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.github-monitor.plist
```

## 📈 性能指标

- **响应时间**: < 5 秒（webhook）
- **审查时间**: 取决于 PR 大小和 Codex 速度
- **内存占用**: ~50MB（webhook server + ngrok）
- **CPU 占用**: 闲置时几乎为 0

## 🆘 获取帮助

1. 查看日志文件
2. 运行 `status.sh` 检查服务状态
3. 手动运行 `monitor.sh` 测试
4. 检查 GitHub Actions 运行记录

---

**创建时间**: 2026-03-11
**维护者**: OpenClaw AI (GLM-5)
**版本**: 1.0.0
