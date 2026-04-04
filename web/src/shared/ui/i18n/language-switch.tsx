/**
 * =====================================================
 * @File   : language-switch.tsx
 * @Date   : 2026-04-04 17:05
 * @Author : leemysw
 * 2026-04-04 17:05   Create
 * =====================================================
 */

"use client";

import { Languages } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/shared/i18n/i18n-context";

export function LanguageSwitch({ class_name }: { class_name?: string }) {
  const { locale, set_locale, t } = useI18n();

  return (
    <div
      aria-label={t("language.switch_title")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/66 p-1 shadow-[0_10px_24px_rgba(106,124,158,0.12)] backdrop-blur-xl",
        class_name,
      )}
      role="group"
      title={t("language.switch_title")}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500">
        <Languages className="h-3.5 w-3.5" />
      </span>
      <button
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
          locale === "zh"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
        )}
        onClick={() => set_locale("zh")}
        type="button"
      >
        {t("language.zh")}
      </button>
      <button
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
          locale === "en"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
        )}
        onClick={() => set_locale("en")}
        type="button"
      >
        {t("language.en")}
      </button>
    </div>
  );
}
