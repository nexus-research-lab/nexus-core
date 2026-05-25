import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type {
  NexusOperationEvent,
  NexusOperationSnapshot,
} from "./operation-types";
import {
  build_stage_transition_style,
} from "./operation-stage-transition";
import type { StageTransitionIntent } from "./operation-stage-transition";

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

export function EmptyStage({
  exiting = false,
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
