import {
  ChevronDown,
  ChevronRight,
  Columns3,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HardDrive,
  List,
  Search,
  SquareStack,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import type { NexusOperationEvent } from "../operation-types";
import { PHASE_LABELS } from "../operation-tool-catalog";
import {
  finder_file_kind_label,
  finder_preview_lines,
  resolve_finder_selected_item,
} from "./finder-item-details";

type WorkspaceItemStatus = NonNullable<NonNullable<StageWindowState["payload"]["workspace_items"]>[number]["status"]>;

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
  const selected_path = active_path ?? event.target ?? display_items[0]?.path ?? "workspace";
  const selected_item = resolve_finder_selected_item(display_items, selected_path);
  const preview_lines = finder_preview_lines(selected_item);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f8fafc]">
      <div className="hidden w-36 shrink-0 border-r border-(--divider-subtle-color) bg-[#eef3f8]/88 p-2 text-[11px] font-semibold text-(--text-soft) sm:block">
        <FinderSidebarItem active icon={FolderOpen} label="工作区" />
        <FinderSidebarItem icon={Search} label="搜索" />
        <FinderSidebarItem icon={HardDrive} label="变更" />
        <div className="mt-4 px-2 text-[9px] font-black uppercase tracking-[0.14em] text-(--text-soft)">位置</div>
        <div className="mt-1 rounded-[9px] px-2 py-1.5 text-[10px] text-(--text-muted)">~/workspace</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-(--divider-subtle-color) bg-white/64 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FinderToolbarButton label="列表视图" active>
              <List className="h-3.5 w-3.5" />
            </FinderToolbarButton>
            <FinderToolbarButton label="分栏视图">
              <Columns3 className="h-3.5 w-3.5" />
            </FinderToolbarButton>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black text-(--text-strong)">工作区</p>
              <p className="truncate text-[10px] text-(--text-soft)">
                {display_items.length} 个文件 · {changed_count} 个变更
              </p>
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 items-center rounded-[8px] border border-(--divider-subtle-color) bg-white/72 px-2 py-1 text-[10px] text-(--text-soft) md:flex">
            <Search className="mr-1.5 h-3 w-3 shrink-0" />
            <span className="truncate">{active_path ?? event.target ?? "搜索工作区"}</span>
          </div>
          <FinderToolbarButton label="分组">
            <SquareStack className="h-3.5 w-3.5" />
          </FinderToolbarButton>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
            event.phase === "running"
              ? "bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
              : "bg-white/70 text-(--text-muted)",
          )}>
            {PHASE_LABELS[event.phase]}
          </span>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(160px,0.36fr)] max-md:grid-cols-1">
          <div className="soft-scrollbar min-h-0 overflow-auto p-2">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_86px] gap-2 px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-(--text-soft)">
              <span>名称</span>
              <span>状态</span>
              <span>修改时间</span>
            </div>
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
          <aside className="hidden min-h-0 border-l border-(--divider-subtle-color) bg-white/54 p-3 md:block">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-soft)">信息</p>
            <div className="mt-3 grid h-16 w-16 place-items-center rounded-[16px] border border-(--divider-subtle-color) bg-white/74 text-(--icon-default)">
              {(() => {
                const Icon = icon_for_workspace_path(selected_path);
                return <Icon className="h-7 w-7" />;
              })()}
            </div>
            <p className="mt-3 line-clamp-2 text-[12px] font-black text-(--text-strong)">
              {basename(selected_path)}
            </p>
            <p className="truncate text-[10px] text-(--text-soft)">
              {finder_file_kind_label(selected_path)}
            </p>
            <div className="mt-4 space-y-2 border-t border-(--divider-subtle-color) pt-3">
              <FinderInspectorRow label="状态" value={selected_item ? workspace_status_label(selected_item.status) : "未选择"} />
              <FinderInspectorRow label="位置" value={selected_path} />
              <FinderInspectorRow label="修改时间" value={selected_item ? format_workspace_time(selected_item.updated_at) : "--"} />
              <FinderInspectorRow label="版本" value={selected_item ? `v${selected_item.version}` : "--"} />
            </div>
            {preview_lines.length ? (
              <div className="mt-4 overflow-hidden rounded-[11px] border border-(--divider-subtle-color) bg-[#101820] p-2 font-mono text-[10px] leading-4 text-[#dce8ee]">
                {preview_lines.map((line, index) => (
                  <div className="flex min-w-0 gap-2" key={`${index}:${line}`}>
                    <span className="w-5 shrink-0 select-none text-right text-[#6f8190]">{index + 1}</span>
                    <span className="min-w-0 truncate">{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-[11px] border border-(--divider-subtle-color) bg-white/54 px-3 py-2 text-[10px] leading-4 text-(--text-soft)">
                {changed_count ? `${changed_count} 个变更待查看` : "没有新的文件变更"}
              </p>
            )}
          </aside>
        </div>
        <FinderPathBar
          changed_count={changed_count}
          item_count={display_items.length}
          path={selected_path}
        />
      </div>
    </div>
  );
}

function FinderInspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-(--text-soft)">{label}</p>
      <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-strong)" title={value}>{value}</p>
    </div>
  );
}

