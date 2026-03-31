/**
 * 通用可折叠分区
 *
 * 侧边栏面板中的统一 section 容器。
 * 布局：[▸ 标题 数量] ···· [操作按钮]
 * - count 紧跟标题右侧
 * - 操作按钮（+ / →）在最右边，固定宽度占位保证对齐
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { useSidebarStore } from "@/store/sidebar";

interface CollapsibleSectionProps {
  section_id: string;
  title: string;
  count: number;
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
    <section className="border-b border-white/10 pb-1">
      <div className="group/section flex w-full items-center justify-between px-2 py-2">
        <button
          className="flex flex-1 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-700"
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
          <span className="text-[10px] text-slate-400">{count}</span>
        </button>

        {/* 右侧操作按钮，固定宽度占位保证对齐 */}
        {on_action ? (
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/40 hover:text-slate-600"
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
        <div className="flex flex-col gap-0.5 pb-1">{children}</div>
      ) : null}
    </section>
  );
}
