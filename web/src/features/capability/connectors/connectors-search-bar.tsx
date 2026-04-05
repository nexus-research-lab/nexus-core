"use client";

import { Link2 } from "lucide-react";

import type { ConnectorController } from "@/hooks/use-connector-controller";
import { cn } from "@/lib/utils";
import { WorkspaceSearchInput } from "@/shared/ui/workspace/workspace-search-input";

/** 类别列表 */
const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "productivity", label: "效率工具" },
  { key: "social", label: "社交媒体" },
  { key: "ecommerce", label: "电商平台" },
  { key: "development", label: "开发工具" },
  { key: "business", label: "企业管理" },
  { key: "marketing", label: "营销分析" },
  { key: "automation", label: "自动化" },
];

const FILTER_CHIP_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full px-[0.82rem] py-[0.38rem] text-[12px] font-semibold transition-[background,color,box-shadow] duration-150";

interface ConnectorsSearchBarProps {
  ctrl: ConnectorController;
}

export function ConnectorsSearchBar({ ctrl }: ConnectorsSearchBarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3">
      {/* 搜索行 */}
      <div className="flex items-center gap-3">
        <WorkspaceSearchInput
          class_name="flex-1"
          on_change={ctrl.set_search_query}
          placeholder="搜索应用授权..."
          value={ctrl.search_query}
        />
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link2 className="h-3.5 w-3.5" />
          <span>{ctrl.connectors.length} 个应用授权</span>
        </div>
      </div>

      {/* 类别筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={cn(
              FILTER_CHIP_CLASS_NAME,
              ctrl.active_category === cat.key
                ? "chip-default text-slate-950/96"
                : "text-slate-500/84 hover:bg-white/40 hover:text-slate-950/94",
            )}
            onClick={() => ctrl.set_active_category(cat.key)}
            type="button"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
