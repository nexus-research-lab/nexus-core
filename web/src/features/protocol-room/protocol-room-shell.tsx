"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  MessageSquareText,
  Play,
  Pause,
  RadioTower,
  RefreshCcw,
  Send,
  Shield,
  Skull,
  Sparkles,
  TimerReset,
  Users,
  Vote,
  WandSparkles,
  Zap,
} from "lucide-react";

import { cn, formatRelativeTime } from "@/lib/utils";
import {
  ProtocolActionRequestRecord,
  ProtocolChannelAggregate,
  ProtocolRunControlOperation,
  ProtocolRunListItem,
  ProtocolSnapshotRecord,
  RoomAggregate,
  RoomMemberRecord,
  WebSocketState,
} from "@/types";

interface ProtocolRoomShellProps {
  room: RoomAggregate;
  runs: ProtocolRunListItem[];
  detail: ProtocolRunDetail | null;
  room_agent_members: RoomMemberRecord[];
  pending_requests: ProtocolActionRequestRecord[];
  selected_channel: ProtocolChannelAggregate | null;
  selected_channel_id: string | null;
  selected_channel_events: ProtocolSnapshotRecord[];
  viewer_agent_id: string | null;
  is_loading: boolean;
  ws_state: WebSocketState;
  error: string | null;
  on_create_run: (params?: { definition_slug?: string; title?: string }) => Promise<unknown>;
  on_select_run: (run_id: string) => void;
  on_select_channel: (channel_id: string) => void;
  on_set_viewer: (agent_id: string | null) => void;
  on_submit_action: (
    request_id: string,
    payload: Record<string, any>,
    actor_agent_id?: string | null,
    options?: { as_override?: boolean },
  ) => Promise<unknown>;
  on_control: (
    operation: ProtocolRunControlOperation,
    payload?: Record<string, any>,
  ) => Promise<unknown>;
  on_refresh: () => Promise<unknown>;
}

const EVENT_STYLE_MAP: Record<string, string> = {
  phase_started: "border-sky-400/30 bg-sky-500/8",
  turn_opened: "border-violet-400/30 bg-violet-500/8",
  action_requested: "border-amber-400/30 bg-amber-500/8",
  action_submitted: "border-orange-400/30 bg-orange-500/8",
  channel_message: "border-emerald-400/30 bg-emerald-500/8",
  phase_resolved: "border-slate-400/30 bg-slate-500/8",
  verdict: "border-rose-400/30 bg-rose-500/8",
  run_completed: "border-fuchsia-400/30 bg-fuchsia-500/8",
  run_paused: "border-zinc-400/30 bg-zinc-500/8",
  run_resumed: "border-lime-400/30 bg-lime-500/8",
};

function toTimestamp(value?: string | null): number {
  return value ? Date.parse(value) : 0;
}

function renderPhaseLabel(phase_name: string) {
  const labels: Record<string, string> = {
    setup: "准备阶段",
    night: "夜晚阶段",
    day_announcement: "白天播报",
    day_speeches: "白天发言",
    voting: "投票阶段",
    game_over: "结算阶段",
  };
  return labels[phase_name] || phase_name.replaceAll("_", " ");
}

function renderEventTypeLabel(event_type: string) {
  const labels: Record<string, string> = {
    phase_started: "阶段开始",
    turn_opened: "轮次开启",
    action_requested: "动作请求",
    action_submitted: "动作已提交",
    channel_message: "频道消息",
    phase_resolved: "阶段结算",
    verdict: "裁决",
    run_completed: "协作完成",
    run_paused: "协作暂停",
    run_resumed: "协作恢复",
    room_state: "房间状态",
  };
  return labels[event_type] || event_type.replaceAll("_", " ");
}

function renderStatusLabel(status: string) {
  if (status === "running") return "运行中";
  if (status === "paused") return "已暂停";
  if (status === "completed") return "已完成";
  return "已终止";
}

function renderChannelVisibilityLabel(visibility: string) {
  const labels: Record<string, string> = {
    public: "公开",
    scoped: "受限",
    direct: "私密",
    system: "系统",
  };
  return labels[visibility] || visibility;
}

function renderRoleLabel(role: string) {
  const labels: Record<string, string> = {
    wolf: "狼人",
    seer: "预言家",
    healer: "守护者",
    villager: "平民",
    member: "成员",
  };
  return labels[role] || role;
}

