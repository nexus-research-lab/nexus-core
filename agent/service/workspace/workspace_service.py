# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：workspace_service.py
# @Date   ：2026/3/17 20:15
# @Author ：leemysw
# 2026/3/17 20:15   Create
# =====================================================

"""Workspace 应用服务。"""

from typing import Tuple

from agent.service.agent.agent_manager import agent_manager
from agent.service.session.session_manager import session_manager


class WorkspaceService:
    """负责 workspace 读写相关用例。"""

    async def get_workspace_files(self, agent_id: str) -> list[dict]:
        """获取 workspace 文件列表。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        return workspace.list_files()

    async def get_workspace_file(self, agent_id: str, path: str) -> str:
        """读取 workspace 文件。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        return workspace.read_relative_file(path)

    async def update_workspace_file(self, agent_id: str, path: str, content: str) -> str:
        """更新 workspace 文件并刷新活跃会话。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        saved_path = workspace.write_relative_file(path, content, source="api")
        await session_manager.refresh_agent_sessions(agent_id)
        return saved_path

    async def create_workspace_entry(
            self,
            agent_id: str,
            path: str,
            entry_type: str,
            content: str = "",
    ) -> str:
        """创建 workspace 条目。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        created_path = workspace.create_entry(path, entry_type, content)
        await session_manager.refresh_agent_sessions(agent_id)
        return created_path

    async def rename_workspace_entry(self, agent_id: str, path: str, new_path: str) -> Tuple[str, str]:
        """重命名 workspace 条目。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        renamed_paths = workspace.rename_entry(path, new_path)
        await session_manager.refresh_agent_sessions(agent_id)
        return renamed_paths

    async def delete_workspace_entry(self, agent_id: str, path: str) -> str:
        """删除 workspace 条目。"""
        workspace = await agent_manager.get_agent_workspace(agent_id)
        deleted_path = workspace.delete_entry(path)
        await session_manager.refresh_agent_sessions(agent_id)
        return deleted_path


workspace_service = WorkspaceService()
