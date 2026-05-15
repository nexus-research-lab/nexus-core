package operation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nexus-research-lab/nexus/internal/config"
)

const MaxStageSnapshotPayloadBytes = 1024 * 1024

var (
	ErrStageSnapshotNotFound = errors.New("operation stage snapshot not found")
	ErrInvalidStageSnapshot  = errors.New("invalid operation stage snapshot")
	ErrStageSnapshotTooLarge = errors.New("operation stage snapshot too large")
)

// StageSnapshot 表示可恢复的舞台快照。
type StageSnapshot struct {
	Key       string          `json:"key"`
	Snapshot  json.RawMessage `json:"snapshot"`
	UpdatedAt string          `json:"updated_at"`
}

// Service 管理操作舞台快照的轻量持久化。
type Service struct {
	root string
}

// NewService 创建操作舞台服务。
func NewService(cfg config.Config) *Service {
	baseDir := strings.TrimSpace(cfg.CacheFileDir)
	if baseDir == "" {
		baseDir = filepath.Join(strings.TrimSpace(cfg.WorkspacePath), ".cache")
	}
	return &Service{root: filepath.Join(baseDir, "operation-stage")}
}

// SaveStageSnapshot 保存某个会话的舞台快照。
func (s *Service) SaveStageSnapshot(ctx context.Context, key string, snapshot json.RawMessage) (*StageSnapshot, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	normalizedKey, err := normalizeStageSnapshotKey(key)
	if err != nil {
		return nil, err
	}
	if len(snapshot) == 0 || !json.Valid(snapshot) {
		return nil, ErrInvalidStageSnapshot
	}
	if len(snapshot) > MaxStageSnapshotPayloadBytes {
		return nil, ErrStageSnapshotTooLarge
	}
	item := &StageSnapshot{
		Key:       normalizedKey,
		Snapshot:  append(json.RawMessage(nil), snapshot...),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	if err = os.MkdirAll(s.root, 0o755); err != nil {
		return nil, err
	}
	payload, err := json.Marshal(item)
	if err != nil {
		return nil, err
	}
	target := s.snapshotPath(normalizedKey)
	temp := target + ".tmp"
	if err = os.WriteFile(temp, payload, 0o644); err != nil {
		return nil, err
	}
	if err = os.Rename(temp, target); err != nil {
		return nil, err
	}
	return item, nil
}

// GetStageSnapshot 读取某个会话的舞台快照。
func (s *Service) GetStageSnapshot(ctx context.Context, key string) (*StageSnapshot, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	normalizedKey, err := normalizeStageSnapshotKey(key)
	if err != nil {
		return nil, err
	}
	payload, err := os.ReadFile(s.snapshotPath(normalizedKey))
	if os.IsNotExist(err) {
		return nil, ErrStageSnapshotNotFound
	}
	if err != nil {
		return nil, err
	}
	var item StageSnapshot
	if err = json.Unmarshal(payload, &item); err != nil {
		return nil, err
	}
	if item.Key != normalizedKey || len(item.Snapshot) == 0 || !json.Valid(item.Snapshot) {
		return nil, ErrInvalidStageSnapshot
	}
	return &item, nil
}

func (s *Service) snapshotPath(key string) string {
	sum := sha256.Sum256([]byte(key))
	return filepath.Join(s.root, hex.EncodeToString(sum[:])+".json")
}

func normalizeStageSnapshotKey(key string) (string, error) {
	normalized := strings.TrimSpace(key)
	if normalized == "" || len(normalized) > 256 {
		return "", ErrInvalidStageSnapshot
	}
	return normalized, nil
}
