import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FolderTree,
  RadioTower,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "./operation-types";
import type { OperationStageExperiencePhase } from "./operation-stage-experience";
import {
  fallback_stage_event_object_label,
  is_low_signal_stage_label,
} from "./operation-stage-labels";
import {
  build_stage_transition_style,
  surface_meta_for_transition,
} from "./operation-stage-transition";
import type { StageTransitionIntent } from "./operation-stage-transition";
import { StageBootSignal } from "./operation-stage-launch-overlay";

interface IdleParticle {
  x: number;
  y: number;
  alpha: number;
  drift: number;
  glyph: string;
  phase: number;
  size: number;
}

const IDLE_PARTICLE_GLYPHS = ["{", "}", "<", ">", "/", "\\", "0", "1", "n", "x", "+", "·", ";", ":"];

const STAGE_STORY_ITEMS: Array<{
  id: OperationStageExperiencePhase;
  label: string;
  value: string;
  Icon: LucideIcon;
}> = [
  { id: "idle", label: "入口", value: "字符场", Icon: Sparkles },
  { id: "awakening", label: "唤醒", value: "运行接入", Icon: RadioTower },
  { id: "running", label: "执行", value: "工具窗口", Icon: Activity },
  { id: "settling", label: "落盘", value: "现场沉淀", Icon: FolderTree },
  { id: "completed", label: "交接", value: "可回看", Icon: CheckCircle2 },
];

export function EmptyStage({
  active_event = null,
  exiting = false,
  previous_event = null,
  round_event_count = 0,
  snapshot,
  subtitle,
  transition_intent = "summary",
}: {
  active_event?: NexusOperationEvent | null;
  exiting?: boolean;
  previous_event?: NexusOperationEvent | null;
  round_event_count?: number;
  snapshot: NexusOperationSnapshot | null;
  subtitle: string;
  transition_intent?: StageTransitionIntent;
}) {
  const now = useStageClock();
  const time_label = format_stage_clock(now);
  const second_label = format_stage_seconds(now);
  const transition_style = build_stage_transition_style(transition_intent);

  return (
    <div className={cn(
      "relative h-full min-h-[300px] overflow-hidden bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(239,244,251,0.86))]",
      exiting && "pointer-events-none absolute inset-0 z-20 operation-idle-stage-exit",
    )}
    data-stage-experience-phase={exiting ? "awakening" : "idle"}
    style={exiting ? transition_style : undefined}
    >
      <div className="operation-idle-sky pointer-events-none absolute inset-0 bg-[radial-gradient(60%_48%_at_50%_43%,rgba(255,255,255,0.96),transparent_72%),radial-gradient(44%_30%_at_50%_62%,rgba(91,114,255,0.13),transparent_75%)]" />
      <div className="operation-idle-grid operation-stage-gridlines pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="operation-idle-dotfield pointer-events-none absolute inset-0 opacity-[0.32] [background-image:radial-gradient(rgba(91,114,255,0.16)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_78%,transparent)]" />

      <StageIdleParticles />

      <div className="operation-idle-clock pointer-events-none absolute bottom-8 left-8 z-10 flex items-end gap-2 max-sm:bottom-5 max-sm:left-5">
        <div className="font-mono text-[54px] font-semibold leading-none tracking-normal text-[rgba(32,43,58,0.88)] max-sm:text-[42px]">
          {time_label}
        </div>
        <div className="pb-1.5 font-mono text-[24px] font-semibold leading-none tracking-normal text-[rgba(32,43,58,0.28)] max-sm:text-[18px]">
          :{second_label}
        </div>
      </div>

      <div className="operation-idle-agent-pill pointer-events-none absolute right-8 top-7 z-10 flex max-w-[220px] justify-end max-sm:right-5 max-sm:top-5">
        <div className="min-w-0 rounded-full border border-white/72 bg-white/54 px-3 py-1.5 text-right text-[11px] font-semibold text-(--text-soft) shadow-[0_14px_34px_rgba(18,28,42,0.08)] backdrop-blur-xl">
          <span className="block truncate">{subtitle}</span>
        </div>
      </div>

      <IdleWorkstationStatus
        active_event={active_event}
        exiting={exiting}
        snapshot={snapshot}
        subtitle={subtitle}
        transition_intent={transition_intent}
      />
      <IdleNarrativeDock phase={exiting ? "awakening" : "idle"} snapshot={snapshot} />

      {exiting && active_event ? (
        <StageBootSignal
          event={active_event}
          intent={transition_intent}
          previous_event={previous_event}
          round_event_count={round_event_count}
        />
      ) : null}
    </div>
  );
}

