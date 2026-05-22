import {
  AlertTriangle,
  RadioTower,
  Route,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { StageWindowState } from "../operation-desktop-types";
import { build_operation_live_episode } from "../operation-stage-experience";
import type { NexusOperationEvent, NexusOperationSnapshot } from "../operation-types";
import { resolve_operation_tool_profile } from "../operation-tool-catalog";
import type { StageNarrativeState } from "./operation-stage-model";
import { SURFACE_LABEL } from "./operation-stage-style";

export function StageActGuide({
  active_window,
  event,
  events,
  narrative,
  snapshot,
}: {
  active_window: StageWindowState | null;
  event: NexusOperationEvent;
  events: NexusOperationEvent[];
  narrative: StageNarrativeState;
  snapshot: NexusOperationSnapshot | null;
}) {
  if (narrative.phase === "completed" || narrative.phase === "settling") {
    return null;
  }

  const profile = resolve_operation_tool_profile(event.tool_name, event.kind, event.surface);
  const episode = build_operation_live_episode(event, events, snapshot);
  const is_waiting = event.phase === "waiting";
  const is_runtime_handoff = event.surface === "conversation";
  const is_runtime_retry = is_runtime_retry_event(event);
  const act_steps = is_waiting
    ? STAGE_WAITING_ACT_STEPS
    : is_runtime_handoff
      ? STAGE_HANDOFF_ACT_STEPS
      : STAGE_RUNNING_ACT_STEPS;
  const stage_index = narrative.phase === "awakening" ? 0 : 1;
  const target = event.target ?? event.summary ?? active_window?.title ?? event.title;
  const GuideIcon = narrative.phase === "awakening"
    ? Sparkles
    : is_waiting
      ? ShieldQuestion
      : is_runtime_retry
        ? AlertTriangle
      : is_runtime_handoff
        ? RadioTower
        : Route;
  const guide_title = narrative.phase === "awakening"
    ? "工作台正在显影"
    : is_waiting
      ? "等待用户介入"
      : is_runtime_retry
        ? "API 正在重试"
      : is_runtime_handoff
        ? "运行正在接入"
        : "工具正在接管现场";

  return (
    <div className="operation-stage-mobile-panel absolute right-4 top-4 z-30 w-[min(350px,calc(100%-2rem))] max-xl:top-[92px] max-md:relative max-md:right-auto max-md:top-auto max-md:mb-3 max-md:!w-full max-md:min-w-0 max-md:!max-w-full max-md:overflow-hidden">
      <div className="rounded-[16px] border border-white/64 bg-white/52 p-3 shadow-[0_18px_46px_rgba(18,28,42,0.10)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[rgba(91,114,255,0.20)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]">
              <GuideIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">
                {guide_title}
              </p>
              <p className="truncate text-[10.5px] text-(--text-soft)">
                {profile.action_label} · {profile.title}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/56 bg-white/48 px-2 py-1 text-[9.5px] font-bold text-(--text-soft)">
            {episode.progress_label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {act_steps.map((step, index) => {
            const is_done = index < stage_index;
            const is_current = index === stage_index;
            return (
              <div
                className={cn(
                  "min-w-0 rounded-[11px] border px-2 py-2",
                  is_current
                    ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.11)]"
                    : is_done
                      ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/42 bg-white/26",
                )}
                key={step.label}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-black",
                    is_current
                      ? "bg-[color:var(--primary)] text-white"
                      : is_done
                        ? "bg-[color:var(--success)] text-white"
                        : "bg-white/70 text-(--text-soft)",
                  )}>
                    {index + 1}
                  </span>
                  <span className="truncate text-[9.5px] font-black text-(--text-strong)">
                    {step.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-[8.5px] font-semibold text-(--text-soft)">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-[12px] border border-white/46 bg-white/34 px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[9.5px] font-bold text-(--text-soft)">
            <span>当前意图</span>
            <span>{SURFACE_LABEL[event.surface]}</span>
          </div>
          <p className="line-clamp-2 text-[11px] leading-5 text-(--text-strong)">
            {target}
          </p>
        </div>

        <div className="mt-2 overflow-hidden rounded-[12px] border border-[rgba(91,114,255,0.16)] bg-[rgba(91,114,255,0.06)] p-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[9px] border border-[rgba(91,114,255,0.18)] bg-white/46 text-[color:var(--primary)]">
              <Route className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="truncate text-[9.5px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
                  {episode.status_label}
                </p>
                <span className="shrink-0 rounded-full bg-white/54 px-1.5 py-px text-[8.5px] font-bold text-(--text-soft)">
                  live
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-(--text-muted)">
                {episode.status_detail}
              </p>
              <div className="mt-2 grid gap-1 text-[9.5px]">
                <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-[8px] bg-white/34 px-2 py-1.5">
                  <span className="font-bold text-(--text-soft)">刚才</span>
                  <span className="truncate font-semibold text-(--text-strong)">{episode.previous_label}</span>
                </div>
                <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-[8px] bg-white/34 px-2 py-1.5">
                  <span className="font-bold text-(--text-soft)">等待</span>
                  <span className="truncate font-semibold text-(--text-strong)">{episode.next_label}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {episode.checkpoints.map((checkpoint) => (
              <div
                className={cn(
                  "min-w-0 rounded-[8px] border px-1.5 py-1.5",
                  checkpoint.tone === "warning"
                    ? "border-[rgba(223,157,46,0.18)] bg-[rgba(223,157,46,0.08)]"
                    : checkpoint.tone === "success"
                      ? "border-[rgba(47,184,132,0.17)] bg-[rgba(47,184,132,0.08)]"
                      : "border-white/42 bg-white/28",
                )}
                key={checkpoint.label}
              >
                <p className="truncate text-[8px] font-bold text-(--text-soft)">{checkpoint.label}</p>
                <p className="mt-0.5 truncate text-[9.5px] font-black text-(--text-strong)">{checkpoint.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STAGE_RUNNING_ACT_STEPS = [
  { label: "进入", detail: "字符场展开" },
  { label: "执行", detail: "工具逐个登场" },
  { label: "沉淀", detail: "结果可回看" },
] as const;

const STAGE_HANDOFF_ACT_STEPS = [
  { label: "接入", detail: "运行时接收" },
  { label: "装载", detail: "上下文就绪" },
  { label: "等待", detail: "首个工具事件" },
] as const;

const STAGE_WAITING_ACT_STEPS = [
  { label: "进入", detail: "字符场展开" },
  { label: "确认", detail: "权限检查点" },
  { label: "继续", detail: "回到现场" },
] as const;

function is_runtime_retry_event(event: NexusOperationEvent): boolean {
  return event.surface === "conversation"
    && (event.evidence ?? []).some((item) => item.label === "api_retry");
}

