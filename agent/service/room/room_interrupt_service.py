# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_interrupt_service.py
# @Date   ：2026/04/01 22:20
# @Author ：leemysw
# 2026/04/01 22:20   Create
# =====================================================

"""Room 中断状态修复服务。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.conversation_sql_repository import (
    ConversationSqlRepository,
)
from agent.infra.database.repositories.message_sql_repository import MessageSqlRepository
from agent.infra.database.repositories.session_sql_repository import SessionSqlRepository
from agent.service.room.room_message_store import room_message_store
from agent.service.room.room_round_store import room_round_store
from agent.service.room.room_session_keys import parse_room_conversation_id


class RoomInterruptService:
    """负责把 Room 中断收口到统一状态机。"""

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    @staticmethod
    def _matches_round(candidate_round_id: str | None, root_round_id: str) -> bool:
        """判断某个 round 是否属于指定的用户轮次。"""
        if not candidate_round_id:
            return False
        return (
            candidate_round_id == root_round_id
            or candidate_round_id.startswith(f"{root_round_id}:")
        )

    async def resolve_round_id(
        self,
        session_key: str,
        round_id: str | None,
    ) -> str | None:
        """解析本次中断目标的用户轮次。"""
        if round_id:
            return round_id

        messages = await room_message_store.get_messages(session_key)
        for message in reversed(messages):
            if message.role == "user" and message.round_id:
                return message.round_id
        return None

    async def repair_cancelled_slots(
        self,
        session_key: str,
        round_id: str,
    ) -> dict[str, Any]:
        """把仍处于 pending/streaming 的 slot 统一修复为 cancelled。"""
        conversation_id = parse_room_conversation_id(session_key)
        if not conversation_id:
            return {
                "room_id": None,
                "conversation_id": None,
                "slots": [],
            }

        finished_at = datetime.now()
        async with self._db.session() as session:
            conversation_repository = ConversationSqlRepository(session)
            message_repository = MessageSqlRepository(session)
            session_repository = SessionSqlRepository(session)

            conversation = await conversation_repository.get(conversation_id)
            room_sessions = await session_repository.list_by_conversation(conversation_id)
            session_by_id = {
                session_record.id: session_record
                for session_record in room_sessions
                if session_record.is_primary
            }

            inflight_messages = await message_repository.list_inflight_by_conversation_round(
                conversation_id=conversation_id,
                root_round_id=round_id,
            )
            repaired_slots: list[dict[str, str]] = []
            affected_rounds: dict[tuple[str, str], str | None] = {}

            for message_record in inflight_messages:
                await message_repository.update_message_status(
                    message_id=message_record.id,
                    status="cancelled",
                    updated_at=finished_at,
                )
                session_record = session_by_id.get(message_record.session_id or "")
                repaired_slots.append(
                    {
                        "msg_id": message_record.id,
                        "agent_id": (
                            message_record.sender_agent_id
                            or (session_record.agent_id if session_record else "")
                        ),
                        "round_id": message_record.round_id or round_id,
                    }
                )
                if message_record.session_id and message_record.round_id:
                    affected_rounds[(message_record.session_id, message_record.round_id)] = message_record.id

            await session.commit()

        for (session_id, slot_round_id), message_id in affected_rounds.items():
            await room_round_store.finish_round(
                session_id=session_id,
                round_id=slot_round_id,
                status="cancelled",
                finished_at_ms=int(finished_at.timestamp() * 1000),
                metadata={"message_id": message_id},
            )

        return {
            "room_id": conversation.room_id if conversation else None,
            "conversation_id": conversation_id,
            "slots": repaired_slots,
        }


room_interrupt_service = RoomInterruptService()
