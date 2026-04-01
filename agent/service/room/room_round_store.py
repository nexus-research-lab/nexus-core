# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_round_store.py
# @Date   ：2026/04/01 17:50
# @Author ：leemysw
# 2026/04/01 17:50   Create
# =====================================================

"""Room 轮次状态存储。"""

from __future__ import annotations

from datetime import datetime

from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.message_sql_repository import MessageSqlRepository
from agent.schema.model_chat_persistence import RoundRecord
from agent.utils.logger import logger
from agent.utils.utils import random_uuid


class RoomRoundStore:
    """负责维护 Room 会话的轮次状态机。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    @staticmethod
    def _to_datetime(timestamp_ms: int) -> datetime:
        """把毫秒时间戳转换为数据库使用的 naive 时间。"""
        return datetime.fromtimestamp(timestamp_ms / 1000)

    @staticmethod
    def _resolve_trigger_message_id(round_id: str) -> str:
        """从轮次 ID 还原触发消息 ID。"""
        return round_id.split(":", 1)[0]

    async def start_round(
        self,
        session_id: str,
        round_id: str,
        trigger_message_id: str,
        started_at_ms: int,
    ) -> None:
        """注册运行中的轮次。"""
        started_at = self._to_datetime(started_at_ms)
        async with self._db.session() as session:
            repository = MessageSqlRepository(session)
            await repository.upsert_round(
                RoundRecord(
                    id=random_uuid(),
                    session_id=session_id,
                    round_id=round_id,
                    trigger_message_id=trigger_message_id,
                    status="running",
                    started_at=started_at,
                    finished_at=None,
                    created_at=started_at,
                    updated_at=started_at,
                )
            )
            await session.commit()

    async def finish_round(
        self,
        session_id: str,
        round_id: str,
        status: str,
        finished_at_ms: int,
        metadata: dict | None = None,
    ) -> None:
        """更新轮次终态。"""
        finished_at = self._to_datetime(finished_at_ms)
        async with self._db.session() as session:
            repository = MessageSqlRepository(session)
            existing = await repository.get_round(round_id)
            if not existing:
                logger.warning(
                    "finish_round: round_id=%s 没有 start_round 记录，使用终态时间作为 started_at 回退",
                    round_id,
                )
            trigger_message_id = (
                existing.trigger_message_id
                if existing
                else self._resolve_trigger_message_id(round_id)
            )
            started_at = existing.started_at if existing else finished_at
            created_at = existing.created_at if existing else finished_at
            await repository.upsert_round(
                RoundRecord(
                    id=existing.id if existing else random_uuid(),
                    session_id=session_id,
                    round_id=round_id,
                    trigger_message_id=trigger_message_id,
                    status=status,
                    started_at=started_at,
                    finished_at=finished_at,
                    created_at=created_at,
                    updated_at=finished_at,
                )
            )
            await session.commit()


room_round_store = RoomRoundStore()
