// # !/usr/bin/env go
// -*- coding: utf-8 -*-
// =====================================================
// @File   ：routes.go
// @Date   ：2026/04/17 10:40:00
// @Author ：leemysw
// 2026/04/17 10:40:00   Create
// =====================================================

package gateway

import "strings"

// mountRoutes 按功能域挂载全部网关路由。
func (s *Server) mountRoutes() {
	s.mountCoreRoutes()
	s.mountAgentRoutes()
	s.mountRoomRoutes()
	s.mountCapabilityRoutes()
	s.mountPlaceholderRoutes()
}

// mountCoreRoutes 挂载网关基础能力路由。
func (s *Server) mountCoreRoutes() {
	s.router.Get("/agent/v1/health", s.handleHealth)
	s.router.Get("/agent/v1/auth/status", s.handleAuthStatus)
	s.router.Post("/agent/v1/auth/login", s.handleAuthLogin)
	s.router.Post("/agent/v1/auth/logout", s.handleAuthLogout)
	s.router.Get("/agent/v1/runtime/options", s.handleRuntimeOptions)
	s.router.Get("/agent/v1/settings/providers", s.handleListProviderConfigs)
	s.router.Get("/agent/v1/settings/providers/options", s.handleListProviderOptions)
	s.router.Post("/agent/v1/settings/providers", s.handleCreateProviderConfig)
	s.router.Put("/agent/v1/settings/providers/{provider}", s.handleUpdateProviderConfig)
	s.router.Delete("/agent/v1/settings/providers/{provider}", s.handleDeleteProviderConfig)
	s.router.Get("/agent/v1/chat/ws", s.handleWebSocket)
}

// mountAgentRoutes 挂载 Agent、Session 与工作区相关路由。
func (s *Server) mountAgentRoutes() {
	s.router.Get("/agent/v1/agents", s.handleListAgents)
	s.router.Get("/agent/v1/agents/runtime/statuses", s.handleAgentRuntimeStatuses)
	s.router.Post("/agent/v1/agents", s.handleCreateAgent)
	s.router.Get("/agent/v1/agents/validate/name", s.handleValidateAgentName)
	s.router.Get("/agent/v1/agents/{agent_id}", s.handleGetAgent)
	s.router.Patch("/agent/v1/agents/{agent_id}", s.handleUpdateAgent)
	s.router.Delete("/agent/v1/agents/{agent_id}", s.handleDeleteAgent)
	s.router.Get("/agent/v1/agents/{agent_id}/sessions", s.handleListAgentSessions)
	s.router.Get("/agent/v1/agents/{agent_id}/workspace/files", s.handleWorkspaceFiles)
	s.router.Get("/agent/v1/agents/{agent_id}/workspace/file", s.handleWorkspaceFile)
	s.router.Put("/agent/v1/agents/{agent_id}/workspace/file", s.handleUpdateWorkspaceFile)
	s.router.Post("/agent/v1/agents/{agent_id}/workspace/upload", s.handleUploadWorkspaceFile)
	s.router.Get("/agent/v1/agents/{agent_id}/workspace/download", s.handleDownloadWorkspaceFile)
	s.router.Post("/agent/v1/agents/{agent_id}/workspace/entry", s.handleCreateWorkspaceEntry)
	s.router.Patch("/agent/v1/agents/{agent_id}/workspace/entry", s.handleRenameWorkspaceEntry)
	s.router.Delete("/agent/v1/agents/{agent_id}/workspace/entry", s.handleDeleteWorkspaceEntry)
	s.router.Get("/agent/v1/agents/{agent_id}/skills", s.handleAgentSkills)
	s.router.Post("/agent/v1/agents/{agent_id}/skills", s.handleInstallAgentSkill)
	s.router.Delete("/agent/v1/agents/{agent_id}/skills/{skill_name}", s.handleUninstallAgentSkill)

	s.router.Get("/agent/v1/sessions", s.handleListSessions)
	s.router.Post("/agent/v1/sessions", s.handleCreateSession)
	s.router.Patch("/agent/v1/sessions/{session_key}", s.handleUpdateSession)
	s.router.Delete("/agent/v1/sessions/{session_key}", s.handleDeleteSession)
}

// mountRoomRoutes 挂载 Room 与 Launcher 相关路由。
func (s *Server) mountRoomRoutes() {
	s.router.Get("/agent/v1/rooms/dm/{agent_id}", s.handleEnsureDirectRoom)
	s.router.Get("/agent/v1/rooms", s.handleListRooms)
	s.router.Post("/agent/v1/rooms", s.handleCreateRoom)
	s.router.Get("/agent/v1/rooms/{room_id}", s.handleGetRoom)
	s.router.Patch("/agent/v1/rooms/{room_id}", s.handleUpdateRoom)
	s.router.Delete("/agent/v1/rooms/{room_id}", s.handleDeleteRoom)
	s.router.Get("/agent/v1/rooms/{room_id}/contexts", s.handleGetRoomContexts)
	s.router.Post("/agent/v1/rooms/{room_id}/members", s.handleAddRoomMember)
	s.router.Delete("/agent/v1/rooms/{room_id}/members/{agent_id}", s.handleRemoveRoomMember)
	s.router.Post("/agent/v1/rooms/{room_id}/conversations", s.handleCreateConversation)
	s.router.Get("/agent/v1/rooms/{room_id}/conversations/{conversation_id}/messages", s.handleConversationMessages)
	s.router.Patch("/agent/v1/rooms/{room_id}/conversations/{conversation_id}", s.handleUpdateConversation)
	s.router.Delete("/agent/v1/rooms/{room_id}/conversations/{conversation_id}", s.handleDeleteConversation)

	s.router.Post("/agent/v1/launcher/query", s.handleLauncherQuery)
	s.router.Get("/agent/v1/launcher/bootstrap", s.handleLauncherBootstrap)
	s.router.Get("/agent/v1/launcher/suggestions", s.handleLauncherSuggestions)
}