function IdleWorkstationStatus({
  active_event,
  exiting,
  snapshot,
  subtitle,
  transition_intent,
}: {
  active_event: NexusOperationEvent | null;
  exiting: boolean;
  snapshot: NexusOperationSnapshot | null;
  subtitle: string;
  transition_intent: StageTransitionIntent;
}) {
  const event_count = snapshot?.events.length ?? 0;
  const artifact_count = snapshot?.workspace_events.length ?? 0;
  const evidence_count = snapshot?.recent_evidence.length ?? 0;
  const launch_meta = active_event ? surface_meta_for_transition(active_event, transition_intent) : null;
  const LaunchIcon = launch_meta?.Icon ?? Sparkles;
  const launch_target_candidate = active_event?.target ?? active_event?.summary ?? active_event?.title;
  const launch_target = is_low_signal_stage_label(launch_target_candidate)
    ? fallback_stage_event_object_label(active_event, launch_meta?.label)
    : launch_target_candidate;
  const launch_subtitle_candidate = active_event?.tool_name ?? active_event?.title ?? subtitle;
  const launch_subtitle = is_low_signal_stage_label(launch_subtitle_candidate)
    ? fallback_stage_event_object_label(active_event, launch_meta?.label)
    : launch_subtitle_candidate;

  return (
    <div className="operation-idle-status-card pointer-events-none absolute left-8 top-7 z-10 w-[min(320px,calc(100%-4rem))] max-sm:left-5 max-sm:top-5 max-sm:w-[min(280px,calc(100%-2.5rem))]">
      <div className="rounded-[18px] border border-white/66 bg-white/46 p-3 shadow-[0_18px_46px_rgba(18,28,42,0.09)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border text-[color:var(--primary)]",
              exiting
                ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.12)]"
                : "border-[rgba(91,114,255,0.18)] bg-[rgba(91,114,255,0.09)]",
            )}>
              <LaunchIcon className={cn("h-4 w-4", exiting && "animate-pulse")} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-(--text-strong)">
                {exiting && launch_meta ? `${launch_meta.label} 接入` : "nexus 字符场"}
              </p>
              <p className="truncate text-[10px] font-semibold text-(--text-soft)">
                {exiting ? launch_subtitle : subtitle}
              </p>
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[9.5px] font-bold",
            exiting
              ? "border-[rgba(91,114,255,0.24)] bg-[rgba(91,114,255,0.10)] text-[color:var(--primary)]"
              : "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.10)] text-[color:var(--success)]",
          )}>
            {exiting ? "唤醒中" : "待机"}
          </span>
        </div>
        {exiting ? (
          <div className="mt-3 rounded-[12px] border border-[rgba(91,114,255,0.16)] bg-[rgba(91,114,255,0.07)] px-2.5 py-2">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.10em] text-(--text-soft)">
              下一步
            </p>
            <p className="mt-0.5 truncate text-[10.5px] font-semibold text-(--text-strong)">
              {launch_target}
            </p>
          </div>
        ) : (
          <IdleStandbyRoute />
        )}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <IdleStatusMetric label="状态" value={exiting ? "唤醒" : "就绪"} />
          <IdleStatusMetric label="现场" value={event_count ? `${event_count}` : "空"} />
          <IdleStatusMetric label="证据" value={artifact_count + evidence_count ? `${artifact_count + evidence_count}` : "0"} />
        </div>
      </div>
    </div>
  );
}

