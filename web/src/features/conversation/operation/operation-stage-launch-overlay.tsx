import {
  ArrowRight,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { NexusOperationEvent } from "./operation-types";
import {
  PHASE_META,
} from "./operation-stage-panel-style";
import {
  surface_meta_for_transition,
} from "./operation-stage-transition";
import type { StageTransitionIntent } from "./operation-stage-transition";

export function StageBootSignal({
  event,
  intent,
}: {
  event: NexusOperationEvent;
  intent: StageTransitionIntent;
}) {
  const meta = surface_meta_for_transition(event, intent);
  const Icon = meta.Icon;
  const phase_meta = PHASE_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const window_label = stage_transition_window_label(intent);
  const tool_label = event.tool_name ?? event.title;
  const target_label = event.target ?? event.summary ?? event.title;

  return (
    <div className="operation-boot-signal pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(460px,calc(100%-2.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] border border-white/72 bg-white/68 p-3 shadow-[0_28px_70px_rgba(18,28,42,0.16)] backdrop-blur-2xl">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,114,255,0.45)] to-transparent" />
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-gradient-to-br text-[color:var(--primary)]",
          meta.accent_class_name,
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-black tracking-[-0.025em] text-(--text-strong)">
              第一个工具接入 · {meta.label}
            </span>
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold",
              phase_meta.class_name,
            )}>
              <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
              {phase_meta.label}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold text-(--text-muted)">
            {tool_label} · {target_label}
          </p>
        </div>
      </div>

      <StageLaunchRoute
        steps={[
          { label: "字符场锁定", value: "nexus", tone: "success" },
          { label: "工具分类", value: meta.label, tone: "active" },
          { label: "窗口显影", value: window_label, tone: "pending" },
        ]}
      />

      <div className="mt-3 overflow-hidden rounded-full bg-[rgba(91,114,255,0.10)]">
        <div className="operation-boot-line h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(91,114,255,0.68),rgba(79,162,159,0.62),rgba(47,184,132,0.58))]" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[9.5px] font-semibold text-(--text-soft)">
        <span>nexus 字符场</span>
        <span>真实工具窗口</span>
      </div>
    </div>
  );
}