function FinderToolbarButton({
  active = false,
  children,
  label,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.32)]",
        active
          ? "border-(--divider-subtle-color) bg-white text-(--text-strong)"
          : "border-transparent bg-white/42 text-(--icon-muted) hover:bg-white/76 hover:text-(--text-strong)",
      )}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function FinderSidebarItem({
  active = false,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-[9px] px-2 py-1.5",
      active ? "bg-white/78 text-(--text-strong) shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]" : "text-(--text-soft)",
    )}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
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
  const Icon = type === "folder" ? FolderOpen : icon_for_workspace_path(path);
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_auto_minmax(0,1fr)_72px_86px] items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11px]",
        active ? "bg-[rgba(91,114,255,0.12)] text-[color:var(--primary)]" : "text-(--text-muted) hover:bg-white/70",
      )}
      title={path}
    >
      <span style={{ width: depth * 12 }} className="shrink-0" />
      {type === "folder" ? (
        <ChevronDown className="h-3 w-3 shrink-0 text-(--icon-muted)" />
      ) : (
        <span className="h-3 w-3 shrink-0" />
      )}
      <Icon className="h-3.5 w-3.5 shrink-0" />
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
          {workspace_status_label(status)}
        </span>
      ) : <span />}
      <span className="truncate text-[9px] text-(--text-soft)">
        {item ? format_workspace_time(item.updated_at) : "--"}
      </span>
    </div>
  );
}

function FinderPathBar({
  changed_count,
  item_count,
  path,
}: {
  changed_count: number;
  item_count: number;
  path: string;
}) {
  const parts = path.split("/").filter(Boolean);
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 border-t border-(--divider-subtle-color) bg-white/58 px-3 py-1.5 text-[10px] text-(--text-soft)">
      <div className="flex min-w-0 items-center gap-1.5">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-(--icon-muted)" />
        <span className="shrink-0 font-semibold text-(--text-strong)">workspace</span>
        {parts.map((part, index) => (
          <span className="flex min-w-0 items-center gap-1.5" key={`${index}:${part}`}>
            <ChevronRight className="h-3 w-3 shrink-0 text-(--icon-muted)" />
            <span className="max-w-[120px] truncate">{part}</span>
          </span>
        ))}
      </div>
      <span className="shrink-0">
        {item_count} 个项目 · {changed_count ? `${changed_count} 个变更` : "没有变更"}
      </span>
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

function workspace_status_label(status: WorkspaceItemStatus): string {
  if (status === "writing") {
    return "写入中";
  }
  if (status === "updated") {
    return "已更新";
  }
  if (status === "deleted") {
    return "已删除";
  }
  return "未变更";
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function icon_for_workspace_path(path: string): LucideIcon {
  if (/\.(tsx?|jsx?|json|ya?ml|toml|css|scss|html?)$/i.test(path)) {
    return FileCode2;
  }
  if (/\.(csv|xlsx?|ods)$/i.test(path)) {
    return FileSpreadsheet;
  }
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(path)) {
    return FileImage;
  }
  return FileText;
}

function format_workspace_time(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp));
}
