# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_session_keys.py
# @Date   ：2026/03/31 14:20
# @Author ：leemysw
# 2026/03/31 14:20   Create
# =====================================================

"""Room 会话键工具。"""

from __future__ import annotations

from typing import Optional

from agent.service.session.session_router import build_session_key

ROOM_SHARED_SESSION_PREFIX = "room:group:"


def build_room_shared_session_key(conversation_id: str) -> str:
    """构建 Room 共享消息流的 session_key。"""
    return f"{ROOM_SHARED_SESSION_PREFIX}{conversation_id}"


def is_room_shared_session_key(session_key: str) -> bool:
    """判断是否为 Room 共享消息流键。"""
    return session_key.startswith(ROOM_SHARED_SESSION_PREFIX)


def parse_room_conversation_id(session_key: str) -> Optional[str]:
    """从 Room 共享消息流键中提取 conversation_id。"""
    if not is_room_shared_session_key(session_key):
        return None
    conversation_id = session_key[len(ROOM_SHARED_SESSION_PREFIX):].strip()
    return conversation_id or None


def build_room_agent_session_key(
    conversation_id: str,
    agent_id: str,
    room_type: str = "room",
) -> str:
    """构建 Room 成员的 SDK 会话键。"""
    chat_type = "dm" if room_type == "dm" else "group"
    return build_session_key(
        channel="ws",
        chat_type=chat_type,
        ref=conversation_id,
        agent_id=agent_id,
    )
