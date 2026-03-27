import { RoomAggregate, RoomMemberRecord, RoomRecord } from "@/types/room";

export type ProtocolVisibility = "public" | "scoped" | "direct" | "system";
export type ProtocolRunStatus = "running" | "paused" | "completed" | "terminated";

export interface ProtocolDefinitionRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: number;
  coordinator_mode: string;
  phases: string[];
  channel_policy: Array<Record<string, any>>;
  turn_policy: Record<string, any>;
  action_schemas: Record<string, any>;
  visibility_resolver: string;
  completion_rule: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolRunRecord {
  id: string;
  room_id: string;
  protocol_definition_id: string;
  title?: string | null;
  status: ProtocolRunStatus;
  current_phase: string;
  phase_index: number;
  current_turn_key?: string | null;
  coordinator_agent_id: string;
  run_config: Record<string, any>;
  state: Record<string, any>;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolChannelRecord {
  id: string;
  room_id: string;
  protocol_run_id: string;
  slug: string;
  name: string;
  channel_type: "public" | "scoped" | "direct" | "system";
  visibility: ProtocolVisibility;
  topic: string;
  position: number;
  metadata: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolChannelMemberRecord {
  id: string;
  channel_id: string;
  member_type: "agent" | "user";
  member_user_id?: string | null;
  member_agent_id?: string | null;
  role_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolChannelAggregate {
  channel: ProtocolChannelRecord;
  members: ProtocolChannelMemberRecord[];
}

export interface ProtocolActionRequestRecord {
  id: string;
  protocol_run_id: string;
  channel_id?: string | null;
  phase_name: string;
  turn_key?: string | null;
  action_type: string;
  status: "pending" | "resolved" | "cancelled";
  requested_by_agent_id?: string | null;
  allowed_actor_agent_ids: string[];
  audience_agent_ids: string[];
  input_schema: Record<string, any>;
  target_scope: Record<string, any>;
  prompt_text?: string | null;
  metadata: Record<string, any>;
  resolved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolActionSubmissionRecord {
  id: string;
  request_id: string;
  protocol_run_id: string;
  channel_id?: string | null;
  actor_type: "agent" | "user" | "system";
  actor_agent_id?: string | null;
  actor_user_id?: string | null;
  action_type: string;
  payload: Record<string, any>;
  status: "submitted" | "overridden" | "rejected" | "accepted";
  metadata: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolSnapshotRecord {
  id: string;
  protocol_run_id: string;
  event_seq: number;
  phase_name: string;
  event_type: string;
  channel_id?: string | null;
  actor_agent_id?: string | null;
  visibility: ProtocolVisibility;
  audience_agent_ids: string[];
  headline?: string | null;
  body?: string | null;
  state: Record<string, any>;
  metadata: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProtocolRunDetail {
  room: RoomRecord;
  members: RoomMemberRecord[];
  definition: ProtocolDefinitionRecord;
  run: ProtocolRunRecord;
  channels: ProtocolChannelAggregate[];
  action_requests: ProtocolActionRequestRecord[];
  action_submissions: ProtocolActionSubmissionRecord[];
  snapshots: ProtocolSnapshotRecord[];
  viewer_agent_id?: string | null;
}

export interface ProtocolRunListItem {
  run: ProtocolRunRecord;
  definition: ProtocolDefinitionRecord;
}

export interface CreateProtocolRunParams {
  definition_slug?: string;
  title?: string;
  run_config?: Record<string, any>;
}

export interface SubmitProtocolActionParams {
  request_id: string;
  payload: Record<string, any>;
  actor_agent_id?: string | null;
  actor_user_id?: string | null;
}

export type ProtocolRunControlOperation =
  | "pause"
  | "resume"
  | "inject_message"
  | "force_transition"
  | "override_action"
  | "terminate_run"
  | "set_local_player";

export interface ProtocolRunControlParams {
  operation: ProtocolRunControlOperation;
  payload?: Record<string, any>;
}

export interface ProtocolRoomViewModel {
  room: RoomAggregate;
  runs: ProtocolRunListItem[];
  detail: ProtocolRunDetail | null;
}
