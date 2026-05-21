import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  FilePenLine,
  FilePlus2,
  FileSearch,
  FileText,
  FolderOpen,
  Globe2,
  ListTree,
  Play,
  Search,
  Sparkles,
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OperationActionKind } from "../operation-tool-catalog";

export const ACTION_ICON: Record<OperationActionKind, LucideIcon> = {
  read: BookOpen,
  list: ListTree,
  search: FileSearch,
  create: FilePlus2,
  edit: FilePenLine,
  run: Play,
  stop: Square,
  web_search: Search,
  web_fetch: Globe2,
  skill: Sparkles,
  task: ClipboardList,
  task_progress: ClipboardList,
  plan: ClipboardList,
  question: CircleHelp,
  summary: FileText,
  generic: FolderOpen,
};

export const ACTION_TONE_CLASS: Record<OperationActionKind, string> = {
  read: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  list: "border-[rgba(79,162,159,0.22)] bg-[rgba(79,162,159,0.10)] text-[rgb(42,128,125)]",
  search: "border-[rgba(79,162,159,0.22)] bg-[rgba(79,162,159,0.10)] text-[rgb(42,128,125)]",
  create: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  edit: "border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.11)] text-[color:var(--warning)]",
  run: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  stop: "border-[rgba(223,93,98,0.24)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
  web_search: "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]",
  web_fetch: "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.10)] text-[color:var(--warning)]",
  skill: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  task: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  task_progress: "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)] text-[color:var(--primary)]",
  plan: "border-[rgba(117,131,149,0.22)] bg-white/70 text-(--text-muted)",
  question: "border-[rgba(223,157,46,0.26)] bg-[rgba(223,157,46,0.11)] text-[color:var(--warning)]",
  summary: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  generic: "border-(--divider-subtle-color) bg-white/70 text-(--text-muted)",
};
