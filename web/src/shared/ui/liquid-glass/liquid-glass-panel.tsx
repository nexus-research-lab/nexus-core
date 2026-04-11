/**
# !/usr/bin/env xx
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：liquid-glass-panel.tsx
# @Date   ：2026-04-11 11:34
# @Author ：leemysw
# 2026-04-11 11:34   Create
# =====================================================
*/

"use client";

import { CSSProperties, ReactNode, useEffect, useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { getLiquidGlassAssets, supportsTrueLiquidGlass } from "./liquid-glass-engine";
import { LIQUID_GLASS_PRESETS, LiquidGlassPreset } from "./liquid-glass-presets";

type LiquidGlassTagName = "aside" | "div" | "main" | "section";
type LiquidGlassContentLayout = "natural" | "fill" | "fill-flex";

interface LiquidGlassPanelProps {
  children: ReactNode;
  class_name?: string;
  content_class_name?: string;
  content_layout?: LiquidGlassContentLayout;
  content_style?: CSSProperties;
  shape_style?: CSSProperties;
  style?: CSSProperties;
  radius?: number;
  bezel?: number;
  blur?: number;
  saturation?: number;
  distortion?: number;
  preset?: LiquidGlassPreset;
  tag_name?: LiquidGlassTagName;
}

function useMeasuredElementSize() {
  const [element, set_element] = useState<HTMLElement | null>(null);
  const [size, set_size] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const next_width = Math.round(entry.contentRect.width);
      const next_height = Math.round(entry.contentRect.height);
      set_size((current_size) => (
        current_size.width === next_width && current_size.height === next_height
          ? current_size
          : { width: next_width, height: next_height }
      ));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { set_element, size };
}

export function LiquidGlassPanel({
  children,
  class_name,
  content_class_name,
  content_layout = "natural",
  content_style,
  shape_style,
  style,
  radius = 32,
  bezel = Math.max(12, Math.round(radius * 0.48)),
  blur = 18,
  saturation = 142,
  distortion = Math.max(14, Math.min(radius * 0.72, 26)),
  preset = LIQUID_GLASS_PRESETS.subtle_panel,
  tag_name = "div",
}: LiquidGlassPanelProps) {
  const TagName = tag_name;
  const { set_element, size } = useMeasuredElementSize();
  const raw_filter_id = useId();
  const filter_id = `liquid-glass-${raw_filter_id.replace(/:/g, "")}`;
  const [can_use_true_glass, set_can_use_true_glass] = useState(false);

  useEffect(() => {
    set_can_use_true_glass(supportsTrueLiquidGlass());
  }, []);

  const assets = useMemo(() => {
    if (!can_use_true_glass || size.width < 24 || size.height < 24) {
      return null;
    }

    return getLiquidGlassAssets({
      width: size.width,
      height: size.height,
      radius,
      bezel,
    });
  }, [bezel, can_use_true_glass, radius, size.height, size.width]);

  const backdrop_filter = useMemo(() => {
    const filter_chain = `blur(${blur}px) saturate(${saturation}%)`;
    if (!can_use_true_glass || !assets) {
      return filter_chain;
    }

    return `url(#${filter_id}) ${filter_chain}`;
  }, [assets, blur, can_use_true_glass, filter_id, saturation]);

  const surface_shape_style = useMemo<CSSProperties>(() => ({
    borderRadius: `${radius}px`,
    ...shape_style,
  }), [radius, shape_style]);

  const root_style = useMemo<CSSProperties>(() => ({
    contain: "paint",
    ...surface_shape_style,
    ...style,
  }), [style, surface_shape_style]);

  const content_layout_class_name = useMemo(() => {
    if (content_layout === "fill") {
      return "h-full w-full min-h-0 min-w-0";
    }

    if (content_layout === "fill-flex") {
      return "flex h-full w-full min-h-0 min-w-0 flex-col";
    }

    return "";
  }, [content_layout]);

  return (
    <TagName
      className={cn("relative isolate overflow-hidden", class_name)}
      ref={set_element}
      style={root_style}
    >
      {can_use_true_glass && assets ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          focusable="false"
        >
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              id={filter_id}
              primitiveUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
            >
              <feImage
                href={assets.displacement_map_url}
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                result="liquid-glass-map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="liquid-glass-map"
                result="liquid-glass-refracted"
                scale={distortion}
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feImage
                href={assets.highlight_map_url}
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                result="liquid-glass-highlight"
              />
              <feBlend
                in="liquid-glass-refracted"
                in2="liquid-glass-highlight"
                mode="screen"
              />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          ...surface_shape_style,
          background: preset.background,
          boxShadow: `inset 0 0 0 1px ${preset.border_color}, ${preset.shadow}`,
          backdropFilter: backdrop_filter,
          WebkitBackdropFilter: backdrop_filter,
          transform: "translateZ(0)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] z-0"
        style={{
          ...surface_shape_style,
          background: preset.inner_background,
          boxShadow: `inset 0 1px 0 ${preset.inner_border_color}`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-90"
        style={{
          ...surface_shape_style,
          background: preset.sheen_background,
          mixBlendMode: "screen",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-12%] z-0 opacity-80 blur-[24px]"
        style={{ background: preset.glow_background }}
      />

      <div className={cn("relative z-10", content_layout_class_name, content_class_name)} style={content_style}>
        {children}
      </div>
    </TagName>
  );
}
