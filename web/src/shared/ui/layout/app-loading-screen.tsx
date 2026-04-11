"use client";

import { ANIMATIONS } from "@/config/animation-assets";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_PRESETS, LiquidGlassPanel } from "@/shared/ui/liquid-glass";
import { LottiePlayer } from "../feedback/lottie-player";

interface AppLoadingStateProps {
  class_name?: string;
  animation_class_name?: string;
  message?: string;
}

export function AppLoadingState({
  class_name,
  animation_class_name = "h-32 w-32 shrink-0",
  message = "正在加载...",
}: AppLoadingStateProps) {
  return (
    <LiquidGlassPanel
      class_name={cn("flex flex-col items-center gap-3 text-center", class_name)}
      content_class_name="px-12 py-10"
      preset={LIQUID_GLASS_PRESETS.panel}
      radius={24}
    >
      <LottiePlayer
        class_name={animation_class_name}
        src={ANIMATIONS.CAT}
      />
      <p className="text-sm text-[color:var(--text-muted)]">{message}</p>
    </LiquidGlassPanel>
  );
}

export function AppLoadingScreen() {
  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <AppLoadingState />
    </main>
  );
}
