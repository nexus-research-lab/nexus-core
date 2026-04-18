// # !/usr/bin/env go
// -*- coding: utf-8 -*-
// =====================================================
// @File   ：capability_handlers.go
// @Date   ：2026/04/18 19:42:14
// @Author ：leemysw
// 2026/04/18 19:42:14   Create
// =====================================================

package gateway

import (
	"net/http"

	skillsvc "github.com/nexus-research-lab/nexus/internal/skills"
)

func (s *Server) handleCapabilitySummary(writer http.ResponseWriter, request *http.Request) {
	agentID := request.URL.Query().Get("agent_id")

	skillCount, err := s.skills.CountSkills(request.Context(), skillsvc.Query{
		AgentID: agentID,
	})
	if err != nil {
		s.writeFailure(writer, http.StatusInternalServerError, err.Error())
		return
	}

	connectorCount, err := s.connectors.GetConnectedCount(request.Context())
	if err != nil {
		s.writeFailure(writer, http.StatusInternalServerError, err.Error())
		return
	}

	scheduledTaskEnabledCount, err := s.automation.CountEnabledTasks(request.Context(), agentID)
	if err != nil {
		s.writeFailure(writer, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeSuccess(writer, map[string]any{
		"skills_count":                  skillCount,
		"connected_connectors_count":    connectorCount,
		"enabled_scheduled_tasks_count": scheduledTaskEnabledCount,
	})
}
