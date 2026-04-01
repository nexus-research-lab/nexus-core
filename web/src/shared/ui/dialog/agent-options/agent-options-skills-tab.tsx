"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Search, Sparkles } from "lucide-react";

import { getAgentSkillsApi, installSkillApi, uninstallSkillApi } from "@/lib/skill-api";
import type { AgentSkillEntry } from "@/types/skill";
import { cn } from "@/lib/utils";

interface AgentOptionsSkillsTabProps {
  agent_id?: string;
  is_visible: boolean;
  setting_sources: ("user" | "project" | "local")[];
  on_toggle_setting_source: (source: "user" | "project" | "local") => void;
}

const SOURCE_OPTIONS = [
  {
    value: "user",
    label: "User",
    description: "读取用户级 skill 与个人偏好。",
  },
  {
    value: "project",
    label: "Project",
    description: "读取当前项目内定义的 skill 与工作流。",
  },
  {
    value: "local",
    label: "Local",
    description: "读取本机临时或实验性 skill 配置。",
  },
] as const;

export function AgentOptionsSkillsTab({
  agent_id,
  is_visible,
  setting_sources,
  on_toggle_setting_source,
}: AgentOptionsSkillsTabProps) {
  const [skills, setSkills] = useState<AgentSkillEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadSkills = useCallback(async () => {
    if (!agent_id) {
      setSkills([]);
      setErrorMessage(null);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getAgentSkillsApi(agent_id);
      setSkills(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "加载技能列表失败"
      );
    } finally {
      setLoading(false);
    }
  }, [agent_id]);

  useEffect(() => {
    if (!is_visible) {
      return;
    }
    void loadSkills();
  }, [is_visible, loadSkills]);

  const handleToggle = useCallback(
    async (skill: AgentSkillEntry) => {
      if (!agent_id || skill.locked || toggling) {
        return;
      }

      try {
        setToggling(skill.name);
        setErrorMessage(null);
        if (skill.installed) {
          await uninstallSkillApi(agent_id, skill.name);
        } else {
          await installSkillApi(agent_id, skill.name);
        }
        await loadSkills();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "切换技能状态失败"
        );
      } finally {
        setToggling(null);
      }
    },
    [agent_id, loadSkills, toggling]
  );

  const installedCount = useMemo(
    () => skills.filter((skill) => skill.installed).length,
    [skills]
  );
  const installedSkills = useMemo(
    () => skills.filter((skill) => skill.installed),
    [skills]
  );
  const addableSkills = useMemo(
    () => skills.filter((skill) => !skill.installed && !skill.locked),
    [skills]
  );
  const filteredAddableSkills = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return addableSkills;
    }
    return addableSkills.filter((skill) => {
      const haystacks = [
        skill.name,
        skill.title,
        skill.description,
        skill.category_name,
        skill.tags.join(" "),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [addableSkills, deferredSearchQuery]);

  const renderSkillCard = (
    skill: AgentSkillEntry,
    actionLabel: string,
    tone: "installed" | "add"
  ) => {
    const isBusy = toggling === skill.name;
    return (
      <div
        key={skill.name}
        className="rounded-[22px] border border-slate-200/70 bg-white/75 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300/70 hover:bg-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {skill.title || skill.name}
              </span>
              {skill.locked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <Lock className="h-3 w-3" />
                  系统内置
                </span>
              ) : null}
              {skill.scope === "main" ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                  Main Only
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {skill.source_type}
              </span>
            </div>
            {skill.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                {skill.description}
              </p>
            ) : null}
          </div>

          {skill.locked ? (
            <span className="inline-flex h-9 items-center rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-600">
              已启用
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleToggle(skill)}
              disabled={isBusy}
              className={cn(
                "inline-flex h-9 min-w-24 items-center justify-center rounded-full px-3 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
                tone === "installed"
                  ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-500"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              )}
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="rounded-[26px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Agent Skills
            </p>
            <h3 className="text-base font-semibold text-slate-900">
              管理当前 Agent 的技能挂载
            </h3>
            <p className="text-sm leading-6 text-slate-600">
              配置来源决定运行时从哪里读取 skill；技能挂载则决定哪些能力会安装到当前 Agent。
            </p>
            <p className="text-xs leading-5 text-slate-400">
              技能启用和卸载会立即生效；配置来源跟随底部保存一起提交。
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
            {installedCount}/{skills.length}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Skill Sources
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">
              配置来源
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            已启用 {setting_sources.length} 个来源
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SOURCE_OPTIONS.map((source) => {
            const enabled = setting_sources.includes(source.value);
            return (
              <button
                key={source.value}
                type="button"
                onClick={() => on_toggle_setting_source(source.value)}
                className={cn(
                  "rounded-[22px] border px-4 py-4 text-left transition-all duration-200",
                  enabled
                    ? "border-emerald-200 bg-emerald-50/80 shadow-[0_10px_24px_rgba(22,163,74,0.08)]"
                    : "border-slate-200/70 bg-white/75 hover:border-slate-300/70 hover:bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {source.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {source.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      enabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {enabled ? "已启用" : "关闭"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-[24px] border border-slate-200/70 bg-white/60 py-12 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : null}

      {!agent_id ? (
        <div className="rounded-[24px] border border-slate-200/70 bg-white/65 px-5 py-6 text-sm leading-6 text-slate-600">
          先创建 Agent，系统拿到真实的 agent id 和 workspace 后，才能把 skill 安装到这个 Agent 的工作区。
        </div>
      ) : null}

      {agent_id && !loading ? (
        <>
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Installed
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  已挂载的技能
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {installedSkills.length} 个已生效
              </span>
            </div>

            {installedSkills.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200/70 bg-white/60 px-5 py-6 text-sm leading-6 text-slate-600">
                当前还没有挂载任何自定义技能。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {installedSkills.map((skill) => renderSkillCard(skill, "已启用", "installed"))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Add More
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  从资源池新增技能
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {filteredAddableSkills.length}/{addableSkills.length}
              </span>
            </div>

            <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4">
              <label className="mb-2 block text-xs font-medium text-slate-500">
                搜索技能
              </label>
              <div className="flex items-center gap-3 rounded-[18px] border border-slate-200/80 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索可添加的 skill..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {skills.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200/70 bg-white/60 px-5 py-6 text-sm leading-6 text-slate-600">
                当前没有可分配给该 Agent 的技能。先去全局 Skills 页面把内置技能安装到资源池，或导入外部技能。
              </div>
            ) : null}

            {skills.length > 0 && filteredAddableSkills.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200/70 bg-white/60 px-5 py-6 text-sm leading-6 text-slate-600">
                {addableSkills.length === 0
                  ? "当前资源池里没有更多可添加的技能。"
                  : "没有找到匹配的 skill。"}
              </div>
            ) : null}

            {filteredAddableSkills.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredAddableSkills.map((skill) => renderSkillCard(skill, "新增 Skill", "add"))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
