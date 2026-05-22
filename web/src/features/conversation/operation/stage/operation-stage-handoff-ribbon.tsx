import {
  ArrowRight,
  FileText,
  ListChecks,
  MessageSquareText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { emit_composer_draft } from "@/features/conversation/shared/composer-draft-events";

import type { OperationContinuationBrief } from "../operation-stage-experience";
import type { NexusOperationEvent } from "../operation-types";
import type { CompletionArtifact } from "./operation-stage-model";

export function StageHandoffRibbon({
  artifacts,
  continuation,
  events,
  has_error,
}: {
  artifacts: CompletionArtifact[];
  continuation: OperationContinuationBrief;
  events: NexusOperationEvent[];
  has_error: boolean;
}) {
  const primary_artifact = artifacts[0]?.value ?? continuation.primary_artifact;
  const resume_prompt = continuation.resume_prompt;
  const replayable_count = events.filter((item) => item.kind !== "round_summary").length || events.length;
  const items = [
    {
      Icon: artifacts[0]?.Icon ?? FileText,
      label: artifacts.length ? "主产物" : "主线索",
      value: primary_artifact,
      tone: artifacts.length ? "success" : "neutral",
    },
    {
      Icon: ListChecks,
      label: has_error ? "回看入口" : "可回放轨迹",
      value: `${replayable_count} 个工具现场`,
      tone: has_error ? "warning" : "success",
    },
    {
      Icon: MessageSquareText,
      label: has_error ? "建议追问" : "继续协作",
      value: resume_prompt,
      tone: has_error ? "warning" : "neutral",
    },
  ] as const;

  return (
    <div className={cn(
      "mt-3 rounded-[14px] border p-2.5",
      has_error
        ? "border-[rgba(223,157,46,0.24)] bg-[rgba(223,157,46,0.08)]"
        : "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.06)]",
    )}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-(--text-strong)">
            交接带
          </p>
          <p className="mt-0.5 truncate text-[9.5px] font-semibold text-(--text-soft)">
            {continuation.status_detail}
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/56 bg-white/56 px-2 py-1 text-[8.5px] font-black text-(--text-soft) transition hover:border-[rgba(91,114,255,0.24)] hover:bg-[rgba(91,114,255,0.10)] hover:text-[color:var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(91,114,255,0.30)]"
          onClick={() => emit_composer_draft({ text: resume_prompt })}
          type="button"
        >
          下一步
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 max-sm:grid-cols-1">
        {items.map((item) => {
          const Icon = item.Icon;
          return (
            <div
              className={cn(
                "min-w-0 rounded-[11px] border px-2 py-2",
                item.tone === "warning"
                  ? "border-[rgba(223,157,46,0.20)] bg-[rgba(223,157,46,0.08)]"
                  : item.tone === "success"
                    ? "border-[rgba(47,184,132,0.18)] bg-[rgba(47,184,132,0.08)]"
                    : "border-white/46 bg-white/34",
              )}
              key={item.label}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-[8px]",
                  item.tone === "warning"
                    ? "bg-[rgba(223,157,46,0.12)] text-[color:var(--warning)]"
                    : item.tone === "success"
                      ? "bg-[rgba(47,184,132,0.12)] text-[color:var(--success)]"
                      : "bg-white/56 text-(--icon-muted)",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="truncate text-[9px] font-black text-(--text-soft)">{item.label}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[9.5px] font-semibold leading-4 text-(--text-strong)">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