// mountCapabilityRoutes 挂载技能、连接器、通道与自动化能力路由。
func (s *Server) mountCapabilityRoutes() {
	s.router.Get("/agent/v1/capability/summary", s.handleCapabilitySummary)

	s.router.Get("/agent/v1/skills", s.handleListSkills)
	s.router.Get("/agent/v1/skills/{skill_name}", s.handleGetSkillDetail)
	s.router.Post("/agent/v1/skills/import/local", s.handleImportLocalSkill)
	s.router.Post("/agent/v1/skills/import/git", s.handleImportGitSkill)
	s.router.Get("/agent/v1/skills/search/external", s.handleSearchExternalSkills)
	s.router.Get("/agent/v1/skills/external/preview", s.handlePreviewExternalSkill)
	s.router.Post("/agent/v1/skills/import/skills-sh", s.handleImportSkillsShSkill)
	s.router.Post("/agent/v1/skills/update-imported", s.handleUpdateImportedSkills)
	s.router.Post("/agent/v1/skills/{skill_name}/update", s.handleUpdateSingleSkill)
	s.router.Delete("/agent/v1/skills/{skill_name}", s.handleDeleteSkill)

	s.router.Get("/agent/v1/connectors", s.handleListConnectors)
	s.router.Get("/agent/v1/connectors/categories", s.handleConnectorCategories)
	s.router.Get("/agent/v1/connectors/count", s.handleConnectorCount)
	s.router.Get("/agent/v1/connectors/{connector_id}", s.handleConnectorDetail)
	s.router.Get("/agent/v1/connectors/{connector_id}/auth-url", s.handleConnectorAuthURL)
	s.router.Post("/agent/v1/connectors/oauth/callback", s.handleConnectorOAuthCallback)
	s.router.Post("/agent/v1/connectors/{connector_id}/connect", s.handleConnectConnector)
	s.router.Post("/agent/v1/connectors/{connector_id}/disconnect", s.handleDisconnectConnector)

	s.router.Post("/agent/v1/channels/messages", s.handleChannelIngress)
	s.router.Post("/agent/v1/channels/internal/messages", s.handleInternalChannelIngress)
	s.router.Post("/agent/v1/channels/discord/messages", s.handleDiscordChannelIngress)
	s.router.Post("/agent/v1/channels/telegram/messages", s.handleTelegramChannelIngress)

	s.router.Get("/agent/v1/capability/scheduled/tasks", s.handleListScheduledTasks)
	s.router.Post("/agent/v1/capability/scheduled/tasks", s.handleCreateScheduledTask)
	s.router.Patch("/agent/v1/capability/scheduled/tasks/{job_id}", s.handleUpdateScheduledTask)
	s.router.Delete("/agent/v1/capability/scheduled/tasks/{job_id}", s.handleDeleteScheduledTask)
	s.router.Post("/agent/v1/capability/scheduled/tasks/{job_id}/run", s.handleRunScheduledTask)
	s.router.Patch("/agent/v1/capability/scheduled/tasks/{job_id}/status", s.handleUpdateScheduledTaskStatus)
	s.router.Get("/agent/v1/capability/scheduled/tasks/{job_id}/runs", s.handleListScheduledTaskRuns)

	s.router.Get("/agent/v1/scheduled/tasks", s.handleListScheduledTasks)
	s.router.Post("/agent/v1/scheduled/tasks", s.handleCreateScheduledTask)
	s.router.Patch("/agent/v1/scheduled/tasks/{job_id}", s.handleUpdateScheduledTask)
	s.router.Delete("/agent/v1/scheduled/tasks/{job_id}", s.handleDeleteScheduledTask)
	s.router.Post("/agent/v1/scheduled/tasks/{job_id}/run", s.handleRunScheduledTask)
	s.router.Patch("/agent/v1/scheduled/tasks/{job_id}/status", s.handleUpdateScheduledTaskStatus)
	s.router.Get("/agent/v1/scheduled/tasks/{job_id}/runs", s.handleListScheduledTaskRuns)

	s.router.Get("/agent/v1/automation/heartbeat/{agent_id}", s.handleGetHeartbeat)
	s.router.Put("/agent/v1/automation/heartbeat/{agent_id}", s.handleUpdateHeartbeat)
	s.router.Post("/agent/v1/automation/heartbeat/{agent_id}/wake", s.handleWakeHeartbeat)
}

// mountPlaceholderRoutes 挂载保留占位路由。
func (s *Server) mountPlaceholderRoutes() {
	for _, group := range []string{} {
		s.mountPlaceholderGroup(group)
	}
}

func (s *Server) mountPlaceholderGroup(group string) {
	base := strings.TrimPrefix(group, "/")
	s.router.HandleFunc("/agent/v1/"+base, s.handleNotImplemented(group))
	s.router.HandleFunc("/agent/v1/"+base+"/*", s.handleNotImplemented(group))
}
