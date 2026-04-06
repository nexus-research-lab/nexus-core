import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { SOURCE_LABELS } from "@/hooks/use-skill-marketplace";
import { WorkspacePillButton } from "@/shared/ui/workspace/workspace-pill-button";
import { WorkspaceSearchInput } from "@/shared/ui/workspace/workspace-search-input";

import type { SkillMarketplaceController, SourceFilter } from "@/hooks/use-skill-marketplace";

const CONTEXT_MENU_CLASS_NAME =
  "absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-[16px] border border-[var(--surface-popover-border)] bg-[var(--surface-popover-background)] py-1.5 shadow-[var(--surface-popover-shadow)] backdrop-blur-[18px]";
const CONTEXT_MENU_ITEM_CLASS_NAME =
  "flex w-full items-center rounded-[10px] px-3 py-2 text-[12px] font-medium transition-[background,color] duration-150";

interface SkillsSearchBarProps {
  ctrl: SkillMarketplaceController;
}

export function SkillsSearchBar({ ctrl }: SkillsSearchBarProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
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
        <WorkspacePillButton
          class_name="w-[76px] justify-center"
          density="compact"
          onClick={() =>
            void (
              ctrl.discovery_mode === "external"
                ? ctrl.handle_external_search()
                : ctrl.handle_catalog_search()
            )}
          size="sm"
          variant="outlined"
        >
          <Globe2 className="h-3.5 w-3.5" />
          搜索
        </WorkspacePillButton>
      </div>

      {ctrl.discovery_mode === "catalog" ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {ctrl.categories.map((category) => {
              const is_active = ctrl.active_category === category.key;
              return (
                <button
                  key={category.key}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-[background,border-color,color] duration-150",
                    is_active
                      ? "border-[var(--surface-interactive-active-border)] bg-[var(--surface-interactive-active-background)] text-[color:var(--text-strong)]"
                      : "border-transparent text-[color:var(--text-default)] hover:border-[var(--surface-interactive-hover-border)] hover:bg-[var(--surface-interactive-hover-background)] hover:text-[color:var(--text-strong)]",
                  )}
                  onClick={() => ctrl.set_active_category(category.key)}
                  type="button"
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0">
            <WorkspacePillButton
              density="compact"
              onClick={() => ctrl.set_source_dropdown_open(!ctrl.source_dropdown_open)}
              size="sm"
              variant="outlined"
            >
              {SOURCE_LABELS[ctrl.source_filter]}
              <span className="ml-0.5 text-[10px]">▾</span>
            </WorkspacePillButton>

            {ctrl.source_dropdown_open ? (
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
                          ? "bg-[var(--surface-interactive-active-background)] text-[color:var(--text-strong)]"
                          : "text-[color:var(--text-default)] hover:bg-[var(--surface-interactive-hover-background)]",
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
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
