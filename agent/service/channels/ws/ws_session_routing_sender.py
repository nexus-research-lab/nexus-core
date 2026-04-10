# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：ws_session_routing_sender.py
# @Date   ：2026/04/07 13:02
# @Author ：leemysw
# 2026/04/07 13:02   Create
# =====================================================

"""按 session_key 路由到当前活跃连接的发送器。"""

import asyncio

from agent.schema.model_message import (
    EventMessage,
    Message,
    StreamMessage,
    build_transport_event,
)
from agent.service.channels.message_sender import MessageSender
from agent.service.channels.ws.websocket_sender import WebSocketSender
from agent.service.channels.ws.ws_session_replay_registry import (
    ws_session_replay_registry,
)
from agent.service.permission.permission_runtime_context import (
    permission_runtime_context,
)
from agent.utils.logger import logger


class WsSessionRoutingSender(MessageSender):
    """将消息转发到某个 session 的全部绑定 WebSocket 连接。"""

    def __init__(self, fallback_sender: WebSocketSender) -> None:
        self._fallback_sender = fallback_sender

    async def send_message(self, message: Message) -> None:
        """发送完整消息。"""
        await self._forward_event(build_transport_event(message))

    async def send_stream_message(self, message: StreamMessage) -> None:
        """发送流式消息。"""
        await self._forward_event(build_transport_event(message))

    async def send_event_message(self, event: EventMessage) -> None:
        """发送事件消息。"""
        await self._forward_event(event)

    async def _forward_event(self, event: EventMessage) -> None:
        """把消息发给当前 session 的全部绑定连接。"""
        session_key = event.session_key
        prepared_event = ws_session_replay_registry.prepare_session_event(event)

        if not session_key:
            await self._fallback_sender.send_event_message(prepared_event)
            return

        session_senders = permission_runtime_context.resolve_session_senders(session_key)
        if not session_senders:
            # 中文注释：断线期间不应把后台运行链打断。
            # 当前没有活跃连接时直接跳过实时推送，等待前端重连后继续接收增量，
            # 并依靠前端重拉补齐断线期间已落库的完整消息。
            logger.debug("📭 当前无绑定连接，跳过实时推送: session=%s", session_key)
            return

        await asyncio.gather(
            *(sender.send(prepared_event) for sender in session_senders),
            return_exceptions=True,
        )
