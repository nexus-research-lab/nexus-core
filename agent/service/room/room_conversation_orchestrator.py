# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_conversation_orchestrator.py
# @Date   ：2026/04/01 17:36
# @Author ：leemysw
# 2026/04/01 17:36   Create
# =====================================================

"""Room 共享上下文编排器。"""

from __future__ import annotations

from datetime import datetime

from agent.infra.database.get_db import get_db
from agent.infra.database.repositories.message_sql_repository import MessageSqlRepository
from agent.schema.model_message import Message
from agent.service.room.room_message_store import room_message_store
from agent.service.room.room_session_keys import build_room_shared_session_key


class RoomConversationOrchestrator:
    """基于 SQL 完成态索引组装 Room 共享快照。"""

    _MAX_HISTORY_MESSAGES = 80
    _MAX_HISTORY_CHARS = 12_000

    def __init__(self) -> None:
        self._db = get_db("async_sqlite")

    async def build_dispatch_query(
        self,
        conversation_id: str,
        latest_user_message: str,
        trigger_timestamp_ms: int,
        agent_name_by_id: dict[str, str],
        target_agent_id: str,
    ) -> str:
        """组装发送给目标 Agent 的共享快照查询。"""
        history_lines = await self._build_history_lines(
            conversation_id=conversation_id,
            trigger_timestamp_ms=trigger_timestamp_ms,
            agent_name_by_id=agent_name_by_id,
        )
        if not history_lines:
            return latest_user_message

        roster = "、".join(sorted(set(agent_name_by_id.values())))
        target_name = agent_name_by_id.get(target_agent_id, target_agent_id)
        history_block = "\n".join(history_lines)
        return (
            f"你正在 Nexus 的多人协作 Room 中，以成员 {target_name} 的身份响应新消息。\n"
            "以下 `<shared_history>` 是当前轮次开始前已经完成的共享上下文快照。\n"
            "规则：\n"
            "1. 只把 `<shared_history>` 里的内容当作权威公共历史。\n"
            "2. 不要把未完成、被取消或报错的回复当作事实。\n"
            "3. 你自己的 workspace 和记忆仍可使用，但公共协作上下文以当前快照为准。\n"
            f"Room 成员：{roster or '未知成员'}\n\n"
            "<shared_history>\n"
            f"{history_block}\n"
            "</shared_history>\n\n"
            "<latest_user_message>\n"
            f"{latest_user_message}\n"
            "</latest_user_message>"
        )

    async def _build_history_lines(
        self,
        conversation_id: str,
        trigger_timestamp_ms: int,
        agent_name_by_id: dict[str, str],
    ) -> list[str]:
        """只读取当前轮次开始前已完成的共享消息。"""
        cutoff = datetime.fromtimestamp(trigger_timestamp_ms / 1000)
        async with self._db.session() as session:
            repository = MessageSqlRepository(session)
            records = await repository.list_completed_before(
                conversation_id=conversation_id,
                before=cutoff,
                limit=400,
            )

        if not records:
            return []

        shared_messages = await room_message_store.get_messages(
            build_room_shared_session_key(conversation_id)
        )
        message_map = {
            message.message_id: message
            for message in shared_messages
        }

        # 先按 SQL 完成态排序，再从 JSONL 回填正文，确保共享历史只消费 completed 终态。
        history_lines: list[str] = []
        history_chars = 0
        ordered_messages = [
            message_map[record.id]
            for record in records
            if record.id in message_map
        ]
        for message in ordered_messages[-self._MAX_HISTORY_MESSAGES:]:
            line = self._format_history_line(message, agent_name_by_id)
            if not line:
                continue
            next_chars = history_chars + len(line) + 1
            if next_chars > self._MAX_HISTORY_CHARS:
                break
            history_lines.append(line)
            history_chars = next_chars

        return history_lines

    def _format_history_line(
        self,
        message: Message,
        agent_name_by_id: dict[str, str],
    ) -> str:
        """把共享消息标准化为可注入 LLM 的历史行。"""
        content = self._extract_message_text(message)
        if not content:
            return ""

        if message.role == "user":
            return f"User: {content}"
        if message.role == "assistant":
            agent_name = agent_name_by_id.get(message.agent_id, message.agent_id or "Assistant")
            return f"Assistant({agent_name}): {content}"
        return ""

    @staticmethod
    def _extract_message_text(message: Message) -> str:
        """提取共享历史中可读的正文。"""
        if message.role == "result":
            return ""
        if isinstance(message.content, str):
            return message.content.strip()
        if not isinstance(message.content, list):
            return ""

        parts: list[str] = []
        for block in message.content:
            text = getattr(block, "text", None) or getattr(block, "thinking", None)
            if text:
                normalized = str(text).strip()
                if normalized:
                    parts.append(normalized)
                    continue
            tool_name = getattr(block, "name", None)
            if tool_name:
                parts.append(f"[tool] {tool_name}")
        return "\n".join(parts).strip()


room_conversation_orchestrator = RoomConversationOrchestrator()
