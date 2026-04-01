/**
 * AgentOptions 左侧图标导航栏
 *
 * 垂直标签导航，强调配置分组与当前上下文
 */

"use client";

import { Palette, Brain, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tab 键值类型 */
export type TabKey = "identity" | "persona" | "skills" | "advanced";

/** 单个导航项配置 */
interface NavItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

/** 导航栏 Tab 配置列表 */
const NAV_ITEMS: NavItem[] = [
  { key: "identity", label: "Identity", icon: Palette },
  { key: "persona", label: "Persona", icon: Brain },
  { key: "skills", label: "Skills", icon: Sparkles },
  { key: "advanced", label: "Advanced", icon: Settings },
];

interface AgentOptionsNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

/** 左侧图标导航栏组件 */
export function AgentOptionsNav({ activeTab, onTabChange }: AgentOptionsNavProps) {
  return (
    <div className="flex w-52 flex-col border-r modal-divider bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] px-3 py-4">
      <div className="px-2 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Configure
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Agent 面板
        </p>
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            title={item.label}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all duration-200",
              isActive
                ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                : "text-slate-500 hover:bg-white/85 hover:text-slate-900"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400" />
            )}
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[12px]",
                isActive ? "bg-white/14 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