function renderSeatStatusLabel(status: "pending" | "submitted" | "idle", is_alive: boolean, is_eliminated: boolean) {
  if (!is_alive && is_eliminated) {
    return "已出局";
  }
  if (!is_alive) {
    return "待命";
  }
  if (status === "pending") {
    return "待提交";
  }
  if (status === "submitted") {
    return "已提交";
  }
  return "空闲";
}

function renderDefinitionLabel(slug: string) {
  if (slug === "werewolf_demo") {
    return "狼人杀演示协议";
  }
  return slug;
}

function renderDefinitionDescription(slug: string, fallback: string) {
  if (slug === "werewolf_demo") {
    return "这是一个用于验证 protocol room 内核的演示协议，包含公开舞台、系统广播、私密频道、阶段推进和结构化动作。";
  }
  return fallback;
}

function renderActionLabel(action_type: string) {
  const labels: Record<string, string> = {
    kill_target: "击杀目标",
    inspect_target: "查验目标",
    save_target: "保护目标",
    speak: "公开发言",
    vote_target: "投票目标",
    signal_ready: "准备完成",
  };
  return labels[action_type] || action_type.replaceAll("_", " ");
}

function renderWinnerLabel(winner: string) {
  const labels: Record<string, string> = {
    wolves: "狼人阵营",
    villagers: "村民阵营",
  };
  return labels[winner] || winner;
}

function renderChannelName(slug: string, fallback: string) {
  const labels: Record<string, string> = {
    "public-main": "公共舞台",
    "system-broadcast": "系统广播",
    "wolves-den": "狼人密聊",
  };
  if (slug.startsWith("direct-")) {
    const owner = slug.replace("direct-", "");
    return `私密频道 · ${owner}`;
  }
  return labels[slug] || fallback;
}

function renderChannelTopic(slug: string, fallback: string) {
  const labels: Record<string, string> = {
    "public-main": "所有成员都能看到的公开协作舞台",
    "system-broadcast": "主持人和系统裁决广播区",
    "wolves-den": "仅狼人阵营可见的秘密协作频道",
  };
  if (slug.startsWith("direct-")) {
    return "仅当前成员可见的私密行动频道";
  }
  return labels[slug] || fallback;
}

function renderChannelIcon(channel_type: string) {
  if (channel_type === "system") {
    return RadioTower;
  }
  if (channel_type === "direct") {
    return Shield;
  }
  if (channel_type === "scoped") {
    return EyeOff;
  }
  return MessageSquareText;
}

function renderEventIcon(event_type: string) {
  if (event_type === "run_completed" || event_type === "verdict") {
    return Sparkles;
  }
  if (event_type === "action_requested" || event_type === "action_submitted") {
    return Zap;
  }
  if (event_type === "turn_opened") {
    return WandSparkles;
  }
  return RadioTower;
}

