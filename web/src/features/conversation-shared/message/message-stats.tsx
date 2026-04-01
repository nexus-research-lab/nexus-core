import { Check, Copy, RefreshCw, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatsData {
  duration: string;
  tokens: string | null;
  cost: string | null;
  cache_hit: string | null;
}

interface MessageStatsProps {
  stats?: MessageStatsData;
  show_cursor?: boolean;
  compact?: boolean;
  copied_assistant?: boolean;
  is_regenerating?: boolean;
  is_deleting?: boolean;
  on_copy_assistant?: () => void;
  on_regenerate?: () => void;
  on_delete?: () => void;
}

export function MessageStats(
  {
    stats,
    show_cursor,
    compact = false,
    copied_assistant,
    is_regenerating,
    is_deleting,
    on_copy_assistant,
    on_regenerate,
    on_delete,
  }: MessageStatsProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-x-2 gap-y-1 pt-2 text-[11px] text-slate-400",
        compact ? "flex-wrap" : "flex-wrap sm:flex-nowrap sm:gap-3",
      )}>
      {stats?.duration ? <span className="shrink-0 tabular-nums">耗时 {stats.duration}</span> : null}
      {stats?.tokens && (
        <>
          {stats?.duration ? <span className="hidden text-slate-700/20 sm:inline">•</span> : null}
          <span className="min-w-0 truncate tabular-nums">Tokens {stats.tokens}</span>
        </>
      )}
      {stats?.cost && (
        <>
          {stats?.duration || stats?.tokens ? <span className="hidden text-slate-700/20 sm:inline">•</span> : null}
          <span className="shrink-0 tabular-nums">成本 {stats.cost}</span>
        </>
      )}
      {stats?.cache_hit && (
        <>
          {stats?.duration || stats?.tokens || stats?.cost ? <span className="hidden text-slate-700/20 sm:inline">•</span> : null}
          <span className="shrink-0">缓存 {stats.cache_hit}</span>
        </>
      )}

      <div className={cn("hidden flex-1 sm:block", compact && "sm:hidden")} />

      {/* 状态/操作 */}
      {show_cursor ? (
        <div className="ml-auto flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary animate-pulse"/>
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {/* 复制 */}
          {on_copy_assistant && (
            <button
              onClick={on_copy_assistant}
              className={cn(
                "rounded p-1 text-slate-500 transition-colors hover:bg-slate-100",
                copied_assistant ? "text-green-500" : "text-slate-700/50 hover:text-slate-950"
              )}
              title="复制回答"
            >
              {copied_assistant ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
            </button>
          )}
          {/* 重新生成 */}
          {on_regenerate && (
            <button
              onClick={on_regenerate}
              disabled={is_regenerating}
              className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
              title="重新生成"
            >
              <RefreshCw className={cn("w-3 h-3", is_regenerating && "animate-spin")}/>
            </button>
          )}
          {/* 删除 */}
          {on_delete && (
            <button
              onClick={on_delete}
              disabled={is_deleting}
              className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-500 disabled:opacity-50"
              title="删除"
            >
              <Trash2 className="w-3 h-3"/>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