function IdleStandbyRoute() {
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 text-[8.5px] font-bold text-(--text-soft)">
      <IdleRouteCell label="入口" value="字符场" />
      <span className="text-center">-&gt;</span>
      <IdleRouteCell label="唤醒" value="运行接入" />
      <span className="text-center">-&gt;</span>
      <IdleRouteCell label="显影" value="工具窗口" />
    </div>
  );
}

function IdleRouteCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[9px] border border-white/42 bg-white/30 px-2 py-1.5 text-center">
      <p className="truncate text-[8px] font-black text-(--text-soft)">{label}</p>
      <p className="mt-0.5 truncate text-[9px] font-black text-(--text-strong)">{value}</p>
    </div>
  );
}

function IdleNarrativeDock({
  phase,
  snapshot,
}: {
  phase: OperationStageExperiencePhase;
  snapshot: NexusOperationSnapshot | null;
}) {
  const has_resume_context = Boolean(
    snapshot &&
    (snapshot.events.length > 0 || snapshot.workspace_events.length > 0 || snapshot.recent_evidence.length > 0),
  );

  return (
    <div className="pointer-events-none absolute bottom-8 right-8 z-10 w-[min(520px,calc(100%-4rem))] max-sm:bottom-24 max-sm:right-5 max-sm:w-[min(320px,calc(100%-2.5rem))]">
      <div className="rounded-[18px] border border-white/62 bg-white/40 p-2.5 shadow-[0_18px_46px_rgba(18,28,42,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <span className="text-[10px] font-black text-(--text-strong)">
            {has_resume_context ? "可恢复工作台" : "工作台叙事轨"}
          </span>
          <span className="text-[9px] font-semibold text-(--text-soft)">
            {has_resume_context ? `${snapshot?.events.length ?? 0} 步快照` : "idle"}
          </span>
        </div>
        <StageStoryTrack phase={phase} />
      </div>
    </div>
  );
}

