# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：heartbeat_state_store.py
# @Date   ：2026/4/10
# @Author ：Codex
# 2026/4/10   Create
# =====================================================

"""Automation heartbeat state 存储服务。"""

from __future__ import annotations

from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.automation_heartbeat_state_sql_repository import (
    AutomationHeartbeatStateSqlRepository,
)


class HeartbeatStateStore:
    """薄封装的心跳状态存储。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    async def get_state(self, agent_id: str):
        """读取心跳状态。"""
        async with self._db.session() as session:
            repo = AutomationHeartbeatStateSqlRepository(session)
            return await repo.get_state(agent_id)

    async def upsert_state(self, agent_id: str, **fields):
        """保存心跳状态。"""
        async with self._db.session() as session:
            repo = AutomationHeartbeatStateSqlRepository(session)
            row = await repo.upsert_state(agent_id, **fields)
            await session.commit()
            return row
