/**
# !/usr/bin/env xx
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：liquid-glass-engine.ts
# @Date   ：2026-04-11 11:34
# @Author ：leemysw
# 2026-04-11 11:34   Create
# =====================================================
*/

interface LiquidGlassAssetBundle {
  displacement_map_url: string;
  highlight_map_url: string;
}

interface LiquidGlassAssetOptions {
  width: number;
  height: number;
  radius: number;
  bezel: number;
  light_angle_deg?: number;
}

interface Vector2 {
  x: number;
  y: number;
}

const LIQUID_GLASS_CACHE = new Map<string, LiquidGlassAssetBundle>();
const DEFAULT_LIGHT_ANGLE_DEG = -48;
const MIN_SAMPLE_SIZE = 52;
const MAX_SAMPLE_EDGE = 260;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function smootherstep(value: number): number {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * normalized * (normalized * (normalized * 6 - 15) + 10);
}

function getRoundedRectSdf(x: number, y: number, width: number, height: number, radius: number): number {
  const half_width = width / 2;
  const half_height = height / 2;
  const dx = Math.abs(x - half_width) - (half_width - radius);
  const dy = Math.abs(y - half_height) - (half_height - radius);
  const outer_x = Math.max(dx, 0);
  const outer_y = Math.max(dy, 0);
  return Math.hypot(outer_x, outer_y) + Math.min(Math.max(dx, dy), 0) - radius;
}

function getSdfNormal(x: number, y: number, width: number, height: number, radius: number): Vector2 {
  const epsilon = 0.85;
  const dx = getRoundedRectSdf(x + epsilon, y, width, height, radius)
    - getRoundedRectSdf(x - epsilon, y, width, height, radius);
  const dy = getRoundedRectSdf(x, y + epsilon, width, height, radius)
    - getRoundedRectSdf(x, y - epsilon, width, height, radius);
  const length = Math.hypot(dx, dy);

  if (length < 0.0001) {
    return { x: 0, y: -1 };
  }

  return {
    x: dx / length,
    y: dy / length,
  };
}

function createCanvasContext(width: number, height: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d");
}

function encodeVectorChannel(value: number): number {
  return Math.round(clamp(128 + value * 127, 0, 255));
}

function buildCacheKey({
  width,
  height,
  radius,
  bezel,
  light_angle_deg = DEFAULT_LIGHT_ANGLE_DEG,
}: LiquidGlassAssetOptions): string {
  return [
    Math.round(width),
    Math.round(height),
    Math.round(radius * 10),
    Math.round(bezel * 10),
    Math.round(light_angle_deg * 10),
  ].join(":");
}

