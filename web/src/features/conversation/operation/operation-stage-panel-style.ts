import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  FolderTree,
  Globe2,
  Loader2,
  MessageSquare,
  ShieldQuestion,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OperationPhase, OperationSurface } from "./operation-types";

export interface SurfaceMeta {
  label: string;
  Icon: LucideIcon;
  accent_class_name: string;
}

export interface PhaseMeta {
  label: string;
  Icon: LucideIcon;
  class_name: string;
}

export const SURFACE_META: Record<OperationSurface, SurfaceMeta> = {
  workspace: {
    label: "工作区",
    Icon: FolderTree,
    accent_class_name: "from-[rgba(91,114,255,0.24)] via-[rgba(91,114,255,0.12)] to-transparent",
  },
  editor: {
    label: "编辑器",
    Icon: Code2,
    accent_class_name: "from-[rgba(79,162,159,0.24)] via-[rgba(79,162,159,0.12)] to-transparent",
  },
  terminal: {
    label: "终端",
    Icon: Terminal,
    accent_class_name: "from-[rgba(47,184,132,0.22)] via-[rgba(47,184,132,0.1)] to-transparent",
  },
  web: {
    label: "浏览器",
    Icon: Globe2,
    accent_class_name: "from-[rgba(223,157,46,0.22)] via-[rgba(223,157,46,0.1)] to-transparent",
  },
  knowledge: {
    label: "知识库",
    Icon: FileText,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  task: {
    label: "任务",
    Icon: Activity,
    accent_class_name: "from-[rgba(223,157,46,0.2)] via-[rgba(91,114,255,0.1)] to-transparent",
  },
  conversation: {
    label: "运行时",
    Icon: MessageSquare,
    accent_class_name: "from-[rgba(91,114,255,0.2)] via-[rgba(255,255,255,0.08)] to-transparent",
  },
  summary: {
    label: "交接",
    Icon: CheckCircle2,
    accent_class_name: "from-[rgba(47,184,132,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  },
  fallback: {
    label: "操作",
    Icon: Sparkles,
    accent_class_name: "from-[rgba(117,131,149,0.18)] via-[rgba(255,255,255,0.08)] to-transparent",
  },
};

export const PHASE_META: Record<OperationPhase, PhaseMeta> = {
  queued: {
    label: "排队中",
    Icon: Clock3,
    class_name: "chip-pill text-(--text-muted)",
  },
  running: {
    label: "执行中",
    Icon: Loader2,
    class_name: "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  },
  waiting: {
    label: "等待确认",
    Icon: ShieldQuestion,
    class_name: "border-[rgba(223,157,46,0.28)] bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]",
  },
  done: {
    label: "已完成",
    Icon: CheckCircle2,
    class_name: "border-[rgba(47,184,132,0.22)] bg-[rgba(47,184,132,0.09)] text-[color:var(--success)]",
  },
  error: {
    label: "失败",
    Icon: AlertTriangle,
    class_name: "border-[rgba(223,93,98,0.26)] bg-[rgba(223,93,98,0.10)] text-[color:var(--destructive)]",
  },
  cancelled: {
    label: "已中断",
    Icon: XCircle,
    class_name: "chip-pill text-(--text-muted)",
  },
};
