/**
 * Activity 面板内容
 *
 * 侧边栏活动通知列表。
 * 使用 CollapsibleSection 按"未读 / 已读"分组，
 * 条目风格与 home-panel / contacts-panel 保持一致。
 */

import {
  Bell,
  Bot,
  CheckCircle,
  Hash,
  Loader2,
  MessageCircle,
  MessageSquare,
  Package,
  XCircle,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppRouteBuilders } from "@/app/router/route-paths";
import { getActivityEvents, getUnreadActivityCount, markActivityAsRead } from "@/lib/activity-api";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "@/shared/ui/sidebar/collapsible-section";
import { useSidebarStore } from "@/store/sidebar";
import { ActivityEvent } from "@/types/activity";

// ─── 图标映射 ──────────────────────────────────────────────────────────────────

function get_event_icon(event_type: string) {
  switch (event_type) {
    case "agent_created":
    case "agent_updated":
      return <Bot className="h-3.5 w-3.5" />;
    case "room_created":
    case "room_message":
      return <Hash className="h-3.5 w-3.5" />;
    case "dm_message":
      return <MessageCircle className="h-3.5 w-3.5" />;
    case "skill_installed":
    case "skill_uninstalled":
      return <Package className="h-3.5 w-3.5" />;
    case "task_completed":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "task_failed":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

function get_action_url(event: ActivityEvent): string | undefined {
  if (event.target_type === "room" && event.target_id) {
    return AppRouteBuilders.room(event.target_id);
  }
  if (event.target_type === "agent" && event.target_id) {
    return AppRouteBuilders.contact_profile(event.target_id);
  }
}

function format_time(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── 单条活动 ──────────────────────────────────────────────────────────────────

const ActivityRow = memo(function ActivityRow({
  event,
  on_mark_read,
}: {
  event: ActivityEvent;
  on_mark_read: (id: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const active_item_id = useSidebarStore((s) => s.active_panel_item_id);
  const set_active_item = useSidebarStore((s) => s.set_active_panel_item);
  const [marking, set_marking] = useState(false);

  const is_read = Boolean(event.metadata_json?.read);
  const action_url = get_action_url(event);
  const is_active = active_item_id === event.id;

  const handle_click = useCallback(() => {
    if (!action_url) return;
    set_active_item(event.id);
    navigate(action_url);
  }, [action_url, event.id, navigate, set_active_item]);

  const handle_mark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (is_read || marking) return;
    set_marking(true);
    try {
      await on_mark_read(event.id);
    } finally {
      set_marking(false);
    }
  }, [event.id, is_read, marking, on_mark_read]);

  return (
    <button
      className={cn(
        "group/item flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150",
        is_active
          ? "bg-white/60 shadow-sm"
          : "hover:bg-white/30",
        is_read && "opacity-50",
      )}
      onClick={handle_click}
      type="button"
    >
      {/* 图标 */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/60 text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        {get_event_icon(event.event_type)}
      </div>

      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-[12px] leading-4",
          is_read ? "font-normal text-slate-500" : "font-medium text-slate-700",
        )}>
          {event.summary || "系统活动"}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{format_time(event.created_at)}</p>
      </div>

      {/* 未读圆点 / 已读按钮 */}
      {!is_read ? (
        <div className="flex shrink-0 items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 group-hover/item:hidden" />
          <button
            aria-label="标记已读"
            className="hidden rounded p-0.5 text-slate-400 transition-colors hover:bg-white/50 hover:text-slate-600 group-hover/item:flex"
            disabled={marking}
            onClick={handle_mark}
            type="button"
          >
            {marking
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <CheckCircle className="h-3 w-3" />}
          </button>
        </div>
      ) : null}

      {/* 时间（已读时显示） */}
      {is_read ? (
        <span className="shrink-0 text-[10px] text-slate-400">
          <MessageSquare className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
});

// ─── 面板主体 ──────────────────────────────────────────────────────────────────

export const ActivityPanelContent = memo(function ActivityPanelContent() {
  const [events, set_events] = useState<ActivityEvent[]>([]);
  const [unread_count, set_unread_count] = useState(0);
  const [is_loading, set_is_loading] = useState(true);

  const load = useCallback(async () => {
    set_is_loading(true);
    try {
      const [loaded, count] = await Promise.all([
        getActivityEvents({ limit: 50 }),
        getUnreadActivityCount(),
      ]);
      set_events(loaded);
      set_unread_count(count);
    } catch (err) {
      console.error("Failed to load activity events:", err);
    } finally {
      set_is_loading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handle_mark_read = useCallback(async (id: string) => {
    await markActivityAsRead([id]);
    set_events((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, metadata_json: { ...(e.metadata_json ?? {}), read: true } }
          : e,
      ),
    );
    set_unread_count((prev) => Math.max(0, prev - 1));
  }, []);

  const handle_mark_all_read = useCallback(async () => {
    const ids = events.filter((e) => !e.metadata_json?.read).map((e) => e.id);
    if (ids.length === 0) return;
    await markActivityAsRead(ids);
    set_events((prev) =>
      prev.map((e) => ({ ...e, metadata_json: { ...(e.metadata_json ?? {}), read: true } })),
    );
    set_unread_count(0);
  }, [events]);

  const { unread_events, read_events } = useMemo(() => ({
    unread_events: events.filter((e) => !e.metadata_json?.read),
    read_events: events.filter((e) => e.metadata_json?.read),
  }), [events]);

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400/60" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Bell className="h-5 w-5 text-slate-300" />
        <p className="text-[11px] text-slate-400">暂无活动</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <CollapsibleSection
        count={unread_count}
        on_action={unread_count > 0 ? handle_mark_all_read : undefined}
        action_title="全部已读"
        section_id="activity-unread"
        title="未读"
      >
        {unread_events.length > 0 ? (
          unread_events.map((event) => (
            <ActivityRow key={event.id} event={event} on_mark_read={handle_mark_read} />
          ))
        ) : (
          <p className="py-3 text-center text-[11px] text-slate-400">没有未读</p>
        )}
      </CollapsibleSection>

      {read_events.length > 0 ? (
        <CollapsibleSection
          count={read_events.length}
          section_id="activity-read"
          title="已读"
        >
          {read_events.map((event) => (
            <ActivityRow key={event.id} event={event} on_mark_read={handle_mark_read} />
          ))}
        </CollapsibleSection>
      ) : null}
    </div>
  );
});
