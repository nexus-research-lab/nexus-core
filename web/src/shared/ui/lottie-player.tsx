"use client";

import { lazy, Suspense, type CSSProperties } from "react";

interface LottiePlayerProps {
  src: string;
  class_name?: string;
  inline_style?: CSSProperties;
}

const LazyLottiePlayerContent = lazy(async () => {
  const module = await import("./lottie-player-content");
  return { default: module.LottiePlayerContent };
});

function LottiePlayerFallback({ class_name, inline_style }: LottiePlayerProps) {
  return <div className={class_name} style={inline_style} />;
}

export function LottiePlayer(props: LottiePlayerProps) {
  return (
    <Suspense fallback={<LottiePlayerFallback {...props} />}>
      <LazyLottiePlayerContent {...props} />
    </Suspense>
  );
}
