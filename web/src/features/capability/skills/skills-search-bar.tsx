import { ChevronDown, Globe2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { WorkspacePillButton } from "@/shared/ui/workspace/workspace-pill-button";
import { WorkspaceSearchInput } from "@/shared/ui/workspace/workspace-search-input";

import type { SourceFilter, SkillMarketplaceController } from "@/hooks/use-skill-marketplace";
import { SOURCE_LABELS } from "@/hooks/use-skill-marketplace";

const FILTER_CHIP_CLASS_NAME =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-[0.82rem] py-[0.38rem] text-[12px] font-semibold transition-[background,color,box-shadow] duration-150";
const CONTEXT_MENU_CLASS_NAME =
  "absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/95 py-1 shadow-[0_16px_32px_rgba(15,23,42,0.12)] backdrop-blur-[16px]";
const CONTEXT_MENU_ITEM_CLASS_NAME =
  "flex w-full items-center px-3 py-2 text-[12px] font-medium transition-[background,color] duration-150";

interface SkillsSearchBarProps {
  ctrl: SkillMarketplaceController;
}

export function SkillsSearchBar({ ctrl }: SkillsSearchBarProps) {
  return (
    <div className="mb-5 space-y-3">
      {/* 搜索栏 + 模式切换 */}
      <div className="flex items-stretch gap-2">
        <WorkspaceSearchInput
          class_name="flex-1"
          on_change={(value) => {
            ctrl.set_search_query(value);
            if (ctrl.discovery_mode === "external") ctrl.set_external_query(value);
          }}
          placeholder={
            ctrl.discovery_mode === "catalog"
              ? "搜索技能名称、标签或场景..."
              : "搜索社区共享技能..."
          }
          value={ctrl.discovery_mode === "catalog" ? ctrl.search_query : ctrl.external_query}
        />

        {/* 模式切换胶囊 */}
        <div className="flex items-center gap-1">
          <WorkspacePillButton
            density="compact"
            onClick={() => ctrl.set_discovery_mode("catalog")}
            size="sm"
            variant={ctrl.discovery_mode === "catalog" ? "strong" : "default"}
          >
            库内技能
          </WorkspacePillButton>
          <WorkspacePillButton
            density="compact"
            onClick={() => ctrl.set_discovery_mode("external")}
            size="sm"
            variant={ctrl.discovery_mode === "external" ? "strong" : "default"}
          >
            社区技能
          </WorkspacePillButton>
          {ctrl.discovery_mode === "external" && (
            <WorkspacePillButton
              onClick={() => void ctrl.handle_external_search()}
              density="compact"
              size="sm"
              variant="strong"
            >
              <Globe2 className="h-3.5 w-3.5" />
              搜索
            </WorkspacePillButton>
          )}
        </div>
      </div>

      {/* 分类标签 + 过滤器 */}
      <div className="flex items-center justify-between gap-2">
        <div className="soft-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
          {ctrl.categories.map((cat) => (
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

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <WorkspacePillButton
              density="compact"
              onClick={() => ctrl.set_source_dropdown_open(!ctrl.source_dropdown_open)}
              size="sm"
              variant="default"
            >
              {SOURCE_LABELS[ctrl.source_filter]}
              <ChevronDown className="h-3 w-3" />
            </WorkspacePillButton>
            {ctrl.source_dropdown_open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => ctrl.set_source_dropdown_open(false)}
                />
                <div className={CONTEXT_MENU_CLASS_NAME}>
                  {(Object.keys(SOURCE_LABELS) as SourceFilter[]).map((key) => (
                    <button
                      key={key}
                      className={cn(
                        CONTEXT_MENU_ITEM_CLASS_NAME,
                        ctrl.source_filter === key
                          ? "bg-slate-100 text-slate-950"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        ctrl.set_source_filter(key);
                        ctrl.set_source_dropdown_open(false);
                      }}
                      type="button"
                    >
                      {SOURCE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
