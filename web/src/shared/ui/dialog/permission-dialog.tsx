/**
 * 权限确认对话框组件
 *
 * 当Agent需要使用某些工具时，显示此对话框请求用户授权
 */

"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionRiskLevel, PermissionUpdate } from "@/types/permission";

interface PermissionDialogProps {
  is_open: boolean;
  tool_name: string;
  tool_input: Record<string, any>;
  risk_level?: PermissionRiskLevel;
  risk_label?: string;
  summary?: string;
  suggestions?: PermissionUpdate[];
  expires_at?: string;
  on_allow: (updated_permissions?: PermissionUpdate[]) => void;
  on_deny: (updated_permissions?: PermissionUpdate[]) => void;
  on_close: () => void;
}

const FIELD_LABEL_MAP: Record<string, string> = {
  query: '搜索内容',
  url: '网址',
  command: '命令',
  path: '路径',
  file_path: '文件路径',
  pattern: '匹配内容',
  prompt: '提示词',
  description: '说明',
  task: '任务',
  mode: '模式',
  directories: '目录',
  answers: '回答',
};

const formatInlineValue = (value: unknown): string => {
  if (value == null || value === '') return '空';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatInlineValue(item)).join('、');
  }
  if (typeof value === 'object') {
    const pairs = Object.entries(value as Record<string, unknown>)
      .slice(0, 4)
      .map(([key, nestedValue]) => `${FIELD_LABEL_MAP[key] || key}：${formatInlineValue(nestedValue)}`);
    return pairs.join('；');
  }
  return String(value);
};

export function PermissionDialog(
  {
    is_open,
    tool_name,
    tool_input,
    risk_level,
    risk_label,
    summary,
    suggestions = [],
    expires_at,
    on_allow,
    on_deny,
    on_close
  }: PermissionDialogProps) {
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  const readableSuggestions = useMemo(() => {
    return suggestions.map((suggestion, index) => {
      const destinationMap: Record<string, string> = {
        session: '仅本会话',
        projectSettings: '项目设置',
        userSettings: '用户设置',
      };
      const behaviorMap: Record<string, string> = {
        allow: '允许',
        deny: '拒绝',
        ask: '继续询问',
      };
      const destination = suggestion.destination ? destinationMap[suggestion.destination] || suggestion.destination : '当前会话';
      const behavior = suggestion.behavior ? behaviorMap[suggestion.behavior] || suggestion.behavior : '更新规则';
      const ruleSummary = suggestion.rules?.map((rule) => rule.rule_content || rule.tool_name).filter(Boolean).join('，');
      return {
        index,
        label: `${behavior}并写入${destination}`,
        description: ruleSummary || suggestion.type,
      };
    });
  }, [suggestions]);

  const riskColorMap: Record<PermissionRiskLevel, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };

  const readableFields = useMemo(() => {
    return Object.entries(tool_input).map(([key, value]) => ({
      key,
      label: FIELD_LABEL_MAP[key] || key,
      value: formatInlineValue(value),
    }));
  }, [tool_input]);

  // 格式化显示工具输入参数
  const formatToolInput = () => {
    if (readableFields.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">参数详情</p>
        {readableFields.map((field) => (
          <div key={field.key} className="neo-inset radius-shell-sm p-3">
            <span className="text-xs font-medium text-foreground">{field.label}</span>
            <p className="mt-1 text-xs leading-6 text-muted-foreground whitespace-pre-wrap break-words">
              {field.value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (!is_open) return null;

  // 使用 Portal 渲染到 body
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="soft-ring radius-shell-lg panel-surface flex w-full max-w-lg flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="neo-pill radius-shell-sm flex h-10 w-10 items-center justify-center bg-amber-100/80 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                {tool_name}
              </h2>
              <p className="text-xs text-muted-foreground">
                需要你的确认
              </p>
            </div>
          </div>
          <button
            onClick={on_close}
            className="neo-pill radius-shell-sm p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-auto">
          <div className="radius-shell-md border border-slate-200/70 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {risk_label ? (
                <span className={risk_level ? cn("rounded-full px-2 py-1 font-medium", riskColorMap[risk_level]) : "rounded-full bg-slate-200 px-2 py-1 font-medium text-slate-600"}>
                  {risk_label}
                </span>
              ) : null}
              {expires_at ? (
                <span className="text-slate-400">
                  {new Date(expires_at).toLocaleString()} 前确认
                </span>
              ) : null}
            </div>
            {summary ? (
              <p className="mt-3 text-sm leading-7 text-slate-700 break-words">
                {summary}
              </p>
            ) : null}
          </div>

          {readableSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">授权范围</p>
              <div className="space-y-2">
                <label className="neo-card-flat radius-shell-md flex items-start gap-3 p-3">
                  <input
                    type="radio"
                    name="permission-suggestion"
                    checked={selectedSuggestionIndex === -1}
                    onChange={() => setSelectedSuggestionIndex(-1)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">仅这次</p>
                    <p className="text-xs text-muted-foreground">本次执行后失效</p>
                  </div>
                </label>
                {readableSuggestions.map((suggestion) => (
                  <label key={suggestion.index} className="neo-card-flat radius-shell-md flex items-start gap-3 p-3">
                    <input
                      type="radio"
                      name="permission-suggestion"
                      checked={selectedSuggestionIndex === suggestion.index}
                      onChange={() => setSelectedSuggestionIndex(suggestion.index)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{suggestion.label}</p>
                      <p className="text-xs text-muted-foreground break-all">{suggestion.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {formatToolInput()}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 border-t border-white/55 px-5 py-4">
          <button
            onClick={() => on_deny()}
            className="neo-pill radius-shell-sm px-4 py-2 text-sm font-medium transition-colors hover:text-accent"
          >
            拒绝
          </button>
          <button
            onClick={() => {
              const selectedUpdate = selectedSuggestionIndex >= 0
                ? [suggestions[selectedSuggestionIndex]]
                : undefined;
              on_allow(selectedUpdate);
            }}
            className="radius-shell-sm bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            允许
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
