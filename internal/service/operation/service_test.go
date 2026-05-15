package operation

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nexus-research-lab/nexus/internal/config"
)

func TestServicePersistsStageSnapshot(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	service := NewService(config.Config{
		CacheFileDir:  filepath.Join(root, "cache"),
		WorkspacePath: filepath.Join(root, "workspace"),
	})

	saved, err := service.SaveStageSnapshot(
		context.Background(),
		"session:agent:nexus:dm:test",
		json.RawMessage(`{"key":"session:agent:nexus:dm:test","events":[{"id":"event_1"}],"updated_at":1}`),
	)
	if err != nil {
		t.Fatalf("保存舞台快照失败: %v", err)
	}
	if saved.Key != "session:agent:nexus:dm:test" || saved.UpdatedAt == "" {
		t.Fatalf("保存结果不正确: %+v", saved)
	}

	loaded, err := service.GetStageSnapshot(context.Background(), "session:agent:nexus:dm:test")
	if err != nil {
		t.Fatalf("读取舞台快照失败: %v", err)
	}
	if string(loaded.Snapshot) != string(saved.Snapshot) {
		t.Fatalf("读取的快照内容不正确: %s", string(loaded.Snapshot))
	}
}

func TestServiceRejectsInvalidStageSnapshot(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	service := NewService(config.Config{CacheFileDir: filepath.Join(root, "cache")})

	if _, err := service.GetStageSnapshot(context.Background(), "missing"); !errors.Is(err, ErrStageSnapshotNotFound) {
		t.Fatalf("缺失快照应返回 ErrStageSnapshotNotFound，实际: %v", err)
	}
	if _, err := service.SaveStageSnapshot(context.Background(), "", json.RawMessage(`{}`)); !errors.Is(err, ErrInvalidStageSnapshot) {
		t.Fatalf("空 key 应被拒绝，实际: %v", err)
	}
	if _, err := service.SaveStageSnapshot(context.Background(), "session:test", json.RawMessage(`{`)); !errors.Is(err, ErrInvalidStageSnapshot) {
		t.Fatalf("非法 JSON 应被拒绝，实际: %v", err)
	}
	if _, err := service.SaveStageSnapshot(context.Background(), "session:test", json.RawMessage(`{"value":"`+strings.Repeat("a", MaxStageSnapshotPayloadBytes)+`"}`)); !errors.Is(err, ErrStageSnapshotTooLarge) {
		t.Fatalf("超大快照应被拒绝，实际: %v", err)
	}
}
