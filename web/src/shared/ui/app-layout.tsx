/**
 * 应用布局路由组件
 *
 * 将 AppStage（侧边栏 + 背景）提升到路由层级，
 * 使用 React Router <Outlet /> 渲染子路由内容。
 * 这样路由切换时侧边栏不会被卸载/重新挂载，避免 DMs 列表等数据闪烁。
 */

import { Outlet } from "react-router-dom";

import { AppStage } from "./app-stage";

export function AppLayout() {
  return (
    <AppStage>
      <Outlet />
    </AppStage>
  );
}
