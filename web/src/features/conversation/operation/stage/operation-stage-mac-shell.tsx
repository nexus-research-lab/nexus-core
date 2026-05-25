import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Battery,
  Command,
  Search,
  Wifi,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowKind, StageWindowState } from "../operation-desktop-types";
import { basename } from "../operation-scene-planner-helpers";
import {
  icon_for_artifact_path,
  icon_for_window_kind,
  stage_app_label_for_window_kind,
} from "./operation-stage-window-meta";

export function StageMacMenuBar({
  active_window,
}: {
  active_window: StageWindowState | null;
}) {
  const app_name = active_window ? stage_app_label_for_window_kind(active_window.kind) : "Nexus";
  const [current_time, set_current_time] = useState(() => new Date());
  const menu_items = useMemo(
    () => menu_items_for_window_kind(active_window?.kind ?? null),
    [active_window?.kind],
  );
  const time_label = useMemo(() => (
    new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(current_time)
  ), [current_time]);

  useEffect(() => {
    const interval = window.setInterval(() => set_current_time(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 z-40 flex h-8 items-center justify-between border-b border-white/58 bg-white/54 px-4 text-[11px] font-semibold text-(--text-strong) shadow-[0_1px_0_rgba(255,255,255,0.70),0_12px_34px_rgba(18,28,42,0.08)] backdrop-blur-2xl max-md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Apple className="h-3.5 w-3.5 shrink-0" />
        <span className="font-black">{app_name}</span>
        {menu_items.map((item) => (
          <span className="text-(--text-soft)" key={item}>{item}</span>
        ))}
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

function menu_items_for_window_kind(kind: StageWindowKind | null): string[] {
  if (kind === "browser") {
    return ["文件", "编辑", "显示", "历史记录", "书签", "窗口", "帮助"];
  }
  if (kind === "terminal" || kind === "runtime_handoff") {
    return ["Shell", "编辑", "显示", "窗口", "帮助"];
  }
  if (kind === "finder") {
    return ["文件", "编辑", "显示", "前往", "窗口", "帮助"];
  }
  if (kind === "permission_wait") {
    return ["隐私与安全", "显示", "账户", "窗口", "帮助"];
  }
  if (kind === "task_board") {
    return ["显示", "进程", "窗口", "帮助"];
  }
  if (kind === "run_manifest" || kind === "evidence") {
    return ["文件", "编辑", "日志", "显示", "窗口", "帮助"];
  }
  if (kind === "code_editor" || kind === "generic_tool") {
    return ["文件", "编辑", "选择", "查找", "运行", "终端", "帮助"];
  }
  if (kind === "spreadsheet") {
    return ["文件", "编辑", "插入", "表格", "排列", "窗口", "帮助"];
  }
  if (kind === "word_reader") {
    return ["文件", "编辑", "插入", "格式", "排列", "窗口", "帮助"];
  }
  if (kind === "markdown_reader" || kind === "pdf_reader" || kind === "image_viewer") {
    return ["文件", "编辑", "显示", "工具", "窗口", "帮助"];
  }
  if (kind === "summary") {
    return ["文件", "编辑", "格式", "显示", "窗口", "帮助"];
  }
  return ["文件", "编辑", "显示", "窗口", "帮助"];
}

export function StageDesktopIcons({
  on_restore,
  windows,
}: {
  on_restore: (window_id: string) => void;
  windows: StageWindowState[];
}) {
  const desktop_items = windows
    .filter(is_desktop_artifact_window)
    .slice(0, 5);

  if (!desktop_items.length) {
    return null;
  }

  return (
    <div className="absolute right-6 top-16 z-10 hidden grid-cols-1 gap-4 md:grid">
      {desktop_items.map((window) => {
        const target = window.target ?? window.payload.target ?? "";
        const Icon = window.kind === "browser" ? icon_for_window_kind(window.kind) : icon_for_artifact_path(target);
        const app_label = stage_app_label_for_window_kind(window.kind);
        const display_name = desktop_icon_label(window);
        const state_label = window.phase === "closed"
          ? "已关闭"
          : window.phase === "minimized"
            ? "已最小化"
            : window.phase === "focused"
              ? "正在使用"
              : "已打开";
        return (
          <button
            aria-label={`${window.phase === "closed" ? "重新打开" : "打开"} ${app_label}：${display_name}`}
            className="group flex w-[92px] flex-col items-center gap-1.5 text-center outline-none"
            key={window.id}
            onClick={() => on_restore(window.id)}
            title={`${display_name} · 用 ${app_label} 打开 · ${state_label}`}
            type="button"
          >
            <div className={cn(
              "relative grid h-12 w-12 place-items-center rounded-[15px] border border-white/62 bg-white/48 text-(--icon-default) shadow-[0_12px_30px_rgba(18,28,42,0.09)] backdrop-blur-xl transition group-hover:-translate-y-0.5 group-hover:bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-[rgba(91,114,255,0.38)]",
              window.phase === "focused" && "bg-[rgba(91,114,255,0.14)] text-[color:var(--primary)]",
              window.phase === "minimized" && "opacity-78",
              window.phase === "closed" && "opacity-62 grayscale-[0.22]",
            )}>
              <Icon className="h-5 w-5" />
              <span className={cn(
                "absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/72",
                window.phase === "closed"
                  ? "bg-[rgba(117,131,149,0.55)]"
                  : window.phase === "minimized"
                    ? "bg-[rgba(223,157,46,0.82)]"
                    : "bg-[rgba(47,184,132,0.72)]",
              )} />
            </div>
            <p className="line-clamp-2 rounded-[6px] px-1 text-[10px] font-semibold leading-4 text-(--text-strong) group-hover:bg-white/48">
              {display_name}
            </p>
            <span className="sr-only">{state_label}</span>
          </button>
        );
      })}
    </div>
  );
}

function is_desktop_artifact_window(window: StageWindowState): boolean {
  const target = window.target ?? window.payload.target;
  if (!target || basename(target) === "preview") {
    return false;
  }
  if (window.kind === "browser") {
    return true;
  }
  return (
    window.kind === "finder" ||
    window.kind === "code_editor" ||
    window.kind === "markdown_reader" ||
    window.kind === "word_reader" ||
    window.kind === "pdf_reader" ||
    window.kind === "spreadsheet" ||
    window.kind === "image_viewer"
  );
}

function desktop_icon_label(window: StageWindowState): string {
  const target_label = basename(window.target ?? window.payload.target);
  if (target_label && target_label !== "preview") {
    return target_label;
  }
  return window.title;
}
