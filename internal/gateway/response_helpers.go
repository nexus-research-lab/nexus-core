// # !/usr/bin/env go
// -*- coding: utf-8 -*-
// =====================================================
// @File   ：response_helpers.go
// @Date   ：2026/04/17 10:30:00
// @Author ：leemysw
// 2026/04/17 10:30:00   Create
// =====================================================

package gateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/nexus-research-lab/nexus/internal/protocol"
)

func (s *Server) handleNotImplemented(group string) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		s.writeJSON(writer, http.StatusNotImplemented, map[string]any{
			"code": 1,
			"msg":  "not_implemented",
			"data": map[string]any{
				"group": group,
				"path":  request.URL.Path,
			},
		})
	}
}

func (s *Server) writeJSON(writer http.ResponseWriter, status int, payload map[string]any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	encoder := json.NewEncoder(writer)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(payload)
}

func (s *Server) writeSuccess(writer http.ResponseWriter, data any) {
	s.writeJSON(writer, http.StatusOK, map[string]any{
		"code":    "0000",
		"message": "success",
		"success": true,
		"data":    data,
	})
}

func (s *Server) writeFailure(writer http.ResponseWriter, status int, detail string) {
	s.writeJSON(writer, status, map[string]any{
		"code":    fmtStatusCode(status),
		"message": "failed",
		"success": false,
		"data": map[string]any{
			"detail": detail,
		},
	})
}

func fmtStatusCode(status int) string {
	return strings.TrimSpace(strconv.Itoa(status))
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func isClientMessageError(err error) bool {
	if err == nil {
		return false
	}
	message := err.Error()
	return strings.Contains(message, "不能为空") ||
		strings.Contains(message, "不一致") ||
		strings.Contains(message, "已存在") ||
		strings.Contains(message, "至少") ||
		strings.Contains(message, "不支持") ||
		strings.Contains(message, "不能作为") ||
		strings.Contains(message, " is required") ||
		strings.Contains(message, " must be ") ||
		strings.Contains(message, "正在运行中")
}

func isStructuredSessionKeyError(err error) bool {
	if err == nil {
		return false
	}
	var target protocol.StructuredSessionKeyError
	return errors.As(err, &target)
}

func stringValue(value any) string {
	typed, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(typed)
}

func boolValue(value any) (bool, bool) {
	typed, ok := value.(bool)
	if ok {
		return typed, true
	}
	return false, false
}

func int64Value(value any) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int64:
		return typed
	case float64:
		return int64(typed)
	default:
		return 0
	}
}
