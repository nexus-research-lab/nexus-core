/**
 * =====================================================
 * @File   : app-stage.tsx
 * @Date   : 2026-04-04 18:06
 * @Author : leemysw
 * 2026-04-04 18:06   Create
 * =====================================================
 */

"use client";

import { ReactNode } from "react";

import { HOME_PAGE_PADDING_CLASS } from "@/lib/home-layout";
import { SidebarWidePanel } from "@/shared/ui/sidebar/sidebar-wide-panel";

interface AppStageProps {
  children: ReactNode;
  /** 是否显示侧边栏（默认 true） */
  show_sidebar?: boolean;
}

export function AppStage({
  children,
  show_sidebar = true,
}: AppStageProps) {
  return (
    <main className="app-stage relative flex h-screen w-full overflow-hidden bg-background text-foreground">
      {show_sidebar ? <div className="relative z-10"><SidebarWidePanel /></div> : null}

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${HOME_PAGE_PADDING_CLASS}`}>{children}</div>
    </main>
  );
}
