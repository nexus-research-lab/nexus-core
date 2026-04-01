/**
 * AgentOptions Live Preview 面板
 *
 * 右侧实时预览 Agent 卡片效果
 * 反映 Identity Tab 中编辑的名称、描述、头像、标签等
 */

"use client";

import { Cpu, Shield, Sparkles, User } from "lucide-react";
import { AVAILABLE_MODELS } from "./agent-options-constants";

interface AgentOptionsPreviewProps {
  title: string;
  description: string;
  vibeTags: string[];
  model: string;
  permissionMode: string;
  settingSourceCount: number;
}

/** 右侧 Live Preview 面板组件 */
export function AgentOptionsPreview({
  title,
  description,
  vibeTags,
  model,
  permissionMode,
  settingSourceCount,
}: AgentOptionsPreviewProps) {
  /** 获取模型显示名称 */
  const modelLabel =
    AVAILABLE_MODELS.find((m) => m.value === model)?.label ?? model;

  return (
    <div className="flex w-[18.5rem] flex-col border-l modal-divider bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4">
      <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Live Preview
      </h4>

      {/* Agent 卡片预览 */}
      <div className="radius-shell-md flex flex-col gap-4 border border-slate-200/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        {/* 头像 */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Agent
            </p>
            <h3 className="truncate text-base font-semibold text-slate-950">
              {title || "Untitled Agent"}
            </h3>
          </div>
        </div>

        {/* 描述 */}
        {description ? (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">
            暂无描述
          </p>
        )}

        {/* Vibe Tags */}
        {vibeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vibeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 分隔线 */}
        <div className="my-1 w-full border-t border-slate-200/70" />

        {/* 元信息 */}
        <div className="w-full space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Model · {modelLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Permission · {permissionMode}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Skill Sources · {settingSourceCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
