import { useEffect, useMemo, useRef } from "react";

import { useWorkspaceLiveStore } from "@/store/workspace-live";
import type { AgentConversationIdentity } from "@/types/agent/agent-conversation";
import type { Message } from "@/types/conversation/message";
import type { PendingPermission } from "@/types/conversation/permission";

import {
  get_operation_stage_snapshot_api,
  save_operation_stage_snapshot_api,
} from "./operation-stage-api";
import { project_operation_snapshot } from "./operation-projector";
import {
  build_operation_stage_key,
  compact_operation_snapshot_for_persistence,
  useOperationStageStore,
} from "./operation-store";

interface UseOperationProjectionSyncParams {
  identity: AgentConversationIdentity | null;
  messages: Message[];
  pending_permissions: PendingPermission[];
  live_round_ids: string[];
}

export function useOperationProjectionSync({
  identity,
  messages,
  pending_permissions,
  live_round_ids,
}: UseOperationProjectionSyncParams): void {
  const key = build_operation_stage_key(identity);
  const recent_workspace_events = useWorkspaceLiveStore((state) => state.recent_events);
  const set_snapshot = useOperationStageStore((state) => state.set_snapshot);
  const last_saved_signature_ref = useRef<string | null>(null);

  useEffect(() => {
    last_saved_signature_ref.current = null;
  }, [key]);

  const snapshot = useMemo(() => {
    if (!key) {
      return null;
    }

    return project_operation_snapshot({
      key,
      session_key: identity?.session_key ?? null,
      agent_id: identity?.agent_id ?? null,
      messages,
      pending_permissions,
      live_round_ids,
      workspace_events: recent_workspace_events,
    });
  }, [
    identity?.agent_id,
    identity?.session_key,
    key,
    live_round_ids,
    messages,
    pending_permissions,
    recent_workspace_events,
  ]);

  useEffect(() => {
    if (!key) {
      return;
    }

    let cancelled = false;
    void get_operation_stage_snapshot_api(key).then((remote_snapshot) => {
      if (!cancelled && remote_snapshot) {
        set_snapshot(key, remote_snapshot);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, set_snapshot]);

  useEffect(() => {
    if (!key || !snapshot) {
      return;
    }

    set_snapshot(key, snapshot);
    const compact_snapshot = compact_operation_snapshot_for_persistence(snapshot);
    const signature = build_snapshot_signature(compact_snapshot);
    if (!signature || last_saved_signature_ref.current === signature) {
      return;
    }

    last_saved_signature_ref.current = signature;
    const timer = window.setTimeout(() => {
      void save_operation_stage_snapshot_api(key, compact_snapshot);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [key, set_snapshot, snapshot]);
}

type CompactOperationSnapshot = ReturnType<typeof compact_operation_snapshot_for_persistence>;

function build_snapshot_signature(snapshot: CompactOperationSnapshot): string | null {
  if (
    snapshot.events.length === 0 &&
    snapshot.workspace_events.length === 0 &&
    snapshot.recent_evidence.length === 0 &&
    !snapshot.active_event
  ) {
    return null;
  }
  const active = snapshot.active_event;
  const last_event = snapshot.events.at(-1);
  const last_workspace_event = snapshot.workspace_events.at(0);
  return [
    snapshot.updated_at,
    active?.id ?? "",
    active?.phase ?? "",
    last_event?.id ?? "",
    last_event?.phase ?? "",
    last_workspace_event?.id ?? "",
    last_workspace_event?.updated_at ?? "",
  ].join(":");
}
