/**
 * 无侧边栏的应用布局路由组件
 *
 * 用于 LauncherPage 等不需要侧边栏的页面。
 * 使用 AppStage(show_sidebar=false) + <Outlet />。
 */

import { Outlet } from "react-router-dom";

import { AppStage } from "./app-stage";

export function AppLayoutNoSidebar() {
  return (
    <AppStage show_sidebar={false}>
      <Outlet />
    </AppStage>
  );
}
