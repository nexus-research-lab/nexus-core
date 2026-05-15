import { get_agent_api_base_url } from "@/config/options";
import { ApiRequestError, request_api } from "@/lib/api/http";

import type { NexusOperationSnapshot } from "./operation-types";

const OPERATION_STAGE_API_BASE_URL = `${get_agent_api_base_url()}/operation/stage`;

interface OperationStageSnapshotEnvelope {
  key: string;
  snapshot: NexusOperationSnapshot;
  updated_at: string;
}

export async function get_operation_stage_snapshot_api(
  key: string,
): Promise<NexusOperationSnapshot | null> {
  const query = new URLSearchParams({ key });
  try {
    const result = await request_api<OperationStageSnapshotEnvelope>(
      `${OPERATION_STAGE_API_BASE_URL}/snapshot?${query.toString()}`,
      {
        method: "GET",
        notify_on_401: false,
        timeout_ms: 6000,
      },
    );
    return result.snapshot ?? null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    return null;
  }
}

export async function save_operation_stage_snapshot_api(
  key: string,
  snapshot: NexusOperationSnapshot,
): Promise<void> {
  try {
    await request_api<OperationStageSnapshotEnvelope>(
      `${OPERATION_STAGE_API_BASE_URL}/snapshot`,
      {
        method: "PUT",
        notify_on_401: false,
        timeout_ms: 8000,
        body: {
          key,
          snapshot,
        },
      },
    );
  } catch {
    // 舞台快照是恢复体验兜底，失败不能打断主会话流。
  }
}
