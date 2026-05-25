export interface StageWindowTitlebarState {
  aria_label: string;
  close_label: string;
  minimize_label: string;
  status_label: string;
  title_label: string;
  zoom_label: string;
  zoom_title: string;
}

export function build_stage_window_titlebar_state({
  app_label,
  focused,
  maximized,
  minimized,
  title,
}: {
  app_label?: string | null;
  focused: boolean;
  maximized: boolean;
  minimized: boolean;
  title: string;
}): StageWindowTitlebarState {
  const title_label = app_label ? `${app_label} · ${title}` : title;
  return {
    aria_label: app_label ? `${app_label} window: ${title}` : title,
    close_label: `关闭 ${title}`,
    minimize_label: `最小化 ${title}`,
    status_label: minimized ? "已最小化" : focused ? "前台" : "后台",
    title_label,
    zoom_label: `${maximized ? "还原" : "缩放"} ${title}`,
    zoom_title: maximized ? "还原窗口" : "缩放窗口",
  };
}
