// # !/usr/bin/env go
// -*- coding: utf-8 -*-
// =====================================================
// @File   ：model_message.go
// @Date   ：2026/04/16 22:18:54
// @Author ：leemysw
// 2026/04/16 22:18:54   Create
// =====================================================

package session

// Message 表示历史消息行。
type Message map[string]any

// MessagePage 表示按 round 分页的消息历史结果。
type MessagePage struct {
	Items                    []Message `json:"items"`
	HasMore                  bool      `json:"has_more"`
	NextBeforeRoundID        *string   `json:"next_before_round_id,omitempty"`
	NextBeforeRoundTimestamp *int64    `json:"next_before_round_timestamp,omitempty"`
}
