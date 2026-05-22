import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OperationPhase, OperationSurface } from "../operation-types";

export const SURFACE_ACCENT_CLASS_NAME: Record<OperationSurface, string> = {
  workspace: "from-[rgba(91,114,255,0.24)] via-[rgba(91,114,255,0.12)] to-transparent",
  editor: "from-[rgba(79,162,159,0.24)] via-[rgba(79,162,159,0.12)] to-transparent",
  terminal: "from-[rgba(47,184,132,0.22)] via-[rgba(47,184,132,0.1)] to-transparent",
  web: "from-[rgba(223,157,46,0.22)] via-[rgba(223,157,46,0.1)] to-transparent",
  knowledge: "from-[rgba(91,114,255,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  task: "from-[rgba(223,157,46,0.2)] via-[rgba(91,114,255,0.1)] to-transparent",
  conversation: "from-[rgba(91,114,255,0.2)] via-[rgba(255,255,255,0.08)] to-transparent",
  summary: "from-[rgba(47,184,132,0.2)] via-[rgba(79,162,159,0.1)] to-transparent",
  fallback: "from-[rgba(117,131,149,0.18)] via-[rgba(255,255,255,0.08)] to-transparent",
};

export const SURFACE_LABEL: Record<OperationSurface, string> = {
  workspace: "工作区",
  editor: "编辑器",
  terminal: "终端",
  web: "浏览器",
  knowledge: "知识库",
  task: "任务",
  conversation: "运行时",
  summary: "交接",
  fallback: "操作",
};

export const PHASE_STATUS_META: Record<OperationPhase, {
  label: string;
  Icon: LucideIcon;
  class_name: string;
}> = {
  queued: {
    label: "排队中",
    Icon: Clock3,
    class_name: "border-white/60 bg-white/62 text-(--text-muted)",
  },
  running: {
    label: "执行中",
    Icon: Loader2,
    class_name: "border-[rgba(47,184,132,0.26)] bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]",
  },
  waiting: {
    label: "等待确认",
    Icon: ShieldQuestion,
    class_name: "border-[rgba(223,157,46,0.30)] bg-[rgba(223,157,46,0.14)] text-[color:var(--warning)]",
  },
  done: {
    label: "已完成",
    Icon: CheckCircle2,
    class_name: "border-[rgba(47,184,132,0.24)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
  },
  error: {
    label: "失败",
    Icon: AlertTriangle,
    class_name: "border-[rgba(223,93,98,0.28)] bg-[rgba(223,93,98,0.12)] text-[color:var(--destructive)]",
  },
  cancelled: {
    label: "已中断",
    Icon: XCircle,
    class_name: "border-white/60 bg-white/62 text-(--text-muted)",
  },
};
