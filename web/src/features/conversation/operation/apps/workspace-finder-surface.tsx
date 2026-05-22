import {
  FileText,
  FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent } from "../operation-types";
import { PHASE_LABELS } from "../operation-tool-catalog";

export function WorkspaceFinder({
  active_path,
  event,
  items,
}: {
  active_path?: string | null;
  event: NexusOperationEvent;
  items: NonNullable<StageWindowState["payload"]["workspace_items"]>;
}) {
  const display_items = items.length
    ? items
    : [{
      id: "empty",
      path: active_path ?? event.target ?? "workspace",
      status: event.phase === "running" ? "writing" as const : "idle" as const,
      updated_at: event.updated_at,
      agent_id: event.agent_id,
      version: 1,
      source: "unknown" as const,
      event_type: "file_write_end" as const,
    }];
  const changed_count = display_items.filter((item) => item.status === "updated" || item.status === "writing").length;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-[13px] border border-(--divider-subtle-color) bg-white/72">
      <div className="hidden w-24 shrink-0 border-r border-(--divider-subtle-color) bg-[#f4f7fb] p-2 text-[10px] font-bold text-(--text-soft) sm:block">
        <div className="rounded-[9px] bg-white/70 px-2 py-2 text-(--text-strong)">文件</div>
        <div className="mt-1 rounded-[9px] px-2 py-2">搜索</div>
        <div className="mt-1 rounded-[9px] px-2 py-2">变更</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black text-(--text-strong)">工作区</p>
            <p className="truncate text-[10px] text-(--text-soft)">
              {display_items.length} 个文件 · {changed_count} 个变更
            </p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
            event.phase === "running"
              ? "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
              : "bg-white/70 text-(--text-muted)",
          )}>
            {PHASE_LABELS[event.phase]}
          </span>
        </div>
        <div className="soft-scrollbar max-h-[calc(100%-48px)] overflow-auto p-2">
          {workspace_tree_rows(display_items.map((item) => item.path)).map((row) => (
            <WorkspaceTreeRow
              active={row.path === active_path}
              depth={row.depth}
              item={display_items.find((item) => item.path === row.path)}
              key={row.path}
              label={row.label}
              path={row.path}
              type={row.type}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceTreeRow({
  active,
  depth,
  item,
  label,
  path,
  type,
}: {
  active: boolean;
  depth: number;
  item?: NonNullable<StageWindowState["payload"]["workspace_items"]>[number];
  label: string;
  path: string;
  type: "folder" | "file";
}) {
  const status = item?.status;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11px]",
        active ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]" : "text-(--text-muted) hover:bg-white/70",
      )}
      title={path}
    >
      <span style={{ width: depth * 12 }} className="shrink-0" />
      {type === "folder" ? (
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className={cn("min-w-0 flex-1 truncate", type === "folder" && "font-bold text-(--text-strong)")}>
        {label}
      </span>
      {status ? (
        <span className={cn(
          "shrink-0 rounded px-1.5 py-px text-[9px] font-bold",
          status === "writing" && "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]",
          status === "updated" && "bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          status === "deleted" && "bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
          status === "idle" && "bg-white/70 text-(--text-soft)",
        )}>
          {status}
        </span>
      ) : null}
    </div>
  );
}

function workspace_tree_rows(paths: string[]): Array<{
  depth: number;
  label: string;
  path: string;
  type: "folder" | "file";
}> {
  const rows = new Map<string, { depth: number; label: string; path: string; type: "folder" | "file" }>();
  paths.forEach((path) => {
    const parts = path.split("/").filter(Boolean);
    parts.forEach((part, index) => {
      const current_path = parts.slice(0, index + 1).join("/");
      if (!rows.has(current_path)) {
        rows.set(current_path, {
          depth: index,
          label: part,
          path: current_path,
          type: index === parts.length - 1 ? "file" : "folder",
        });
      }
    });
  });
  return Array.from(rows.values()).sort((left, right) => {
    if (left.path === right.path) {
      return 0;
    }
    const left_parent = left.path.split("/").slice(0, -1).join("/");
    const right_parent = right.path.split("/").slice(0, -1).join("/");
    if (left_parent === right_parent && left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }
    return left.path.localeCompare(right.path);
  });
}