export function ProtocolRoomShell({
  room,
  runs,
  detail,
  room_agent_members,
  pending_requests,
  selected_channel,
  selected_channel_id,
  selected_channel_events,
  viewer_agent_id,
  is_loading,
  ws_state,
  error,
  on_create_run,
  on_select_run,
  on_select_channel,
  on_set_viewer,
  on_submit_action,
  on_control,
  on_refresh,
}: ProtocolRoomShellProps) {
  const [request_payloads, set_request_payloads] = useState<Record<string, Record<string, string>>>({});
  const [request_actors, set_request_actors] = useState<Record<string, string>>({});
  const [inject_channel_id, set_inject_channel_id] = useState<string>("");
  const [inject_message, set_inject_message] = useState("");
  const [force_phase_name, set_force_phase_name] = useState("");
  const [busy_request_id, set_busy_request_id] = useState<string | null>(null);
  const [is_busy_control, set_is_busy_control] = useState(false);

  const alive_agent_ids = useMemo(
    () => new Set(detail?.run.state?.alive_agent_ids ?? []),
    [detail?.run.state],
  );
  const eliminated_agent_ids = useMemo(
    () => new Set(detail?.run.state?.eliminated_agent_ids ?? []),
    [detail?.run.state],
  );
  const roles_by_agent_id = detail?.run.state?.roles ?? {};
  const resolved_request_ids = useMemo(
    () => new Set(
      detail?.action_submissions
        .filter((submission) => submission.status === "submitted" || submission.status === "overridden")
        .map((submission) => submission.request_id) ?? [],
    ),
    [detail?.action_submissions],
  );

  useEffect(() => {
    if (!detail?.channels?.length) {
      set_inject_channel_id("");
      return;
    }
    if (detail.channels.some((channel) => channel.channel.id === inject_channel_id)) {
      return;
    }
    const fallback_channel =
      detail.channels.find((channel) => channel.channel.slug === "public-main")
      ?? detail.channels[0];
    set_inject_channel_id(fallback_channel?.channel.id ?? "");
  }, [detail?.channels, inject_channel_id]);

  useEffect(() => {
    if (!detail) {
      set_force_phase_name("");
      return;
    }
    const current_index = detail.definition.phases.indexOf(detail.run.current_phase);
    const next_phase = detail.definition.phases[current_index + 1] ?? "";
    set_force_phase_name(next_phase);
  }, [detail]);

  const timeline_events = detail?.snapshots ?? [];
  const pending_current_phase_requests = useMemo(
    () => pending_requests.filter((request) => request.phase_name === detail?.run.current_phase),
    [detail?.run.current_phase, pending_requests],
  );
  const member_request_status = useMemo(() => {
    const status_map = new Map<string, "pending" | "submitted" | "idle">();
    room_agent_members.forEach((member) => {
      if (member.member_agent_id) {
        status_map.set(member.member_agent_id, "idle");
      }
    });

    pending_current_phase_requests.forEach((request) => {
      request.allowed_actor_agent_ids.forEach((agent_id) => {
        status_map.set(
          agent_id,
          resolved_request_ids.has(request.id) ? "submitted" : "pending",
        );
      });
    });
    return status_map;
  }, [pending_current_phase_requests, resolved_request_ids, room_agent_members]);

  const remaining_phases = useMemo(() => {
    if (!detail) {
      return [];
    }
    const current_index = detail.definition.phases.indexOf(detail.run.current_phase);
    return detail.definition.phases.slice(Math.max(current_index + 1, 0));
  }, [detail]);

  const handle_create_run = async () => {
    await on_create_run({
      definition_slug: "werewolf_demo",
      title: room.room.name ? `${room.room.name} · 协议协作` : "协议协作",
    });
  };

  const handle_submit_request = async (
    request: ProtocolActionRequestRecord,
    as_override: boolean,
  ) => {
    const actor_agent_id = request_actors[request.id] || request.allowed_actor_agent_ids[0] || null;
    const payload = request_payloads[request.id] ?? {};
    set_busy_request_id(request.id);
    try {
      await on_submit_action(request.id, payload, actor_agent_id, { as_override });
    } finally {
      set_busy_request_id(null);
    }
  };

  const handle_control = async (
    operation: ProtocolRunControlOperation,
    payload: Record<string, any> = {},
  ) => {
    set_is_busy_control(true);
    try {
      await on_control(operation, payload);
    } finally {
      set_is_busy_control(false);
    }
  };

  const handle_inject_message = async () => {
    if (!inject_channel_id || !inject_message.trim()) {
      return;
    }
    await handle_control("inject_message", {
      channel_id: inject_channel_id,
      content: inject_message.trim(),
      headline: "主持人注入消息",
    });
    set_inject_message("");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-x-[12%] top-[8%] h-36 rounded-full bg-[radial-gradient(circle,rgba(120,170,255,0.2),transparent_72%)] blur-3xl" />
      <section className="panel-surface relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_52%)]" />

        <header className="relative z-10 flex flex-col gap-4 border-b border-white/55 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-700/52">
                <span className="neo-pill rounded-full px-3 py-1">协议房间</span>
                <span>{room.room.room_type === "room" ? "多人协作" : "单聊"}</span>
                {detail ? <span>{renderStatusLabel(detail.run.status)}</span> : null}
                <span>{ws_state === "connected" ? "实时同步" : "轮询回退"}</span>
              </div>
            <h1 className="mt-3 text-[30px] font-black tracking-[-0.05em] text-slate-950/92">
              {room.room.name || room.room.id}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700/62">
              舞台视图优先展示阶段推进、成员状态、受限频道和结构化动作，不把所有协作混成一条聊天流。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="neo-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-900 transition hover:translate-y-[-1px]"
              onClick={() => void on_refresh()}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" />
              刷新
            </button>
            {!detail ? (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] transition hover:translate-y-[-1px]"
                onClick={() => void handle_create_run()}
                type="button"
              >
                <Sparkles className="h-4 w-4" />
                启动演示协作
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="neo-card-flat relative z-10 mt-4 flex items-start gap-3 rounded-[24px] border border-rose-400/25 px-4 py-3 text-sm text-rose-900/84">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        ) : null}

        {!detail ? (
          <div className="relative z-10 grid flex-1 gap-4 py-6 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="neo-card flex flex-col justify-between rounded-[28px] p-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700/50">
                  <Users className="h-4 w-4" />
                  成员席位
                </div>
                <div className="mt-4 grid gap-3">
                  {room_agent_members.map((member) => (
                    <div
                      key={member.id}
                      className="neo-card-flat flex items-center justify-between rounded-[22px] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950/90">
                          {member.member_agent_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-700/52">等待加入协议协作</p>
                      </div>
                      <div className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/58">
                        成员
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="neo-card flex flex-col justify-between rounded-[28px] p-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700/50">
                  <RadioTower className="h-4 w-4" />
                  协作舞台
                </div>
                <h2 className="mt-4 text-[24px] font-black tracking-[-0.04em] text-slate-950/92">
                  这个 room 还没有激活 protocol run
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700/62">
                  启动后会生成公共舞台、系统广播、私密频道、阶段时间线和结构化动作卡。
                  当前默认接入 `狼人杀演示协议`，它只是用来验证这套协议协作内核。
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                  onClick={() => void handle_create_run()}
                  type="button"
                >
                  <Play className="h-4 w-4" />
                  启动演示协作
                </button>
                <div className="neo-card-flat flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700/56">
                  <Eye className="h-3.5 w-3.5" />
                  房间优先，协议驱动
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 grid min-h-0 flex-1 gap-4 py-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className="neo-card flex min-h-0 flex-col rounded-[28px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                    当前视角
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950/88">
                    {viewer_agent_id || "观察者"}
                  </p>
                </div>
                <select
                  className="neo-inset rounded-full px-3 py-2 text-sm text-slate-900/86 outline-none"
                  onChange={(event) => on_set_viewer(event.target.value || null)}
                  value={viewer_agent_id ?? ""}
                >
                  <option value="">观察者</option>
                  {room_agent_members.map((member) => (
                    <option key={member.id} value={member.member_agent_id ?? ""}>
                      {member.member_agent_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                  成员席位
                </p>
                <div className="mt-3 space-y-3">
                  {room_agent_members.map((member) => {
                    const agent_id = member.member_agent_id ?? "";
                    const is_alive = alive_agent_ids.has(agent_id);
                    const is_eliminated = eliminated_agent_ids.has(agent_id);
                    const role = roles_by_agent_id?.[agent_id] || "member";
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "rounded-[22px] border px-4 py-3 transition",
                          is_alive
                            ? "border-emerald-400/24 bg-emerald-500/8"
                            : "border-slate-400/18 bg-slate-500/6",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950/90">
                              {agent_id}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white/78 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/60">
                                {renderRoleLabel(role)}
                              </span>
                              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/60">
                                {renderSeatStatusLabel(
                                  member_request_status.get(agent_id) || "idle",
                                  is_alive,
                                  is_eliminated,
                                )}
                              </span>
                            </div>
                          </div>
                          {is_alive ? (
                            <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <Skull className="h-4 w-4 shrink-0 text-slate-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                    协作频道
                  </p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/40">
                    共 {detail.channels.length} 个
                  </span>
                </div>
                <div className="mt-3 space-y-2 overflow-y-auto pr-1 scrollbar-hide">
                  {detail.channels.map((channel) => {
                    const ChannelIcon = renderChannelIcon(channel.channel.channel_type);
                    const is_visible = Boolean(channel.channel.metadata?.is_visible);
                    const is_selected = channel.channel.id === selected_channel_id;
                    return (
                      <button
                        key={channel.channel.id}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-[22px] border px-3 py-3 text-left transition",
                          is_selected
                            ? "border-slate-950/20 bg-slate-950/8 shadow-[0_12px_26px_rgba(15,23,42,0.08)]"
                            : "border-white/60 bg-white/36 hover:bg-white/48",
                        )}
                        onClick={() => on_select_channel(channel.channel.id)}
                        type="button"
                      >
                        <div className="mt-0.5 rounded-full bg-white/80 p-2">
                          <ChannelIcon className="h-4 w-4 text-slate-900/76" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950/90">
                              {renderChannelName(channel.channel.slug, channel.channel.name)}
                            </p>
                            {!is_visible ? <Lock className="h-3.5 w-3.5 text-slate-500" /> : null}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-700/56">
                            {renderChannelTopic(channel.channel.slug, channel.channel.topic)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <main className="grid min-h-0 gap-4 xl:grid-rows-[minmax(0,1.14fr)_minmax(280px,0.86fr)]">
              <section className="neo-card flex min-h-0 flex-col rounded-[28px] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/55 pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                      舞台时间线
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950/90">
                      {detail.run.title || detail.definition.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="neo-inset rounded-full px-3 py-2 text-sm text-slate-900/86 outline-none"
                      onChange={(event) => on_select_run(event.target.value)}
                      value={detail.run.id}
                    >
                      {runs.map((item) => (
                        <option key={item.run.id} value={item.run.id}>
                          {item.run.title || item.definition.name}
                        </option>
                      ))}
                    </select>
                    <div className="neo-card-flat rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/58">
                      {renderPhaseLabel(detail.run.current_phase)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                  <div className="space-y-3">
                    {timeline_events.map((snapshot) => {
                      const EventIcon = renderEventIcon(snapshot.event_type);
                      const relative_time = formatRelativeTime(toTimestamp(snapshot.created_at));
                      return (
                        <article
                          key={snapshot.id}
                          className={cn(
                            "rounded-[24px] border px-4 py-4",
                            EVENT_STYLE_MAP[snapshot.event_type] ?? "border-white/60 bg-white/40",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-white/78 p-2">
                              <EventIcon className="h-4 w-4 text-slate-900/78" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-700/48">
                                <span>{renderEventTypeLabel(snapshot.event_type)}</span>
                                <span>{renderPhaseLabel(snapshot.phase_name)}</span>
                                <span>{relative_time}</span>
                                {snapshot.metadata?.redacted ? <span>受限</span> : null}
                              </div>
                              <h3 className="mt-2 text-sm font-semibold text-slate-950/90">
                                {snapshot.metadata?.redacted ? "受限协作事件" : snapshot.headline || renderEventTypeLabel(snapshot.event_type)}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-slate-700/66">
                                {snapshot.metadata?.redacted
                                  ? "当前视角之外的私密或受限频道发生了一条协作事件。"
                                  : snapshot.body || "暂无更多说明。"}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="neo-card flex min-h-0 flex-col rounded-[28px] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/55 pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                      频道动态
                    </p>
                    <h3 className="mt-1 text-base font-black tracking-[-0.04em] text-slate-950/90">
                      {selected_channel ? renderChannelName(selected_channel.channel.slug, selected_channel.channel.name) : "未选择频道"}
                    </h3>
                  </div>
                  {selected_channel ? (
                    <div className="neo-card-flat rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/56">
                      {renderChannelVisibilityLabel(selected_channel.channel.visibility)}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                  {selected_channel_events.length ? (
                    <div className="space-y-3">
                      {selected_channel_events.map((snapshot) => (
                        <div
                          key={snapshot.id}
                          className={cn(
                            "rounded-[22px] border px-4 py-4",
                            snapshot.metadata?.redacted
                              ? "border-slate-400/20 bg-slate-500/6"
                              : "border-white/60 bg-white/44",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950/90">
                              {snapshot.metadata?.redacted ? "受限事件" : snapshot.headline || renderEventTypeLabel(snapshot.event_type)}
                            </p>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                              {formatRelativeTime(toTimestamp(snapshot.created_at))}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700/64">
                            {snapshot.metadata?.redacted
                              ? "这条事件真实存在，但当前视角下它的具体内容被隐藏了。"
                              : snapshot.body || "暂无频道正文。"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center rounded-[24px] border border-dashed border-white/60 bg-white/24 px-6 text-center text-sm leading-6 text-slate-700/56">
                      当前频道还没有可展示的事件。
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside className="neo-card flex min-h-0 flex-col rounded-[28px] p-4">
              <div className="border-b border-white/55 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                  控制台
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[22px] border border-white/60 bg-white/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                      当前阶段
                    </p>
                    <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950/90">
                      {renderPhaseLabel(detail.run.current_phase)}
                    </p>
                    <p className="mt-1 text-xs text-slate-700/54">
                      {renderStatusLabel(detail.run.status)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/60 bg-white/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                      待处理动作
                    </p>
                    <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950/90">
                      {pending_current_phase_requests.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-700/54">
                      当前阶段的阻塞项
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/60 bg-white/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                      天数 / 胜者
                    </p>
                    <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950/90">
                      第 {detail.run.state?.day ?? 1} 天
                    </p>
                    <p className="mt-1 text-xs text-slate-700/54">
                      {detail.run.state?.winner ? `胜者：${renderWinnerLabel(detail.run.state.winner)}` : "当前还没有胜者"}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/60 bg-white/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                      同步模式
                    </p>
                    <p className="mt-2 text-lg font-black tracking-[-0.04em] text-slate-950/90">
                      {ws_state === "connected" ? "实时" : "回退"}
                    </p>
                    <p className="mt-1 text-xs text-slate-700/54">
                      {ws_state === "connected" ? "通过房间事件实时刷新" : "每 4 秒轮询一次"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                    disabled={is_busy_control || is_loading}
                    onClick={() => void handle_control(detail.run.status === "paused" ? "resume" : "pause")}
                    type="button"
                  >
                    {detail.run.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {detail.run.status === "paused" ? "恢复" : "暂停"}
                  </button>
                  <button
                    className="neo-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-900 transition hover:translate-y-[-1px]"
                    disabled={is_busy_control || !force_phase_name}
                    onClick={() => void handle_control("force_transition", { phase_name: force_phase_name })}
                    type="button"
                  >
                    <ArrowRight className="h-4 w-4" />
                    强制推进
                  </button>
                  <button
                    className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-900/84 transition hover:translate-y-[-1px]"
                    disabled={is_busy_control}
                    onClick={() => void handle_control("terminate_run")}
                    type="button"
                  >
                    终止
                  </button>
                </div>

                <div className="mt-3">
                  <select
                    className="neo-inset w-full rounded-[18px] px-3 py-2.5 text-sm text-slate-900/86 outline-none"
                    onChange={(event) => set_force_phase_name(event.target.value)}
                      value={force_phase_name}
                    >
                      <option value="">选择要强制进入的阶段</option>
                      {remaining_phases.map((phase_name) => (
                        <option key={phase_name} value={phase_name}>
                          {renderPhaseLabel(phase_name)}
                        </option>
                      ))}
                    </select>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                <div className="space-y-4">
                  <section className="rounded-[24px] border border-white/60 bg-white/40 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                        协议规则
                      </p>
                      <div className="rounded-full bg-white/74 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/56">
                        {renderDefinitionLabel(detail.definition.slug)}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700/64">
                      {renderDefinitionDescription(detail.definition.slug, detail.definition.description)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.definition.phases.map((phase_name) => (
                        <span
                          key={phase_name}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                            phase_name === detail.run.current_phase
                              ? "bg-slate-950 text-white"
                              : "bg-white/74 text-slate-700/60",
                          )}
                        >
                          {renderPhaseLabel(phase_name)}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                        动作面板
                      </p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/40">
                        {pending_requests.length} 个待处理
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {pending_requests.map((request) => {
                        const actor_options = request.allowed_actor_agent_ids;
                        const fields = Array.isArray(request.input_schema?.fields)
                          ? request.input_schema.fields
                          : [];
                        return (
                          <div key={request.id} className="rounded-[24px] border border-white/60 bg-white/40 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950/90">
                                  {renderActionLabel(request.action_type)}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-700/46">
                                  {renderPhaseLabel(request.phase_name)}
                                </p>
                              </div>
                              <div className="rounded-full bg-white/74 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/56">
                                待处理
                              </div>
                            </div>
                            {request.prompt_text ? (
                              <p className="mt-3 text-sm leading-6 text-slate-700/64">
                                {request.prompt_text}
                              </p>
                            ) : null}

                            {actor_options.length ? (
                              <div className="mt-3">
                                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                                  执行成员
                                </label>
                                <select
                                  className="neo-inset mt-1.5 w-full rounded-[16px] px-3 py-2 text-sm text-slate-900/86 outline-none"
                                  onChange={(event) => set_request_actors((prev) => ({
                                    ...prev,
                                    [request.id]: event.target.value,
                                  }))}
                                  value={request_actors[request.id] ?? actor_options[0] ?? ""}
                                >
                                  {actor_options.map((agent_id) => (
                                    <option key={agent_id} value={agent_id}>
                                      {agent_id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}

                            {fields.map((field: Record<string, any>) => {
                              const field_name = String(field.name || "");
                              const current_value = request_payloads[request.id]?.[field_name] ?? "";
                              const options = Array.isArray(field.options)
                                ? field.options
                                : request.target_scope?.candidate_agent_ids ?? [];
                              if (field.type === "agent_id") {
                                return (
                                  <div key={field_name} className="mt-3">
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                                      {field.label || field_name}
                                    </label>
                                    <select
                                      className="neo-inset mt-1.5 w-full rounded-[16px] px-3 py-2 text-sm text-slate-900/86 outline-none"
                                      onChange={(event) => set_request_payloads((prev) => ({
                                        ...prev,
                                        [request.id]: {
                                          ...(prev[request.id] ?? {}),
                                          [field_name]: event.target.value,
                                        },
                                      }))}
                                      value={current_value}
                                    >
                                      <option value="">请选择目标</option>
                                      {options.map((option: string) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              }

                              return (
                                <div key={field_name} className="mt-3">
                                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/48">
                                    {field.label || field_name}
                                  </label>
                                  <textarea
                                    className="neo-inset mt-1.5 min-h-[96px] w-full resize-y rounded-[16px] px-3 py-2.5 text-sm leading-6 text-slate-900/86 outline-none"
                                    onChange={(event) => set_request_payloads((prev) => ({
                                      ...prev,
                                      [request.id]: {
                                        ...(prev[request.id] ?? {}),
                                        [field_name]: event.target.value,
                                      },
                                    }))}
                                    placeholder={field.placeholder || "输入内容"}
                                    value={current_value}
                                  />
                                </div>
                              );
                            })}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                                disabled={busy_request_id === request.id}
                                onClick={() => void handle_submit_request(request, false)}
                                type="button"
                              >
                                <Send className="h-4 w-4" />
                                提交
                              </button>
                              <button
                                className="neo-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-900 transition hover:translate-y-[-1px]"
                                disabled={busy_request_id === request.id}
                                onClick={() => void handle_submit_request(request, true)}
                                type="button"
                              >
                                <Zap className="h-4 w-4" />
                                强制覆盖
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {!pending_requests.length ? (
                        <div className="rounded-[24px] border border-dashed border-white/60 bg-white/24 px-4 py-5 text-sm leading-6 text-slate-700/58">
                          当前没有待处理动作，请观察时间线或继续通过控制面板推进 run。
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-white/60 bg-white/40 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                        注入消息
                      </p>
                      <div className="rounded-full bg-white/74 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700/56">
                        主持人
                      </div>
                    </div>
                    <div className="mt-3">
                      <select
                        className="neo-inset w-full rounded-[16px] px-3 py-2 text-sm text-slate-900/86 outline-none"
                        onChange={(event) => set_inject_channel_id(event.target.value)}
                        value={inject_channel_id}
                      >
                        <option value="">选择频道</option>
                        {detail.channels.map((channel) => (
                          <option key={channel.channel.id} value={channel.channel.id}>
                            {renderChannelName(channel.channel.slug, channel.channel.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      className="neo-inset mt-3 min-h-[112px] w-full resize-y rounded-[16px] px-3 py-2.5 text-sm leading-6 text-slate-900/86 outline-none"
                      onChange={(event) => set_inject_message(event.target.value)}
                      placeholder="给某个频道注入一条结构化主持信息或补充说明…"
                      value={inject_message}
                    />
                    <button
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                      disabled={!inject_channel_id || !inject_message.trim() || is_busy_control}
                      onClick={() => void handle_inject_message()}
                      type="button"
                    >
                      <Send className="h-4 w-4" />
                      发送注入消息
                    </button>
                  </section>

                  <section className="rounded-[24px] border border-white/60 bg-white/40 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700/48">
                        最近结算
                      </p>
                      <TimerReset className="h-4 w-4 text-slate-600/60" />
                    </div>
                    <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700/64">
                      <div>
                        <p className="font-semibold text-slate-950/84">夜晚</p>
                        <p>
                          {detail.run.state?.last_night_result?.deaths?.length
                            ? `淘汰成员：${detail.run.state.last_night_result.deaths.join(", ")}`
                            : "当前还没有可见的夜晚淘汰结果。"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950/84">投票</p>
                        <p>
                          {detail.run.state?.last_vote_result?.target
                            ? `投票淘汰：${detail.run.state.last_vote_result.target}`
                            : "当前还没有完成的公开投票。"}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
