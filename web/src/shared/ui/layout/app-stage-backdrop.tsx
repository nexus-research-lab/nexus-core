/**
 * =====================================================
 * @File   : app-stage-backdrop.tsx
 * @Date   : 2026-04-04 21:57
 * @Author : leemysw
 * 2026-04-04 21:57   Create
 * =====================================================
 */

"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getStageGlowStyle } from "@/shared/ui/layout/stage-glow";

const SUNNY_LEAVES_VIDEO_PATH = "/sunny/leaves.mp4";

function SunnyVideoOverlay({ is_active }: { is_active: boolean }) {
  const video_ref = useRef<HTMLVideoElement | null>(null);
  const prefers_reduced_motion = usePrefersReducedMotion();

  useEffect(() => {
    const video = video_ref.current;
    if (!video) {
      return;
    }

    if (!is_active || prefers_reduced_motion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const play_result = video.play();
    if (play_result && typeof play_result.catch === "function") {
      play_result.catch(() => {});
    }
  }, [is_active, prefers_reduced_motion]);

  return (
    <div aria-hidden="true" className="sunny-overlay">
      <video
        className="sunny-overlay__video"
        loop
        muted
        playsInline
        preload="metadata"
        ref={video_ref}
        src={SUNNY_LEAVES_VIDEO_PATH}
      />
    </div>
  );
}

interface AppStageBackdropProps {
  is_sunny: boolean;
}

export function AppStageBackdrop({ is_sunny }: AppStageBackdropProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div
        className="app-stage__glow absolute left-[6%] top-[9%] h-64 w-64 rounded-full opacity-42 blur-[8px]"
        style={getStageGlowStyle("lilac")}
      />
      <div className="app-stage__glow absolute bottom-[7%] left-[22%] h-72 w-72 rounded-full bg-white/28 blur-3xl" />
      <div
        className="app-stage__glow absolute right-[9%] top-[20%] h-64 w-64 rounded-full opacity-28 blur-[14px]"
        style={getStageGlowStyle("peach")}
      />
      <div
        className="app-stage__glow absolute right-[12%] bottom-[8%] h-72 w-72 rounded-full opacity-30 blur-[14px]"
        style={getStageGlowStyle("green")}
      />
      {is_sunny ? <SunnyVideoOverlay is_active={is_sunny} /> : null}
    </div>
  );
}
