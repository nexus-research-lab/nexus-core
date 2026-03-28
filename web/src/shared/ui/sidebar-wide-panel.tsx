/**
 * 侧边栏右侧宽面板（240px，可收起）
 *
 * 对标 Slack 右侧宽面板：展示选中 Tab 的完整内容。
 * 根据 active_tab 切换不同的面板内容组件。
 *
 * Phase 1a：先渲染空容器 + Tab 标题，验证布局。
 * Phase 1b：填充各 Tab 的面板内容组件。
 */

import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
  type SidebarTabKey,
  type SidebarCollapseMode,
  derive_tab_from_path,
  useSidebarStore,
} from "@/store/sidebar";

import { HomePanelContent } from "./sidebar-panel-content/home-panel";
import { DmsPanelContent } from "./sidebar-panel-content/dms-panel";
import { ActivityPanelContent } from "./sidebar-panel-content/activity-panel";
import { CapabilitiesPanelContent } from "./sidebar-panel-content/capabilities-panel";
import { ContactsPanelContent } from "./sidebar-panel-content/contacts-panel";

/** Tab 标题映射 */
const TAB_TITLES: Record<SidebarTabKey, string> = {
  home: "工作台",
  dms: "私信",
  activity: "活动",
  capabilities: "能力",
  contacts: "成员",
};

/** 根据折叠模式判断是否显示宽面板 */
function should_show_panel(mode: SidebarCollapseMode): boolean {
  return mode === "full";
}

/** 根据激活 Tab 渲染对应的面板内容 */
function render_panel_content(tab: SidebarTabKey) {
  switch (tab) {
    case "home":
      return <HomePanelContent />;
    case "dms":
      return <DmsPanelContent />;
    case "activity":
      return <ActivityPanelContent />;
    case "capabilities":
      return <CapabilitiesPanelContent />;
    case "contacts":
      return <ContactsPanelContent />;
    default:
      return null;
  }
}

export function SidebarWidePanel() {
  const location = useLocation();
  const active_tab = useSidebarStore((s) => s.active_tab);
  const collapse_mode = useSidebarStore((s) => s.collapse_mode);

  const derived_tab = derive_tab_from_path(location.pathname);
  const current_tab = active_tab || derived_tab;

  // 折叠模式下不显示宽面板
  if (!should_show_panel(collapse_mode)) {
    return null;
  }

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col py-4 pl-0 pr-2">
      <div className="home-glass-panel radius-shell-xl flex h-full w-full flex-col overflow-hidden">
        {/* 面板头部 */}
        <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            {TAB_TITLES[current_tab]}
          </h2>
        </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {render_panel_content(current_tab)}
        </div>
      </div>
    </div>
  );
}