function createGlassAssets({
  width,
  height,
  radius,
  bezel,
  light_angle_deg = DEFAULT_LIGHT_ANGLE_DEG,
}: LiquidGlassAssetOptions): LiquidGlassAssetBundle | null {
  const scale_ratio = clamp(MAX_SAMPLE_EDGE / Math.max(width, height), MIN_SAMPLE_SIZE / Math.min(width, height), 1);
  const sample_width = Math.max(MIN_SAMPLE_SIZE, Math.round(width * scale_ratio));
  const sample_height = Math.max(MIN_SAMPLE_SIZE, Math.round(height * scale_ratio));
  const sample_radius = clamp(radius * scale_ratio, 4, Math.min(sample_width, sample_height) / 2);
  const sample_bezel = clamp(bezel * scale_ratio, 6, Math.min(sample_radius, sample_width / 3, sample_height / 3));
  const displacement_context = createCanvasContext(sample_width, sample_height);
  const highlight_context = createCanvasContext(sample_width, sample_height);

  if (!displacement_context || !highlight_context) {
    return null;
  }

  const displacement_data = displacement_context.createImageData(sample_width, sample_height);
  const highlight_data = highlight_context.createImageData(sample_width, sample_height);
  const displacement_buffer = displacement_data.data;
  const highlight_buffer = highlight_data.data;
  const light_radians = light_angle_deg * (Math.PI / 180);
  const light_direction = {
    x: Math.cos(light_radians),
    y: Math.sin(light_radians),
  };

  // 中文注释：这里按“圆角矩形 SDF + 法线近似”生成折射位移图，
  // 不是简单高斯模糊叠层，而是真正给 feDisplacementMap 提供向量场。
  for (let y = 0; y < sample_height; y += 1) {
    for (let x = 0; x < sample_width; x += 1) {
      const pixel_index = (y * sample_width + x) * 4;
      const signed_distance = getRoundedRectSdf(x + 0.5, y + 0.5, sample_width, sample_height, sample_radius);

      displacement_buffer[pixel_index] = 128;
      displacement_buffer[pixel_index + 1] = 128;
      displacement_buffer[pixel_index + 2] = 128;
      displacement_buffer[pixel_index + 3] = 255;
      highlight_buffer[pixel_index] = 255;
      highlight_buffer[pixel_index + 1] = 255;
      highlight_buffer[pixel_index + 2] = 255;
      highlight_buffer[pixel_index + 3] = 0;

      if (signed_distance > 0) {
        continue;
      }

      const distance_from_edge = -signed_distance;
      if (distance_from_edge > sample_bezel * 1.18) {
        continue;
      }

      const outward_normal = getSdfNormal(x + 0.5, y + 0.5, sample_width, sample_height, sample_radius);
      const inward_normal = {
        x: -outward_normal.x,
        y: -outward_normal.y,
      };
      const edge_factor = 1 - clamp(distance_from_edge / sample_bezel, 0, 1);
      const displacement_strength = Math.pow(smootherstep(edge_factor), 0.88) * (0.78 + edge_factor * 0.22);

      displacement_buffer[pixel_index] = encodeVectorChannel(inward_normal.x * displacement_strength);
      displacement_buffer[pixel_index + 1] = encodeVectorChannel(inward_normal.y * displacement_strength);

      const light_facing = Math.max(0, outward_normal.x * light_direction.x + outward_normal.y * light_direction.y);
      const rim_strength = Math.pow(edge_factor, 2.35);
      const diffuse_glow = Math.pow(edge_factor, 3.8) * 0.18;
      const highlight_alpha = clamp((Math.pow(light_facing, 2.2) * rim_strength + diffuse_glow) * 255, 0, 255);
      highlight_buffer[pixel_index + 3] = Math.round(highlight_alpha);
    }
  }

  displacement_context.putImageData(displacement_data, 0, 0);
  highlight_context.putImageData(highlight_data, 0, 0);

  return {
    displacement_map_url: displacement_context.canvas.toDataURL("image/png"),
    highlight_map_url: highlight_context.canvas.toDataURL("image/png"),
  };
}

export function getLiquidGlassAssets(options: LiquidGlassAssetOptions): LiquidGlassAssetBundle | null {
  const cache_key = buildCacheKey(options);
  const cached = LIQUID_GLASS_CACHE.get(cache_key);
  if (cached) {
    return cached;
  }

  const assets = createGlassAssets(options);
  if (!assets) {
    return null;
  }

  LIQUID_GLASS_CACHE.set(cache_key, assets);
  return assets;
}

export function supportsTrueLiquidGlass(): boolean {
  if (typeof window === "undefined" || typeof CSS === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const supports_backdrop = CSS.supports("backdrop-filter", "blur(1px)")
    || CSS.supports("-webkit-backdrop-filter", "blur(1px)");
  if (!supports_backdrop) {
    return false;
  }

  const navigator_with_brands = navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string }>;
    };
  };
  const brands = navigator_with_brands.userAgentData?.brands?.map((item) => item.brand).join(" ") ?? "";
  const user_agent = navigator.userAgent;
  const is_chromium_family = /Chrom|Chrome|Chromium|Edg/i.test(`${brands} ${user_agent}`);
  const is_firefox = /Firefox\//i.test(user_agent);
  const is_safari = /Safari\//i.test(user_agent) && !/Chrome|Chromium|Edg\//i.test(user_agent);
  const navigator_connection = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
    };
  };
  if (navigator_connection.connection?.saveData) {
    return false;
  }

  return is_chromium_family && !is_firefox && !is_safari;
}