function StageStoryTrack({ phase }: { phase: OperationStageExperiencePhase }) {
  const active_index = stage_story_active_index(phase);

  return (
    <div className="grid grid-cols-5 gap-1.5 max-sm:grid-cols-1">
      {STAGE_STORY_ITEMS.map((item, index) => {
        const Icon = item.Icon;
        const is_active = index === active_index;
        const is_done = index < active_index || phase === "completed";
        return (
          <div
            className={cn(
              "min-w-0 rounded-[12px] border px-2 py-2 text-center transition",
              is_active
                ? "border-[rgba(91,114,255,0.28)] bg-[rgba(91,114,255,0.12)] text-(--text-strong)"
                : is_done
                  ? "border-[rgba(47,184,132,0.20)] bg-[rgba(47,184,132,0.08)] text-(--text-strong)"
                  : "border-white/46 bg-white/28 text-(--text-soft)",
            )}
            key={item.id}
          >
            <Icon className={cn(
              "mx-auto h-3.5 w-3.5",
              is_active ? "text-[color:var(--primary)]" : is_done ? "text-[color:var(--success)]" : "text-(--icon-muted)",
              item.id === "running" && is_active && "animate-spin",
            )} />
            <p className="mt-1 truncate text-[9.5px] font-black">{item.value}</p>
            <p className="mt-0.5 truncate text-[8px] font-semibold">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function stage_story_active_index(phase: OperationStageExperiencePhase): number {
  return Math.max(0, STAGE_STORY_ITEMS.findIndex((item) => item.id === phase));
}

function IdleStatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/42 bg-white/32 px-2 py-1.5">
      <p className="truncate text-[10.5px] font-black text-(--text-strong)">{value}</p>
      <p className="mt-0.5 truncate text-[8.5px] font-semibold text-(--text-soft)">{label}</p>
    </div>
  );
}

function StageIdleParticles() {
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animation_frame = 0;
    let width = 0;
    let height = 0;
    let particles: IdleParticle[] = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const next_width = Math.max(1, Math.floor(rect.width));
      const next_height = Math.max(1, Math.floor(rect.height));
      if (next_width === width && next_height === height) {
        return;
      }

      width = next_width;
      height = next_height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = build_idle_particles(width, height);
    };

    const draw = (timestamp: number) => {
      resize();
      draw_idle_particles(context, particles, width, height, timestamp, reduced_motion);
      if (!reduced_motion) {
        animation_frame = window.requestAnimationFrame(draw);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    draw(0);

    return () => {
      observer.disconnect();
      if (animation_frame) {
        window.cancelAnimationFrame(animation_frame);
      }
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="operation-idle-particle-canvas pointer-events-none absolute inset-0 z-[1] h-full w-full"
      ref={canvas_ref}
    />
  );
}

function useStageClock(): Date {
  const [now, set_now] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => set_now(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function format_stage_clock(value: Date): string {
  return `${pad_clock_value(value.getHours())}:${pad_clock_value(value.getMinutes())}`;
}

function format_stage_seconds(value: Date): string {
  return pad_clock_value(value.getSeconds());
}

function pad_clock_value(value: number): string {
  return String(value).padStart(2, "0");
}

function build_idle_particles(width: number, height: number): IdleParticle[] {
  const mask_canvas = document.createElement("canvas");
  mask_canvas.width = width;
  mask_canvas.height = height;
  const mask_context = mask_canvas.getContext("2d", { willReadFrequently: true });
  if (!mask_context) {
    return [];
  }

  const font_size = width < 560
    ? Math.max(58, Math.min(width / 6.1, height / 5.4))
    : Math.max(118, Math.min(width / 3.35, height / 2.35));
  mask_context.clearRect(0, 0, width, height);
  mask_context.fillStyle = "#000";
  mask_context.font = `900 ${font_size}px Georgia, "Times New Roman", serif`;
  mask_context.textAlign = "center";
  mask_context.textBaseline = "middle";
  mask_context.fillText("nexus", width / 2, height * 0.55);

  const image = mask_context.getImageData(0, 0, width, height);
  const step = width >= 1100 ? 5 : 4;
  const particles: IdleParticle[] = [];
  const max_particles = width >= 1100 ? 15000 : 7600;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = image.data[(y * width + x) * 4 + 3];
      if (alpha < 28) {
        continue;
      }

      const noise = stable_noise(x, y);
      if (noise < 0.24) {
        continue;
      }

      const glyph_index = Math.floor(stable_noise(y, x) * IDLE_PARTICLE_GLYPHS.length) % IDLE_PARTICLE_GLYPHS.length;
      particles.push({
        x: x + (noise - 0.5) * 1.8,
        y: y + (stable_noise(x + 17, y + 31) - 0.5) * 2,
        alpha: 0.28 + (alpha / 255) * (0.46 + stable_noise(x + 3, y + 7) * 0.42),
        drift: 0.7 + stable_noise(x + 5, y + 11) * 1.8,
        glyph: IDLE_PARTICLE_GLYPHS[glyph_index],
        phase: stable_noise(x + 13, y + 19) * Math.PI * 2,
        size: 5.6 + stable_noise(x + 23, y + 29) * 3.6,
      });

      if (particles.length >= max_particles) {
        return particles;
      }
    }
  }

  return particles;
}

function draw_idle_particles(
  context: CanvasRenderingContext2D,
  particles: IdleParticle[],
  width: number,
  height: number,
  timestamp: number,
  reduced_motion: boolean,
) {
  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  const time = timestamp * 0.001;
  for (const particle of particles) {
    const wave = reduced_motion ? 0 : Math.sin(time * 0.85 + particle.phase) * particle.drift;
    const lift = reduced_motion ? 0 : Math.cos(time * 0.72 + particle.phase * 0.7) * particle.drift * 0.45;
    const shimmer = reduced_motion ? 0 : Math.sin(time * 1.8 + particle.phase * 1.3) * 0.18;
    context.globalAlpha = Math.max(0.16, Math.min(0.92, particle.alpha + shimmer));
    context.fillStyle = particle.phase > Math.PI
      ? "rgb(102,126,255)"
      : "rgb(126,150,255)";
    context.font = `${particle.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    context.fillText(particle.glyph, particle.x + wave, particle.y + lift);
  }

  context.globalAlpha = 1;
}

function stable_noise(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
