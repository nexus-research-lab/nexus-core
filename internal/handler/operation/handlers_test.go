package operation

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/nexus-research-lab/nexus/internal/config"
	handlershared "github.com/nexus-research-lab/nexus/internal/handler/shared"
	operationpkg "github.com/nexus-research-lab/nexus/internal/service/operation"
)

func TestHandleGetStageSnapshotReturnsEmptyPayloadWhenMissing(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	service := operationpkg.NewService(config.Config{CacheFileDir: filepath.Join(root, "cache")})
	handler := New(handlershared.NewAPI(nil), service)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/nexus/v1/operation/stage/snapshot?key=session:test", nil)
	handler.HandleGetStageSnapshot(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("缺失舞台快照应返回成功空结果，实际状态码: %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Success bool `json:"success"`
		Data    struct {
			Key       string          `json:"key"`
			Snapshot  json.RawMessage `json:"snapshot"`
			UpdatedAt string          `json:"updated_at"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("响应 JSON 无法解析: %v", err)
	}
	if !payload.Success || payload.Data.Key != "session:test" || string(payload.Data.Snapshot) != "null" || payload.Data.UpdatedAt != "" {
		t.Fatalf("缺失舞台快照响应不正确: %+v", payload)
	}
}