export function StageEventSignal({
  event,
  intent,
  round_event_count,
  sequence,
}: {
  event: NexusOperationEvent;
  intent: StageTransitionIntent;
  round_event_count: number;
  sequence: number;
}) {
  const meta = surface_meta_for_transition(event, intent);
  const Icon = meta.Icon;
  const phase_meta = PHASE_META[event.phase];
  const PhaseIcon = phase_meta.Icon;
  const incoming_label = event.tool_name ?? event.title;
  const next_window_label = stage_transition_window_label(intent);
  const completed_count = Math.max(0, round_event_count - 1);
  const target_label = event.target ?? event.summary ?? event.title;

  return (
    <div
      className="operation-event-signal pointer-events-none absolute left-1/2 top-5 z-30 w-[min(460px,calc(100%-2rem))] -translate-x-1/2 rounded-[16px] border border-white/72 bg-white/72 p-2.5 shadow-[0_22px_54px_rgba(18,28,42,0.14)] backdrop-blur-2xl"
      key={`event-signal-${sequence}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border bg-gradient-to-br text-[color:var(--primary)]",
          meta.accent_class_name,
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12px] font-black text-(--text-strong)">
              第 {round_event_count} 个工具接入 · {meta.label}
            </span>
            <span className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold",
              phase_meta.class_name,
            )}>
              <PhaseIcon className={cn("h-3 w-3", event.phase === "running" && "animate-spin")} />
              {phase_meta.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-muted)">
            {incoming_label} · {target_label}
          </p>
        </div>
      </div>
      <StageLaunchRoute
        steps={[
          { label: "上一现场", value: completed_count ? `${completed_count} 已沉淀` : "首个窗口", tone: "success" },
          { label: "当前工具", value: incoming_label, tone: "active" },
          { label: "窗口接管", value: next_window_label, tone: "pending" },
        ]}
      />
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <StageSignalMetric label="已沉淀" value={`${completed_count}`} />
        <StageSignalMetric label="接入中" value={incoming_label} strong />
        <StageSignalMetric label="窗口" value={next_window_label} />
      </div>
    </div>
  );
}

export function StageMaterializingSignal({
  event,
  intent,
}: {
  event: NexusOperationEvent;
  intent: StageTransitionIntent;
}) {
  const meta = surface_meta_for_transition(event, intent);
  const Icon = meta.Icon;
  const window_label = stage_transition_window_label(intent);
  const tool_label = event.tool_name ?? event.title;
  const target_label = event.target ?? event.summary ?? event.title;

  return (
    <div className="operation-materializing-signal pointer-events-none absolute right-5 top-5 z-30 w-[min(330px,calc(100%-2rem))] rounded-[16px] border border-white/72 bg-white/70 p-2.5 shadow-[0_22px_54px_rgba(18,28,42,0.13)] backdrop-blur-2xl max-md:right-3 max-md:top-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border bg-gradient-to-br text-[color:var(--primary)]",
          meta.accent_class_name,
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[color:var(--primary)]" />
            <p className="truncate text-[11.5px] font-black text-(--text-strong)">
              {window_label}装配中
            </p>
          </div>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-(--text-soft)">
            {tool_label} · {target_label}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 text-[8.5px] font-bold text-(--text-soft)">
        <span className="truncate rounded-[9px] bg-white/42 px-2 py-1.5">字符场让位</span>
        <ArrowRight className="h-3 w-3" />
        <span className="truncate rounded-[9px] bg-[rgba(91,114,255,0.09)] px-2 py-1.5 text-[color:var(--primary)]">
          {meta.label}接管
        </span>
      </div>
      <div className="mt-2 overflow-hidden rounded-full bg-white/48">
        <div className="operation-materializing-line h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(91,114,255,0.68),rgba(79,162,159,0.62),rgba(47,184,132,0.58))]" />
      </div>
    </div>
  );
}

function StageLaunchRoute({
  steps,
}: {
  steps: Array<{
    label: string;
    tone: "active" | "pending" | "success";
    value: string;
  }>;
}) {
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      {steps.map((step, index) => (
        <div className="contents" key={step.label}>
          <div className={cn(
            "min-w-0 rounded-[11px] border px-2 py-2 text-center",
            step.tone === "success" && "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.08)]",
            step.tone === "active" && "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.10)]",
            step.tone === "pending" && "border-white/50 bg-white/36",
          )}>
            <p className="truncate text-[9.5px] font-black text-(--text-strong)">{step.value}</p>
            <p className="mt-0.5 truncate text-[8px] font-semibold text-(--text-soft)">{step.label}</p>
          </div>
          {index < steps.length - 1 ? (
            <ArrowRight className="h-3.5 w-3.5 text-(--icon-muted)" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StageSignalMetric({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className={cn(
      "min-w-0 rounded-[10px] border px-2 py-1.5",
      strong
        ? "border-[rgba(91,114,255,0.22)] bg-[rgba(91,114,255,0.09)]"
        : "border-white/50 bg-white/34",
    )}>
      <p className="truncate text-[9.5px] font-black text-(--text-strong)">{value}</p>
      <p className="mt-0.5 truncate text-[8px] font-semibold text-(--text-soft)">{label}</p>
    </div>
  );
}

function stage_transition_window_label(intent: StageTransitionIntent): string {
  if (intent === "terminal") {
    return "终端窗口";
  }
  if (intent === "browser") {
    return "浏览器窗口";
  }
  if (intent === "workspace") {
    return "文件窗口";
  }
  if (intent === "editor") {
    return "编辑窗口";
  }
  if (intent === "task") {
    return "任务面板";
  }
  if (intent === "permission") {
    return "确认面板";
  }
  return "交接面板";
}
