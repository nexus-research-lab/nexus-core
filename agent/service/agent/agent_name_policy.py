# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：agent_name_policy.py
# @Date   ：2026/3/17 20:15
# @Author ：leemysw
# 2026/3/17 20:15   Create
# =====================================================

"""Agent 名称规则。"""

import re
import unicodedata
from pathlib import Path
from typing import Optional

from agent.schema.model_agent import ValidateAgentNameResponse
from agent.service.workspace.workspace_paths import get_workspace_base_path
from agent.service.agent.agent_repository import agent_repository


class AgentNamePolicy:
    """负责 Agent 名称标准化、目录映射与冲突校验。"""

    NAME_MIN_LEN = 2
    NAME_MAX_LEN = 40
    NAME_ALLOWED_PATTERN = re.compile(r"^[\u4e00-\u9fffA-Za-z0-9 _-]+$")

    @classmethod
    def normalize(cls, name: str) -> str:
        """标准化 Agent 名称。"""
        return " ".join((name or "").strip().split())

    @classmethod
    def build_workspace_dir_name(cls, agent_name: str) -> str:
        """从 Agent 名称生成安全的目录名。"""
        normalized = unicodedata.normalize("NFKC", cls.normalize(agent_name))
        normalized = normalized.replace(" ", "_")
        safe_name = re.sub(r"[^A-Za-z0-9\u4e00-\u9fff_-]", "_", normalized)
        safe_name = re.sub(r"_+", "_", safe_name).strip("._-")
        return safe_name or "agent"

    @classmethod
    def resolve_workspace_path(cls, agent_name: str) -> Path:
        """统一计算 Agent 工作空间路径。"""
        return get_workspace_base_path() / cls.build_workspace_dir_name(agent_name)

    def validate_format(self, normalized_name: str) -> Optional[str]:
        """校验名称格式并返回失败原因。"""
        if not normalized_name:
            return "名称不能为空"
        if len(normalized_name) < self.NAME_MIN_LEN:
            return f"名称至少 {self.NAME_MIN_LEN} 个字符"
        if len(normalized_name) > self.NAME_MAX_LEN:
            return f"名称不能超过 {self.NAME_MAX_LEN} 个字符"
        if not self.NAME_ALLOWED_PATTERN.fullmatch(normalized_name):
            return "仅支持中文、英文、数字、空格、下划线和连字符"
        return None

    async def validate_name(
        self,
        name: str,
        exclude_agent_id: Optional[str] = None,
    ) -> ValidateAgentNameResponse:
        """校验 Agent 名称规则、重复性和目标 workspace 冲突。"""
        normalized_name = self.normalize(name)
        invalid_reason = self.validate_format(normalized_name)
        if invalid_reason:
            return ValidateAgentNameResponse.invalid(name, normalized_name, invalid_reason)

        expected_workspace = self.resolve_workspace_path(normalized_name)
        expected_workspace_str = str(expected_workspace)
        conflict_reason = await self._resolve_conflict_reason(
            normalized_name,
            expected_workspace,
            exclude_agent_id,
        )
        if conflict_reason:
            return ValidateAgentNameResponse.unavailable(
                name=name,
                normalized_name=normalized_name,
                workspace_path=expected_workspace_str,
                reason=conflict_reason,
            )

        return ValidateAgentNameResponse.available(
            name=name,
            normalized_name=normalized_name,
            workspace_path=expected_workspace_str,
        )

    async def _resolve_conflict_reason(
        self,
        normalized_name: str,
        expected_workspace: Path,
        exclude_agent_id: Optional[str],
    ) -> Optional[str]:
        """检查名称与 workspace 是否冲突。"""
        name_occupied = await agent_repository.exists_active_agent_name(
            normalized_name,
            exclude_agent_id=exclude_agent_id,
        )
        if name_occupied:
            return "名称已存在，请更换一个名称"
        if not expected_workspace.exists():
            return None
        if not exclude_agent_id:
            return "同名工作区目录已存在，请更换名称"

        current_agent = await agent_repository.get_agent(exclude_agent_id)
        current_path = Path(current_agent.workspace_path).expanduser() if current_agent else None
        if not current_path or current_path != expected_workspace:
            return "同名工作区目录已存在，请更换名称"
        return None
