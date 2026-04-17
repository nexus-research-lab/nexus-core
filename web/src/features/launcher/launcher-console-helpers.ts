/**
 * =====================================================
 * @File   ：launcher-console-helpers.ts
 * @Date   ：2026-04-16 16:22
 * @Author ：leemysw
 * 2026-04-16 16:22   Create
 * =====================================================
 */

import { MentionTargetItem } from "@/features/conversation/shared/mention-popover";
import { Agent } from "@/types/agent/agent";
import { SpotlightToken } from "@/types/app/launcher";
import { RoomAggregate } from "@/types/conversation/room";
import { get_room_timestamp } from "@/lib/conversation/room-utils";

import { LauncherMentionMatch, RecentLauncherEntry } from "./launcher-console-types";

const TOKEN_SWATCHES = [
  { fill: "#5FA052", text: "#FFFFFF", ring: "#8DBA86" },
  { fill: "#E8A838", text: "#FFFFFF", ring: "#F0C56C" },
  { fill: "#4DAA9F", text: "#FFFFFF", ring: "#7CC8BE" },
  { fill: "#A78BFA", text: "#FFFFFF", ring: "#C2B0FF" },
  { fill: "#6C7BDB", text: "#FFFFFF", ring: "#9AA4F2" },
  { fill: "#D4687A", text: "#FFFFFF", ring: "#E597A3" },
  { fill: "#C4A86B", text: "#FFFFFF", ring: "#D7C08D" },
  { fill: "#8B9089", text: "#FFFFFF", ring: "#B6BAB4" },
  { fill: "#E8945A", text: "#FFFFFF", ring: "#F0B186" },
];

export function get_initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "AG";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function truncate_launcher_chip_label(label: string, max_chars: number = 8): string {
  const chars = Array.from(label.trim());
  if (chars.length <= max_chars) {
    return label.trim();
  }

  // Hero 推荐项空间很窄，超长名称改为中间省略。
  const head_count = Math.max(2, Math.ceil((max_chars - 1) / 2));
  const tail_count = Math.max(2, max_chars - 1 - head_count);
  return `${chars.slice(0, head_count).join("")}…${chars.slice(-tail_count).join("")}`;
}

export function is_launcher_chip_truncated(label: string, max_chars: number = 6): boolean {
  return Array.from(label.trim()).length > max_chars;
}

export function build_decorative_tokens(
  agents: Agent[],
  rooms: RoomAggregate[],
): SpotlightToken[] {
  const agent_tokens: SpotlightToken[] =
    agents.map((agent, index) => ({
      key: `agent-${agent.agent_id}`,
      label: get_initials(agent.name),
      agent_id: agent.agent_id,
      kind: "agent" as const,
      swatch: TOKEN_SWATCHES[index % TOKEN_SWATCHES.length],
    }));

  const room_tokens: SpotlightToken[] =
    rooms
      .filter((room) => room.room.room_type === "room")
      .sort((left, right) => get_room_timestamp(right) - get_room_timestamp(left))
      .slice(0, 8)
      .map((room, index) => ({
      key: `room-${room.room.id}`,
      label: get_initials(room.room.name?.trim() || "Room"),
      agent_id: null,
      kind: "room" as const,
      swatch: TOKEN_SWATCHES[(agent_tokens.length + index) % TOKEN_SWATCHES.length],
    }));

  const fallback = [
    { label: "SA", kind: "agent" as const },
    { label: "NV", kind: "agent" as const },
    { label: "BO", kind: "agent" as const },
    { label: "DX", kind: "room" as const },
    { label: "WR", kind: "room" as const },
    { label: "QA", kind: "room" as const },
    { label: "SP", kind: "room" as const },
    { label: "AR", kind: "room" as const },
    { label: "NO", kind: "agent" as const },
    { label: "PR", kind: "agent" as const },
    { label: "FL", kind: "agent" as const },
    { label: "PI", kind: "agent" as const },
    { label: "RL", kind: "room" as const },
    { label: "AT", kind: "agent" as const },
  ];

  const source: SpotlightToken[] = [
    ...agent_tokens,
    ...room_tokens,
  ];
  fallback.forEach((item, index) => {
    if (source.length < 18) {
      source.push({
        key: `fallback-${item.label}-${index}`,
        label: item.label,
        agent_id: null,
        kind: item.kind,
        swatch: TOKEN_SWATCHES[(agent_tokens.length + room_tokens.length + index) % TOKEN_SWATCHES.length],
      });
    }
  });

  return source.slice(0, 12);
}

export function build_launcher_mention_targets(
  agents: Agent[],
  rooms: RoomAggregate[],
): MentionTargetItem[] {
  const agent_targets = agents
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
    .map((agent) => ({
      id: `agent-${agent.agent_id}`,
      label: agent.name,
      subtitle: "Agent",
      kind: "agent" as const,
    }));

  const room_targets = rooms
      .filter((room) => room.room.room_type === "room")
      .sort((left, right) => get_room_timestamp(right) - get_room_timestamp(left))
      .map((room) => ({
      id: `room-${room.room.id}`,
      label: room.room.name?.trim() || "未命名 Room",
      subtitle: "Room",
      kind: "room" as const,
    }));

  return [...agent_targets, ...room_targets];
}

export function find_launcher_mention_match(
  value: string,
  cursor_pos: number,
): LauncherMentionMatch | null {
  const before_cursor = value.slice(0, cursor_pos);
  const match = before_cursor.match(/(?:^|\s)([@#])([^\s@#]*)$/);
  if (!match) {
    return null;
  }
  const trigger = match[1] as "@" | "#";
  const filter = match[2] ?? "";
  const start_pos = before_cursor.length - filter.length - 1;
  return {
    trigger,
    filter,
    start_pos,
  };
}

export function build_recent_launcher_entries(
  rooms: RoomAggregate[],
  agents: Agent[],
): RecentLauncherEntry[] {
  const agents_by_id = new Map(agents.map((agent) => [agent.agent_id, agent]));

  return rooms
    .slice()
    .sort((left, right) => get_room_timestamp(right) - get_room_timestamp(left))
    .map((room) => {
      const last_activity_at = get_room_timestamp(room);
      if (room.room.room_type === "dm") {
        const dm_agent_id = room.members.find((member) => member.member_agent_id)?.member_agent_id ?? undefined;
        const dm_agent = dm_agent_id ? agents_by_id.get(dm_agent_id) : null;
        return {
          key: `dm-${room.room.id}`,
          type: "dm" as const,
          agent_id: dm_agent_id,
          room_id: room.room.id,
          label: dm_agent?.name ?? room.room.name?.trim() ?? "未命名私聊",
          last_activity_at,
        };
      }

      return {
        key: `room-${room.room.id}`,
        type: "room" as const,
        room_id: room.room.id,
        label: room.room.name?.trim() || "未命名 Room",
        last_activity_at,
      };
    })
    .filter((entry) => entry.type === "room" || Boolean(entry.agent_id))
    .slice(0, 3);
}
