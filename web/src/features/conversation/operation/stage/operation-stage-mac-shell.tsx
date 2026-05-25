import {
  Apple,
  Battery,
  Command,
  Search,
  Wifi,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent } from "../operation-types";
import {
  icon_for_window_kind,
  stage_app_label_for_window_kind,
} from "./operation-stage-window-meta";

export function StageMacMenuBar({
  active_window,
  event,
}: {
  active_window: StageWindowState | null;
  event: NexusOperationEvent;
}) {
  const app_name = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";
  const time_label = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.updated_at));

  return (
    <div className="absolute inset-x-3 top-3 z-40 flex h-9 items-center justify-between rounded-[14px] border border-white/62 bg-white/52 px-3 text-[11px] font-semibold text-(--text-strong) shadow-[0_14px_36px_rgba(18,28,42,0.10)] backdrop-blur-2xl max-md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Apple className="h-3.5 w-3.5 shrink-0" />
        <span className="font-black">{app_name}</span>
        <span className="text-(--text-soft)">文件</span>
        <span className="text-(--text-soft)">编辑</span>
        <span className="text-(--text-soft)">显示</span>
        <span className="text-(--text-soft)">窗口</span>
        <span className="text-(--text-soft)">帮助</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-(--text-soft)">
        <Search className="h-3.5 w-3.5" />
        <Command className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <Battery className="h-3.5 w-3.5" />
        <span className="font-mono text-[11px] text-(--text-strong)">{time_label}</span>
      </div>
    </div>
  );
}

export function StageDesktopIcons({
  on_restore,
  windows,
}: {
  on_restore: (window_id: string) => void;
  windows: StageWindowState[];
}) {
  const desktop_items = windows
    .filter((window) => window.kind !== "runtime_handoff" && window.kind !== "evidence" && window.phase !== "closed")
    .slice(0, 4);

  if (!desktop_items.length) {
    return null;
  }

  return (
    <div className="absolute right-6 top-16 z-10 hidden grid-cols-1 gap-4 md:grid">
      {desktop_items.map((window) => {
        const Icon = icon_for_window_kind(window.kind);
        const app_label = stage_app_label_for_window_kind(window.kind);
        return (
          <button
            aria-label={`打开 ${app_label}：${window.title}`}
            className="group flex w-[92px] flex-col items-center gap-1.5 text-center outline-none"
            key={window.id}
            onClick={() => on_restore(window.id)}
            title={`${app_label} · ${window.title}`}
            type="button"
          >
            <div className={cn(
              "grid h-12 w-12 place-items-center rounded-[15px] border border-white/62 bg-white/48 text-(--icon-default) shadow-[0_12px_30px_rgba(18,28,42,0.09)] backdrop-blur-xl transition group-hover:-translate-y-0.5 group-hover:bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-[rgba(91,114,255,0.38)]",
              window.phase === "focused" && "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]",
              window.phase === "minimized" && "opacity-70",
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="line-clamp-2 text-[10px] font-semibold leading-4 text-(--text-strong)">
              {window.title}
            </p>
          </button>
        );
      })}
    </div>
  );
}
