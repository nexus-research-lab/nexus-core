# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：activity_event_service.py
# @Date   ：2026/3/30 00:00
# @Author ：leemysw
# 2026/3/30 00:00   Create
# =====================================================

"""Activity 事件服务 — 管理系统活动事件。"""

from __future__ import annotations

from typing import Optional

from agent.infra.database.get_db import get_db
from agent.infra.database.models.activity_event import ActivityEventType
from agent.infra.database.repositories.activity_sql_repository import ActivityEventSqlRepository
from agent.schema.model_chat_persistence import ActivityEventRecord
from agent.utils.snowflake import worker


class ActivityEventService:
    """Activity 事件管理服务。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    async def create_event(
        self,
        event_type: str,
        actor_type: str,
        actor_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        summary: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ActivityEventRecord:
        """创建 Activity 事件。"""
        record = ActivityEventRecord(
            id=worker.get_id(),
            event_type=event_type,
            actor_type=actor_type,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            summary=summary,
            metadata_json=metadata,
        )
        async with self._db.session() as session:
            repository = ActivityEventSqlRepository(session)
            created = await repository.create(record)
            await session.commit()
            return created

    async def list_events(
        self,
        limit: int = 50,
        offset: int = 0,
        event_type: Optional[str] = None,
        unread_only: bool = False,
        user_id: str = "local-user",
    ) -> list[ActivityEventRecord]:
        """列出 Activity 事件。"""
        async with self._db.session() as session:
            repository = ActivityEventSqlRepository(session)
            return await repository.list(
                limit=limit,
                offset=offset,
                event_type=event_type,
                unread_only=unread_only,
                user_id=user_id,
            )

    async def get_unread_count(
        self,
        user_id: str = "local-user",
    ) -> int:
        """获取未读事件数量。"""
        async with self._db.session() as session:
            repository = ActivityEventSqlRepository(session)
            return await repository.get_unread_count(user_id=user_id)

    async def mark_as_read(
        self,
        event_ids: list[str],
        user_id: str = "local-user",
    ) -> int:
        """标记事件为已读。"""
        async with self._db.session() as session:
            repository = ActivityEventSqlRepository(session)
            count = await repository.mark_as_read(event_ids=event_ids, user_id=user_id)
            await session.commit()
            return count

    # ---- 便捷方法：创建特定类型的事件 ----

    async def create_agent_created_event(
        self,
        agent_id: str,
        agent_name: str,
    ) -> ActivityEventRecord:
        """创建 Agent 创建事件。"""
        return await self.create_event(
            event_type=ActivityEventType.AGENT_CREATED,
            actor_type="user",
            target_type="agent",
            target_id=agent_id,
            summary=f"创建了 Agent {agent_name}",
        )

    async def create_room_created_event(
        self,
        room_id: str,
        room_name: str,
        agent_ids: Optional[list[str]] = None,
    ) -> ActivityEventRecord:
        """创建 Room 创建事件。"""
        return await self.create_event(
            event_type=ActivityEventType.ROOM_CREATED,
            actor_type="user",
            target_type="room",
            target_id=room_id,
            summary=f"创建了 Room {room_name}",
            metadata={"agent_ids": agent_ids or []},
        )

    async def create_room_message_event(
        self,
        room_id: str,
        sender_agent_id: str,
        sender_agent_name: str,
        content_preview: str,
    ) -> ActivityEventRecord:
        """创建 Room 消息事件。"""
        return await self.create_event(
            event_type=ActivityEventType.ROOM_MESSAGE,
            actor_type="agent",
            actor_id=sender_agent_id,
            target_type="room",
            target_id=room_id,
            summary=f"@{sender_agent_name} 在 Room 发送了消息",
            metadata={
                "content_preview": content_preview,
            },
        )

    async def create_dm_message_event(
        self,
        agent_id: str,
        agent_name: str,
    ) -> ActivityEventRecord:
        """创建 DM 消息事件。"""
        return await self.create_event(
            event_type=ActivityEventType.DM_MESSAGE,
            actor_type="user",
            target_type="agent",
            target_id=agent_id,
            summary=f"与 {agent_name} 的对话",
        )


activity_event_service = ActivityEventService()
