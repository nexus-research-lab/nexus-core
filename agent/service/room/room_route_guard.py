# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_route_guard.py
# @Date   ：2026/04/01 23:08
# @Author ：leemysw
# 2026/04/01 23:08   Create
# =====================================================

"""Room 路由归属校验服务。"""

from __future__ import annotations

from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.conversation_sql_repository import (
    ConversationSqlRepository,
)
from agent.infra.database.repositories.message_sql_repository import MessageSqlRepository
from agent.infra.database.repositories.room_sql_repository import RoomSqlRepository
from agent.infra.database.repositories.session_sql_repository import SessionSqlRepository
from agent.service.room.room_session_keys import (
    is_room_shared_session_key,
    parse_room_conversation_id,
)


class RoomRouteGuard:
    """校验 Room 相关 WS 路由参数是否一致。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    async def validate_subscription(
        self,
        room_id: str,
        conversation_id: str | None = None,
    ) -> None:
        """校验 room 订阅作用域。"""
        async with self._db.session() as session:
            room_repository = RoomSqlRepository(session)
            conversation_repository = ConversationSqlRepository(session)
            room = await room_repository.get(room_id)
            if room is None:
                raise ValueError("Room 不存在")
            if not conversation_id:
                return
            conversation = await conversation_repository.get(conversation_id)
            if conversation is None:
                raise ValueError("Conversation 不存在")
            if conversation.room_id != room_id:
                raise ValueError("Conversation 不属于该 Room")

    async def validate_interrupt(
        self,
        session_key: str,
        room_id: str | None = None,
        conversation_id: str | None = None,
        msg_id: str | None = None,
        target_agent_id: str | None = None,
    ) -> None:
        """校验 room interrupt 的目标范围。"""
        if not is_room_shared_session_key(session_key):
            return

        internal_conversation_id = parse_room_conversation_id(session_key)
        if not internal_conversation_id:
            raise ValueError("非法 Room session_key")
        if conversation_id and conversation_id != internal_conversation_id:
            raise ValueError("conversation_id 与 session_key 不一致")

        async with self._db.session() as session:
            conversation_repository = ConversationSqlRepository(session)
            message_repository = MessageSqlRepository(session)
            session_repository = SessionSqlRepository(session)

            conversation = await conversation_repository.get(internal_conversation_id)
            if conversation is None:
                raise ValueError("Conversation 不存在")
            if room_id and conversation.room_id != room_id:
                raise ValueError("room_id 与 conversation 不一致")

            if msg_id:
                message_record = await message_repository.get_message(msg_id)
                if message_record is None:
                    raise ValueError("message_id 不存在")
                if message_record.conversation_id != internal_conversation_id:
                    raise ValueError("message_id 不属于该 Conversation")
                if (
                    target_agent_id
                    and message_record.sender_agent_id
                    and message_record.sender_agent_id != target_agent_id
                ):
                    raise ValueError("message_id 与 target_agent_id 不一致")

            if target_agent_id and not msg_id:
                session_record = await session_repository.get_primary(
                    conversation_id=internal_conversation_id,
                    agent_id=target_agent_id,
                )
                if session_record is None:
                    raise ValueError("target_agent_id 不属于该 Conversation")


room_route_guard = RoomRouteGuard()
