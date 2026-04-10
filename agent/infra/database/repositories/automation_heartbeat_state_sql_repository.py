# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：automation_heartbeat_state_sql_repository.py
# @Date   ：2026/4/10
# @Author ：Codex
# 2026/4/10   Create
# =====================================================

"""Automation heartbeat state SQL 仓储。"""

from __future__ import annotations

from sqlalchemy import select

from agent.infra.database.models.automation_heartbeat_state import AutomationHeartbeatState
from agent.infra.database.repositories.base_sql_repository import BaseSqlRepository
from agent.utils.utils import random_uuid


class AutomationHeartbeatStateSqlRepository(BaseSqlRepository):
    """Agent 心跳状态的 CRUD 仓储。"""

    async def get_state(self, agent_id: str) -> AutomationHeartbeatState | None:
        """按 agent_id 读取心跳状态。"""
        stmt = select(AutomationHeartbeatState).where(
            AutomationHeartbeatState.agent_id == agent_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_state(self, agent_id: str, **fields) -> AutomationHeartbeatState:
        """插入或更新心跳状态。"""
        defaults = {
            "enabled": False,
            "every_seconds": 1800,
            "target_mode": "none",
            "ack_max_chars": 300,
            "last_heartbeat_at": None,
            "last_ack_at": None,
        }
        payload = {**defaults, **fields}
        entity = await self.get_state(agent_id)
        if entity is None:
            entity = AutomationHeartbeatState(
                state_id=payload.pop("state_id", random_uuid()),
                agent_id=agent_id,
                **payload,
            )
            self._session.add(entity)
        else:
            entity.agent_id = agent_id
            # 只回写本次传入的字段，保持已有配置稳定。
            for field_name, value in fields.items():
                setattr(entity, field_name, value)
        await self.flush()
        await self.refresh(entity)
        return entity
