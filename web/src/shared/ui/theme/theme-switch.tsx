/**
 * =====================================================
 * @File   : theme-switch.tsx
 * @Date   : 2026-04-04 18:06
 * @Author : leemysw
 * 2026-04-04 18:06   Create
 * =====================================================
 */

"use client";

import { MoonStar, Sun, SunMedium } from "lucide-react";

import { useI18n } from "@/shared/i18n/i18n-context";
import { Theme, useTheme } from "@/shared/theme/theme-context";
import { SegmentedPill } from "@/shared/ui/segmented-pill";

const THEME_META: Record<Theme, { icon: typeof Sun }> = {
  light: { icon: SunMedium },
  dark: { icon: MoonStar },
  sunny: { icon: Sun },
};

export function ThemeSwitch({ class_name }: { class_name?: string }) {
  const { theme, set_theme } = useTheme();
  const { t } = useI18n();

  const options: { value: Theme; label: string }[] = [
    { value: "light", label: t("theme.light") },
    { value: "dark", label: t("theme.dark") },
    { value: "sunny", label: t("theme.sunny") },
  ];

  const ActiveIcon = THEME_META[theme].icon;

  return (
    <SegmentedPill
      class_name={class_name}
      icon={ActiveIcon}
      on_change={set_theme}
      options={options}
      title={t("theme.switch_title")}
      value={theme}
    />
  );
}
