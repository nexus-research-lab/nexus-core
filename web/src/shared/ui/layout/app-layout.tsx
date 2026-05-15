/**
 * 应用布局路由组件
 *
 * 使用 React Router <Outlet /> 渲染子路由内容。
 * 侧边栏直接挂在路由布局层，避免路由切换时被卸载/重新挂载。
 *
 * show_sidebar=false 用于 LauncherPage 等不需要侧边栏的页面。
 */

import { Outlet } from "react-router-dom";

import { HOME_PAGE_PADDING_CLASS } from "@/lib/layout/home-layout";
import { cn } from "@/lib/utils";
import { SidebarWidePanel } from "@/shared/ui/sidebar/sidebar-wide-panel";
import { useSidebarStore } from "@/store/sidebar";

export function AppLayout({ show_sidebar = true }: { show_sidebar?: boolean }) {
  const is_sidebar_suppressed = useSidebarStore((state) => state.is_wide_panel_suppressed);

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-transparent text-foreground">
      {show_sidebar ? (
        <div
          aria-hidden={is_sidebar_suppressed}
          className={cn(
            "relative h-full shrink-0 overflow-hidden transition-[width,opacity,filter] duration-300 ease-out",
            is_sidebar_suppressed && "pointer-events-none opacity-0 blur-[2px]",
          )}
          inert={is_sidebar_suppressed}
          style={{ width: is_sidebar_suppressed ? 0 : undefined }}
        >
          <SidebarWidePanel />
        </div>
      ) : null}
      <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", HOME_PAGE_PADDING_CLASS)}>
        <Outlet />
      </div>
    </main>
  );
}
