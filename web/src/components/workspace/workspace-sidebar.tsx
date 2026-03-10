"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileCode2,
  FileText,
  Folder,
  FolderPlus,
  FolderTree,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  createWorkspaceEntryApi,
  deleteWorkspaceEntryApi,
  getWorkspaceFilesApi,
  renameWorkspaceEntryApi,
} from "@/lib/agent-manage-api";
import { Agent, WorkspaceFileEntry } from "@/types/agent";
import { Session } from "@/types/session";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

interface FileTreeNode {
  entry: WorkspaceFileEntry;
  children: FileTreeNode[];
}

interface WorkspaceSidebarProps {
  agent: Agent;
  sessions: Session[];
  currentSessionKey: string | null;
  activeWorkspacePath: string | null;
  onSelectSession: (sessionKey: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionKey: string) => void;
  onOpenWorkspaceFile: (path: string | null) => void;
}

export function WorkspaceSidebar({
  agent,
  sessions,
  currentSessionKey,
  activeWorkspacePath,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onOpenWorkspaceFile,
}: WorkspaceSidebarProps) {
  const [files, setFiles] = useState<WorkspaceFileEntry[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesystemError, setFilesystemError] = useState<string | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({});

  const visibleFiles = useMemo(() => files.filter((file) => !file.is_dir), [files]);
  const memoryFiles = useMemo(
    () => visibleFiles.filter((file) => /memory|context|summary|skill/i.test(file.path)),
    [visibleFiles],
  );
  const directoryTree = useMemo(() => {
    const nodeMap = new Map<string, FileTreeNode>();
    const roots: FileTreeNode[] = [];

    [...files]
      .sort((left, right) => left.path.localeCompare(right.path, "zh-CN"))
      .forEach((entry) => {
        nodeMap.set(entry.path, { entry, children: [] });
      });

    [...files]
      .sort((left, right) => left.path.localeCompare(right.path, "zh-CN"))
      .forEach((entry) => {
        const node = nodeMap.get(entry.path);
        if (!node) {
          return;
        }

        const parentPath = entry.path.includes("/") ? entry.path.split("/").slice(0, -1).join("/") : null;
        const parent = parentPath ? nodeMap.get(parentPath) : null;

        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      });

    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((left, right) => {
        if (left.entry.is_dir !== right.entry.is_dir) {
          return left.entry.is_dir ? -1 : 1;
        }
        return left.entry.name.localeCompare(right.entry.name, "zh-CN");
      });
      nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
  }, [files]);
  const selectedSession = sessions.find((session) => session.session_key === currentSessionKey) ?? null;
  const latestSession = selectedSession ?? sessions[0] ?? null;

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    setFilesystemError(null);
    try {
      const nextFiles = await getWorkspaceFilesApi(agent.agent_id);
      setFiles(nextFiles);
    } catch (loadError) {
      setFilesystemError(loadError instanceof Error ? loadError.message : "加载 workspace 失败");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    void loadFiles();
  }, [agent.agent_id]);

  useEffect(() => {
    setExpandedDirectories((current) => {
      const nextState = { ...current };
      files
        .filter((entry) => entry.is_dir)
        .forEach((entry) => {
          if (nextState[entry.path] === undefined) {
            nextState[entry.path] = true;
          }
        });
      return nextState;
    });
  }, [files]);

  const handleCreateEntry = async (entryType: "file" | "directory") => {
    const placeholder = entryType === "file" ? "notes/todo.md" : "notes";
    const nextPath = window.prompt(
      entryType === "file" ? "输入新文件路径" : "输入新目录路径",
      placeholder,
    );

    if (!nextPath) {
      return;
    }

    try {
      const response = await createWorkspaceEntryApi(agent.agent_id, nextPath, entryType);
      await loadFiles();
      if (entryType === "file") {
        onOpenWorkspaceFile(response.path);
      }
    } catch (mutationError) {
      setFilesystemError(mutationError instanceof Error ? mutationError.message : "创建条目失败");
    }
  };

  const handleRenameEntry = async (entry: WorkspaceFileEntry) => {
    const nextPath = window.prompt("输入新的相对路径", entry.path);
    if (!nextPath || nextPath === entry.path) {
      return;
    }

    try {
      const response = await renameWorkspaceEntryApi(agent.agent_id, entry.path, nextPath);
      await loadFiles();

      if (!entry.is_dir && activeWorkspacePath === entry.path) {
        onOpenWorkspaceFile(response.new_path);
        return;
      }

      if (entry.is_dir && activeWorkspacePath?.startsWith(`${entry.path}/`)) {
        const renamedActivePath = activeWorkspacePath.replace(entry.path, response.new_path);
        onOpenWorkspaceFile(renamedActivePath);
      }
    } catch (mutationError) {
      setFilesystemError(mutationError instanceof Error ? mutationError.message : "重命名条目失败");
    }
  };

  const handleDeleteEntry = async (entry: WorkspaceFileEntry) => {
    const confirmed = window.confirm(`确认删除 ${entry.path} 吗？`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteWorkspaceEntryApi(agent.agent_id, entry.path);
      await loadFiles();

      if (
        activeWorkspacePath === entry.path ||
        (entry.is_dir && activeWorkspacePath?.startsWith(`${entry.path}/`))
      ) {
        onOpenWorkspaceFile(null);
      }
    } catch (mutationError) {
      setFilesystemError(mutationError instanceof Error ? mutationError.message : "删除条目失败");
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirectories((current) => ({
      ...current,
      [path]: !current[path],
    }));
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0): ReactNode[] => {
    return nodes.flatMap((node) => {
      const isDirectory = node.entry.is_dir;
      const isExpanded = expandedDirectories[node.entry.path] ?? true;
      const isActive = !isDirectory && activeWorkspacePath === node.entry.path;

      const row = (
        <div
          key={node.entry.path}
          className={cn(
            "group flex items-center gap-2 rounded-lg pr-2 transition-colors",
            isActive
              ? "bg-primary/8 text-primary"
              : "text-foreground hover:bg-secondary/80",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
            onClick={() => {
              if (isDirectory) {
                toggleDirectory(node.entry.path);
                return;
              }
              onOpenWorkspaceFile(isActive ? null : node.entry.path);
            }}
            type="button"
          >
            {isDirectory ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <FileCode2 className="h-4 w-4 shrink-0" />
              </>
            )}

            <span className="truncate text-sm font-medium">{node.entry.name}</span>
          </button>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
              onClick={() => void handleRenameEntry(node.entry)}
              title="重命名"
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-destructive/20 hover:text-destructive"
              onClick={() => void handleDeleteEntry(node.entry)}
              title="删除"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );

      if (!isDirectory || !isExpanded) {
        return [row];
      }

      return [row, ...renderTree(node.children, depth + 1)];
    });
  };

  return (
    <aside className="flex min-h-0 w-[300px] flex-col rounded-[20px] panel-surface">
      <div className="border-b border-border/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
          </div>
          <button
            className="rounded-xl border border-border/80 bg-secondary/80 p-2 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
            onClick={() => void loadFiles()}
            type="button"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingFiles && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="soft-scrollbar flex-1 overflow-y-auto">
        <section className="border-b border-border/80 px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <FolderTree className="h-3.5 w-3.5" />
              Virtual Filesystem
            </div>
            <div className="flex items-center gap-1">
              <button
                className="rounded-lg border border-border/80 bg-secondary/80 p-1.5 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
                onClick={() => void handleCreateEntry("file")}
                title="创建文件"
                type="button"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-lg border border-border/80 bg-secondary/80 p-1.5 text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
                onClick={() => void handleCreateEntry("directory")}
                title="创建目录"
                type="button"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {filesystemError && (
            <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/6 px-3 py-2 text-xs text-destructive">
              {filesystemError}
            </div>
          )}

          <div className="space-y-1">
            {directoryTree.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-secondary/60 px-3 py-4 text-sm text-muted-foreground">
                当前 workspace 还没有可展示的文件。
              </div>
            ) : (
              renderTree(directoryTree)
            )}
          </div>
        </section>

        <section className="px-3 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <BrainCircuit className="h-3.5 w-3.5" />
              Context
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
              onClick={onCreateSession}
              type="button"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              新会话
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-secondary/80 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Memory / Context
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-background px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Threads</p>
                  <p className="mt-1.5 font-semibold text-foreground">{sessions.length}</p>
                </div>
                <div className="rounded-xl bg-background px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Memory</p>
                  <p className="mt-1.5 font-semibold text-foreground">{memoryFiles.length}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3 py-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>Current</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{latestSession?.message_count ?? 0} msgs</p>
                  <p className="text-xs text-muted-foreground">
                    {latestSession ? formatRelativeTime(latestSession.last_activity_at) : "idle"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {sessions.map((session) => {
                const isActive = session.session_key === currentSessionKey;
                return (
                  <button
                    key={session.session_key}
                    className={cn(
                      "group w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                      isActive
                        ? "border-primary/30 bg-primary/8 shadow-sm"
                        : "border-transparent bg-secondary/55 hover:border-border/90 hover:bg-secondary/90",
                    )}
                    onClick={() => onSelectSession(session.session_key)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {truncate(session.title || "Untitled Session", 22)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatRelativeTime(session.last_activity_at)} / {session.message_count ?? 0} 条消息
                        </p>
                      </div>

                      <button
                        className="rounded-lg border border-border/80 p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-destructive/20 hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSession(session.session_key);
                        }}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
