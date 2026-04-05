/**
 * 通用可折叠分区
 *
 * 侧边栏面板中的统一 section 容器。
 * 布局：[▸ 标题 数量] ···· [操作按钮]
 * - count 紧跟标题右侧
 * - 操作按钮（+ / →）在最右边，固定宽度占位保证对齐
 */

import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { useI18n } from "@/shared/i18n/i18n-context";
import { useSidebarStore } from "@/store/sidebar";

const CONTEXT_MENU_CLASS_NAME =
  "fixed z-[9990] w-36 rounded-xl border border-slate-200/70 bg-white/95 py-1 shadow-[0_16px_32px_rgba(15,23,42,0.12)] backdrop-blur-[16px] animate-in fade-in zoom-in-95 duration-100";
const CONTEXT_MENU_ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-[background,color] duration-150";
const SIDEBAR_LIST_ITEM_CLASS_NAME =
  "group/item flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-[7px] text-left text-[12px] transition-[background,color,box-shadow] duration-150";
const SIDEBAR_SECTION_TRIGGER_CLASS_NAME =
  "flex flex-1 items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500/84 transition-colors duration-150 hover:text-slate-600/96";
const SIDEBAR_SECTION_ACTION_CLASS_NAME =
  "flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-[background,color] duration-150 hover:bg-white/40 hover:text-slate-600";

interface CollapsibleSectionProps {
  section_id: string;
  title: string;
  count?: number;
  /** 标题左侧图标 */
  icon?: ReactNode;
  children: React.ReactNode;
  /** 标题栏右侧操作按钮（+ / → 等），固定宽度占位 */
  on_action?: () => void;
  /** 操作按钮的 title 属性 */
  action_title?: string;
  /** 操作按钮内容 */
  action_icon?: ReactNode;
}

interface SidebarListItemProps {
  icon: ReactNode;
  label: string;
  meta?: string;
  is_active?: boolean;
  on_click: () => void;
  on_rename?: () => void;
  on_delete?: () => void;
}

export function SidebarListItem({
  icon,
  label,
  meta,
  is_active = false,
  on_click,
  on_rename,
  on_delete,
}: SidebarListItemProps) {
  const { t } = useI18n();
  const [menu_pos, set_menu_pos] = useState<{ x: number; y: number } | null>(null);

  const handle_context_menu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!on_rename && !on_delete) return;
    e.preventDefault();
    set_menu_pos({ x: e.clientX, y: e.clientY });
  }, [on_delete, on_rename]);

  const handle_more_click = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    set_menu_pos({ x: rect.right, y: rect.top });
  }, []);

  useEffect(() => {
    if (!menu_pos) return;
    const close = () => set_menu_pos(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu_pos]);

  const has_actions = Boolean(on_rename || on_delete);

  return (
    <>
      <button
        className={cn(
          SIDEBAR_LIST_ITEM_CLASS_NAME,
          is_active
            ? "chip-default font-medium text-slate-950/96"
            : "text-slate-700/90 hover:bg-white/34 hover:text-slate-950/96",
        )}
        onClick={on_click}
        onContextMenu={handle_context_menu}
        type="button"
      >
        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center text-slate-500">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {has_actions ? (
          <span
            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-slate-400 opacity-0 transition-all hover:text-slate-700 group-hover/item:opacity-100"
            onClick={handle_more_click}
            role="button"
            tabIndex={-1}
          >
            <MoreHorizontal className="h-3 w-3" />
          </span>
        ) : meta ? (
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-400">{meta}</span>
        ) : null}
      </button>

      {menu_pos ? createPortal(
        <div
          className={CONTEXT_MENU_CLASS_NAME}
          style={{ top: menu_pos.y, left: menu_pos.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {on_rename ? (
            <button
              className={cn(CONTEXT_MENU_ITEM_CLASS_NAME, "text-slate-700 hover:bg-slate-50/90")}
              onClick={() => {
                set_menu_pos(null);
                on_rename();
              }}
              type="button"
            >
              <Pencil className="h-3 w-3" />
              {t("home.rename")}
            </button>
          ) : null}

          {on_delete ? (
            <button
              className={cn(CONTEXT_MENU_ITEM_CLASS_NAME, "text-red-600 hover:bg-red-50/90")}
              onClick={() => {
                set_menu_pos(null);
                on_delete();
              }}
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              {t("common.delete")}
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </>
  );
}

export function CollapsibleSection({
  section_id,
  title,
  count,
  icon,
  children,
  on_action,
  action_title = "新建",
  action_icon,
}: CollapsibleSectionProps) {
  const is_collapsed = useSidebarStore(
    (s) => s.collapsed_sections[section_id] ?? false,
  );
  const toggle = useSidebarStore((s) => s.toggle_section);

  return (
    <section className="border-b glass-divider pb-1.5 last:border-b-0">
      <div className="group/section flex w-full items-center justify-between px-2.5 py-2">
        <button
          className={SIDEBAR_SECTION_TRIGGER_CLASS_NAME}
          onClick={() => toggle(section_id)}
          type="button"
        >
          {is_collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {icon ? <span className="flex items-center">{icon}</span> : null}
          <span>{title}</span>
          {typeof count === "number" ? (
            <span className="text-[10px] font-medium tabular-nums text-slate-400">{count}</span>
          ) : null}
        </button>

        {/* 右侧操作按钮，固定宽度占位保证对齐 */}
        {on_action ? (
          <button
            className={SIDEBAR_SECTION_ACTION_CLASS_NAME}
            onClick={(e) => { e.stopPropagation(); on_action(); }}
            title={action_title}
            type="button"
          >
            {action_icon}
          </button>
        ) : (
          <span className="flex h-5 w-5 shrink-0" />
        )}
      </div>

      {!is_collapsed ? (
        <div className="flex flex-col gap-0.5 pb-1.5">{children}</div>
      ) : null}
    </section>
  );
}
