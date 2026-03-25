export interface RoomRecord {
  id: string;
  room_type: string;
  name?: string | null;
  description: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RoomMemberRecord {
  id: string;
  room_id: string;
  member_type: "agent" | "user";
  member_user_id?: string | null;
  member_agent_id?: string | null;
  joined_at?: string | null;
}

export interface RoomAggregate {
  room: RoomRecord;
  members: RoomMemberRecord[];
}

