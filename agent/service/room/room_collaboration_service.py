#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_collaboration_service.py
# @Date   ：2026/3/30 00:00
# @Author ：leemysw
# 2026/3/30 00:00   Create
# =====================================================

"""Room 协作服务 — 处理多 Agent 间的消息通信。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from agent.infra.database.models.activity_event import ActivityEventType
from agent.infra.database.repositories.conversation_sql_repository import ConversationSqlRepository
from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.message_sql_repository import MessageSqlRepository
from agent.infra.database.repositories.room_sql_repository import RoomSqlRepository
from agent.infra.database.repositories.session_sql_repository import SessionSqlRepository
from agent.schema.model_chat_persistence import MessageRecord
from agent.schema.model_message import EventMessage, current_timestamp_ms
from agent.service.activity.activity_event_service import activity_event_service
from agent.service.room.room_session_keys import build_room_agent_session_key
from agent.utils.logger import logger
from agent.utils.utils import random_uuid

if TYPE_CHECKING:
    from agent.service.channels.ws.websocket_sender import WebSocketSender


class RoomCollaborationService:
    """处理 Room 内的多 Agent 协作逻辑。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")
        self._websocket_sender: WebSocketSender | None = None

    def set_websocket_sender(self, sender: WebSocketSender) -> None:
        """设置 WebSocket 发送器用于推送协作消息。"""
        self._websocket_sender = sender

    async def handle_agent_message(
        self,
        room_id: str,
        conversation_id: str,
        sender_agent_id: str,
        content: str,
    ) -> None:
        """处理 Agent 在 Room 内发送的消息。

        流程：
        1. 验证发送者是否是 Room 成员
        2. 保存消息到各 Agent 会话（作为系统消息）
        3. 通过 WebSocket 广播给所有在线的 Agent 会话
        4. 创建 Activity 事件

        Args:
            room_id: Room ID
            conversation_id: Conversation ID
            sender_agent_id: 发送消息的 Agent ID
            content: 消息内容
        """
        async with self._db.session() as session:
            room_repository = RoomSqlRepository(session)
            conversation_repository = ConversationSqlRepository(session)
            message_repository = MessageSqlRepository(session)

            # 1. 验证 Room 存在
            room_aggregate = await room_repository.get(room_id)
            if room_aggregate is None:
                logger.warning(f"Room not found: {room_id}")
                return

            # 2. 验证发送者是否是 Room 成员
            agent_members = [
                member
                for member in room_aggregate.members
                if member.member_type == "agent" and member.member_agent_id
            ]

            if not any(
                member.member_agent_id == sender_agent_id
                for member in agent_members
            ):
                logger.warning(
                    f"Agent {sender_agent_id} is not a member of room {room_id}"
                )
                return

            # 3. 为每个 Agent 会话保存消息（作为系统消息）
            for member in agent_members:
                agent_id = member.member_agent_id
                if agent_id == sender_agent_id:
                    # 发送者会话保存为自己的消息
                    agent_message = MessageRecord(
                        id=random_uuid(),
                        conversation_id=conversation_id,
                        session_id=None,
                        sender_type="agent",
                        sender_agent_id=sender_agent_id,
                        kind="text",
                        content_preview=content[:200],
                        jsonl_path=build_room_agent_session_key(
                            conversation_id=conversation_id,
                            agent_id=sender_agent_id,
                        ),
                        jsonl_offset=None,
                    )
                    await message_repository.upsert_message(agent_message)
                else:
                    # 其他 Agent 会话保存为系统通知消息
                    notification_message = MessageRecord(
                        id=random_uuid(),
                        conversation_id=conversation_id,
                        session_id=None,
                        sender_type="system",
                        sender_agent_id=None,
                        kind="event",
                        content_preview=f"@{sender_agent_id}: {content}"[:200],
                        jsonl_path=build_room_agent_session_key(
                            conversation_id=conversation_id,
                            agent_id=agent_id,
                        ),
                        jsonl_offset=None,
                    )
                    await message_repository.upsert_message(notification_message)

            # 4. 广播消息到所有在线的 Agent 会话
            await self.broadcast_to_room_sessions(
                room_id=room_id,
                conversation_id=conversation_id,
                message={
                    "type": "agent_message",
                    "room_id": room_id,
                    "conversation_id": conversation_id,
                    "sender_agent_id": sender_agent_id,
                    "content": content,
                    "timestamp": 0,
                },
            )

            # 5. 创建 Activity 事件
            await activity_event_service.create_event(
                event_type=ActivityEventType.ROOM_MESSAGE,
                actor_type="agent",
                actor_id=sender_agent_id,
                target_type="room",
                target_id=room_id,
                summary=f"@{sender_agent_id} 在 {room_aggregate.room.name or 'Room'} 发送了消息",
                metadata={
                    "conversation_id": conversation_id,
                    "content_preview": content[:100],
                },
            )

            await session.commit()
            logger.info(
                f"✅ Agent message broadcasted: room={room_id}, "
                f"sender={sender_agent_id}, content={content[:50]}"
            )

    async def broadcast_to_room_sessions(
        self,
        room_id: str,
        conversation_id: str,
        message: dict,
    ) -> None:
        """向 Room 内所有 Agent 会话广播消息。

        Args:
            room_id: Room ID
            conversation_id: Conversation ID
            message: 要广播的消息内容
        """
        if not self._websocket_sender:
            logger.warning("WebSocket sender not set, cannot broadcast message")
            return

        async with self._db.session() as session:
            room_repository = RoomSqlRepository(session)
            conversation_repository = ConversationSqlRepository(session)
            session_repository = SessionSqlRepository(session)

            # 获取 Room 内所有 Agent 会话
            room_aggregate = await room_repository.get(room_id)
            if room_aggregate is None:
                return

            conversation = await conversation_repository.get(conversation_id)
            if conversation is None or conversation.room_id != room_id:
                logger.warning(
                    f"Conversation {conversation_id} not found in room {room_id}"
                )
                return

            # 获取所有 Agent 会话
            sessions = await session_repository.list_by_conversation(conversation_id)

            # 为每个 Agent 会话构建 session_key
            for session_record in sessions:
                session_key = build_room_agent_session_key(
                    conversation_id=conversation_id,
                    agent_id=session_record.agent_id,
                )

                # 构建协作消息事件
                collaboration_event = {
                    "message_type": str(message.get("type") or "room_broadcast"),
                    "room_id": room_id,
                    "conversation_id": conversation_id,
                    "sender_agent_id": message.get("sender_agent_id"),
                    "content": message.get("content"),
                }

                await self._websocket_sender.send_event_message(
                    EventMessage(
                        event_type="room_collaboration",
                        session_key=session_key,
                        room_id=room_id,
                        conversation_id=conversation_id,
                        agent_id=session_record.agent_id,
                        data=collaboration_event,
                        timestamp=current_timestamp_ms(),
                    )
                )

    async def get_room_session_keys(
        self,
        room_id: str,
        conversation_id: str,
    ) -> list[str]:
        """获取 Room 内指定对话的所有 session_key。

        用于前端切换 Agent 时获取可用的会话。

        Returns:
            Session key 列表
        """
        async with self._db.session() as session:
            room_repository = RoomSqlRepository(session)
            conversation_repository = ConversationSqlRepository(session)
            session_repository = SessionSqlRepository(session)

            room_aggregate = await room_repository.get(room_id)
            if room_aggregate is None:
                return []

            conversation = await conversation_repository.get(conversation_id)
            if conversation is None or conversation.room_id != room_id:
                logger.warning(
                    f"Conversation {conversation_id} not found in room {room_id}"
                )
                return []

            sessions = await session_repository.list_by_conversation(conversation_id)
            return [
                build_room_agent_session_key(
                    conversation_id=conversation_id,
                    agent_id=session_record.agent_id,
                )
                for session_record in sessions
            ]


room_collaboration_service = RoomCollaborationService()
