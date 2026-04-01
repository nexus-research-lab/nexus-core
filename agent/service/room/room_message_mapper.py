# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：room_message_mapper.py
# @Date   ：2026/04/01 17:08
# @Author ：leemysw
# 2026/04/01 17:08   Create
# =====================================================

"""Room 消息索引映射工具。"""

from __future__ import annotations

from typing import Optional

from agent.schema.model_message import Message


def infer_sender_type(message: Message) -> str:
    """推导消息发送方类型。"""
    if message.role == "user":
        return "user"
    if message.role == "assistant":
        return "agent"
    return "system"


def infer_kind(message: Message) -> str:
    """推导消息索引类型。"""
    if message.role == "result":
        return "error" if message.is_error or message.subtype == "error" else "event"
    if isinstance(message.content, list):
        content_types = {str(getattr(block, "type", "")) for block in message.content}
        if "tool_result" in content_types:
            return "tool_result"
        if "tool_use" in content_types:
            return "tool_call"
    return "text"


def infer_status(message: Message) -> str:
    """推导消息状态机终态。"""
    if message.role == "assistant":
        return "completed" if message.is_complete or message.stop_reason else "streaming"
    if message.role == "result":
        if message.subtype == "interrupted":
            return "cancelled"
        if message.is_error or message.subtype == "error":
            return "error"
    return "completed"


def infer_round_status(message: Message) -> str:
    """推导轮次终态。"""
    if message.subtype == "interrupted":
        return "cancelled"
    if message.is_error or message.subtype == "error":
        return "error"
    return "success"


def build_preview(message: Message) -> Optional[str]:
    """生成用于列表展示的消息预览。"""
    if message.result:
        return message.result[:120]
    if isinstance(message.content, str):
        return message.content[:120]
    if isinstance(message.content, list):
        for block in message.content:
            text = getattr(block, "text", None) or getattr(block, "thinking", None)
            if text:
                return str(text)[:120]
            tool_name = getattr(block, "name", None)
            if tool_name:
                return f"[tool] {tool_name}"[:120]
    return None
