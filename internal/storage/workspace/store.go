// =====================================================
// @File   ：store.go
// @Date   ：2026/04/10 21:22:41
// @Author ：leemysw
// 2026/04/10 21:22:41   Create
// =====================================================

package workspace

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
)

// Store 负责生成 workspace 侧存储路径。
type Store struct {
	WorkspaceRoot string
	HomeRoot      string
}

// New 创建 workspace store。
func New(root string) *Store {
	workspaceRoot := strings.TrimSpace(root)
	homeRoot := ".nexus"
	if home, err := os.UserHomeDir(); err == nil {
		homeRoot = filepath.Join(home, ".nexus")
		if workspaceRoot == "" {
			workspaceRoot = filepath.Join(homeRoot, "workspace")
		}
	}
	if workspaceRoot == "" {
		workspaceRoot = filepath.Join(homeRoot, "workspace")
	}
	return &Store{
		WorkspaceRoot: workspaceRoot,
		HomeRoot:      homeRoot,
	}
}

// SessionDir 返回 session 目录。
func (s *Store) SessionDir(workspacePath string, sessionKey string) string {
	return filepath.Join(workspacePath, ".agents", "sessions", encodeSessionKey(sessionKey))
}

// SessionMetaPath 返回 meta.json 路径。
func (s *Store) SessionMetaPath(workspacePath string, sessionKey string) string {
	return filepath.Join(s.SessionDir(workspacePath, sessionKey), "meta.json")
}

// SessionMessagePath 返回 messages.jsonl 路径。
func (s *Store) SessionMessagePath(workspacePath string, sessionKey string) string {
	return filepath.Join(s.SessionDir(workspacePath, sessionKey), "messages.jsonl")
}

// RoomConversationDir 返回 Room 对话目录。
func (s *Store) RoomConversationDir(conversationID string) string {
	return filepath.Join(s.HomeRoot, "rooms", encodeSessionKey(conversationID))
}

// RoomConversationMessagePath 返回 Room 对话消息日志路径。
func (s *Store) RoomConversationMessagePath(conversationID string) string {
	return filepath.Join(s.RoomConversationDir(conversationID), "messages.jsonl")
}

func encodeSessionKey(value string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(value))
}
