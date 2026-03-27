"use client";

import { Plus } from "lucide-react";

import { WorkspaceSidebarItem } from "@/shared/ui/workspace-sidebar-item";
import { WorkspaceSidebarShell } from "@/shared/ui/workspace-sidebar-shell";

import { ContactsFilterKey } from "./contacts-directory-helpers";

interface ContactsFilterItem {
  key: ContactsFilterKey;
  label: string;
  count: number;
  dot_class_name?: string;
}

interface ContactsFilterSection {
  title: string;
  items: ContactsFilterItem[];
}

interface ContactsFilterSidebarProps {
  sections: ContactsFilterSection[];
  active_filter: ContactsFilterKey;
  total_count: number;
  on_change_filter: (filter: ContactsFilterKey) => void;
  on_create_agent: () => void;
}

export function ContactsFilterSidebar({
  sections,
  active_filter,
  total_count,
  on_change_filter,
  on_create_agent,
}: ContactsFilterSidebarProps) {
  return (
    <WorkspaceSidebarShell
      class_name="w-[248px]"
      header_action={(
        <button
          className="workspace-chip inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-900/82 transition hover:text-slate-950"
          onClick={on_create_agent}
          title="新建成员"
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
      subtitle={`${total_count} 个成员`}
      title="成员网络"
    >
      {sections.map((section) => (
        <div key={section.title} className="px-1 py-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500/86">
            {section.title}
          </p>
          <div className="mt-2 space-y-1.5">
            {section.items.map((item) => (
              <WorkspaceSidebarItem
                key={item.key}
                class_name="shadow-none"
                icon={item.dot_class_name ? <span className={`h-2.5 w-2.5 rounded-full ${item.dot_class_name}`} /> : undefined}
                icon_mode="plain"
                is_active={active_filter === item.key}
                on_click={() => on_change_filter(item.key)}
                size="compact"
                title={item.label}
                trailing={item.count}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="px-1 pt-3">
        <button
          className="workspace-chip inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-slate-900/84 transition hover:text-slate-950"
          onClick={on_create_agent}
          type="button"
        >
          新建成员
        </button>
      </div>
    </WorkspaceSidebarShell>
  );
}
