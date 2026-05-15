package operation

import (
	"encoding/json"
	"errors"
	"net/http"

	handlershared "github.com/nexus-research-lab/nexus/internal/handler/shared"
	operationpkg "github.com/nexus-research-lab/nexus/internal/service/operation"
)

// Handlers 封装操作舞台 HTTP handlers。
type Handlers struct {
	api       *handlershared.API
	operation *operationpkg.Service
}

// New 创建操作舞台 handlers。
func New(api *handlershared.API, operation *operationpkg.Service) *Handlers {
	return &Handlers{
		api:       api,
		operation: operation,
	}
}

type saveStageSnapshotRequest struct {
	Key      string          `json:"key"`
	Snapshot json.RawMessage `json:"snapshot"`
}

// HandleGetStageSnapshot 读取会话舞台快照。
func (h *Handlers) HandleGetStageSnapshot(writer http.ResponseWriter, request *http.Request) {
	item, err := h.operation.GetStageSnapshot(request.Context(), request.URL.Query().Get("key"))
	if errors.Is(err, operationpkg.ErrStageSnapshotNotFound) {
		h.api.WriteFailure(writer, http.StatusNotFound, "舞台快照不存在")
		return
	}
	if errors.Is(err, operationpkg.ErrInvalidStageSnapshot) {
		h.api.WriteFailure(writer, http.StatusBadRequest, "舞台快照参数错误")
		return
	}
	if err != nil {
		h.api.WriteFailure(writer, http.StatusInternalServerError, err.Error())
		return
	}
	h.api.WriteSuccess(writer, item)
}

// HandleSaveStageSnapshot 保存会话舞台快照。
func (h *Handlers) HandleSaveStageSnapshot(writer http.ResponseWriter, request *http.Request) {
	request.Body = http.MaxBytesReader(writer, request.Body, operationpkg.MaxStageSnapshotPayloadBytes+4096)
	var payload saveStageSnapshotRequest
	if !h.api.BindJSON(writer, request, &payload) {
		return
	}
	item, err := h.operation.SaveStageSnapshot(request.Context(), payload.Key, payload.Snapshot)
	if errors.Is(err, operationpkg.ErrInvalidStageSnapshot) {
		h.api.WriteFailure(writer, http.StatusBadRequest, "舞台快照参数错误")
		return
	}
	if errors.Is(err, operationpkg.ErrStageSnapshotTooLarge) {
		h.api.WriteFailure(writer, http.StatusRequestEntityTooLarge, "舞台快照过大")
		return
	}
	if err != nil {
		h.api.WriteFailure(writer, http.StatusInternalServerError, err.Error())
		return
	}
	h.api.WriteSuccess(writer, item)
}
