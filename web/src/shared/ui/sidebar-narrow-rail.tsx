/**
 * 侧边栏左侧窄栏（88px）
 *
 * 对标 Slack 窄栏：Tab 选择器（工作模式切换）。
 * 每个 Tab 代表一种工作模式，点击切换右侧宽面板内容。
 *
 * Phase 1a：Tab 仍指向现有路由，验证布局不崩。
 */

import {
  Activity,
  Bell,
  Home,
  MessageCircleMore,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { AppRouteBuilders } from "@/app/router/route-paths";
import { cn } from "@/lib/utils";
import {
  type SidebarTabKey,
  derive_tab_from_path,
  useSidebarStore,
} from "@/store/sidebar";

/** Tab 定义 */
interface TabDef {
  key: SidebarTabKey;
  label: string;
  to: string;
  icon: typeof Home;
  /** 是否显示未读红点 */
  show_badge?: boolean;
}

/** Phase 1a：沿用现有路由，Tab 映射保持兼容 */
const TAB_ITEMS: TabDef[] = [
  {
    key: "home",
    label: "Home",
    to: AppRouteBuilders.launcher(),
    icon: Home,
  },
  {
    key: "dms",
    label: "DMs",
    to: AppRouteBuilders.dm_directory(),
    icon: MessageCircleMore,
  },
  {
    key: "activity",
    label: "Activity",
    // Phase 1a：Activity 指向 / 占位，Phase 2 改为 /activity
    to: AppRouteBuilders.launcher(),
    icon: Bell,
    show_badge: false,
  },
  {
    key: "capabilities",
    label: "能力",
    to: AppRouteBuilders.skills(),
    icon: Sparkles,
  },
  {
    key: "contacts",
    label: "Contacts",
    to: AppRouteBuilders.contacts(),
    icon: Users,
  },
];

export function SidebarNarrowRail() {
  const location = useLocation();
  const active_tab = useSidebarStore((s) => s.active_tab);
  const set_active_tab = useSidebarStore((s) => s.set_active_tab);

  // 根据当前路由推导激活的 Tab
  const derived_tab = derive_tab_from_path(location.pathname);
  const current_tab = active_tab || derived_tab;

  return (
    <aside className="flex h-full w-[88px] shrink-0 flex-col px-2 py-4">
      <div className="home-glass-panel radius-shell-xl flex h-full w-full flex-col items-center px-2 py-4">
        {/* Logo — 点击回到 Launcher */}
        <Link
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(233,229,223,0.92))] text-lg font-black tracking-[-0.06em] text-slate-900 shadow-[0_14px_26px_rgba(102,112,145,0.14)] transition-transform duration-200 hover:scale-105"
          to={AppRouteBuilders.launcher()}
          title="回到 Launcher"
        >
          N
        </Link>

        {/* Tab 列表 */}
        <nav className="flex w-full flex-1 flex-col items-center gap-2">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const is_active = tab.key === current_tab;

            return (
              <Link
                key={tab.key}
                aria-current={is_active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-[11px] font-semibold tracking-[0.01em] transition-all duration-300",
                  is_active
                    ? "workspace-card-strong text-slate-950 shadow-[0_16px_30px_rgba(102,112,145,0.14)]"
                    : "text-slate-600 hover:bg-white/30 hover:text-slate-900",
                )}
                to={tab.to}
                onClick={() => set_active_tab(tab.key)}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-[14px] transition-all duration-300",
                    is_active
                      ? "bg-white/70 text-slate-900"
                      : "bg-white/30 text-slate-600 group-hover:bg-white/48 group-hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span>{tab.label}</span>

                {/* 未读红点 */}
                {tab.show_badge ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </Link>
            );
          })}

          {/* More 按钮 */}
          <button
            className="group flex w-full flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-[11px] font-semibold tracking-[0.01em] text-slate-600 transition-all duration-300 hover:bg-white/30 hover:text-slate-900"
            title="更多"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/30 text-slate-600 transition-all duration-300 group-hover:bg-white/48 group-hover:text-slate-900">
              <MoreHorizontal className="h-4.5 w-4.5" />
            </div>
            <span>More</span>
          </button>
        </nav>

        {/* 底部固定区域 */}
        <div className="mt-4 flex flex-col items-center gap-3">
          {/* [+] 新建按钮 */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-slate-700 shadow-[0_8px_18px_rgba(102,112,145,0.10)] transition-all duration-200 hover:bg-white/60 hover:shadow-[0_12px_24px_rgba(102,112,145,0.14)]"
            title="新建"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>

          {/* 用户头像 */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(231,228,223,0.94))] text-sm font-bold text-slate-800 shadow-[0_12px_24px_rgba(102,112,145,0.12)] transition-transform duration-200 hover:scale-105"
            title="设置"
          >
            AG
          </button>
        </div>
      </div>
    </aside>
  );
}
