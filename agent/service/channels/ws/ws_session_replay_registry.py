# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：ws_session_replay_registry.py
# @Date   ：2026/04/07 13:27
# @Author ：leemysw
# 2026/04/07 13:27   Create
# =====================================================

"""Session 级 WebSocket 增量回放缓冲。"""

from __future__ import annotations

from collections import deque
from typing import Deque, Dict

from agent.schema.model_message import EventMessage
from agent.service.channels.ws.websocket_sender import WebSocketSender


class WsSessionReplayRegistry:
    """为单个 session 提供有限增量回放。"""

    def __init__(self) -> None:
        self._session_sequences: Dict[str, int] = {}
        self._session_replay_buffers: Dict[str, Deque[EventMessage]] = {}
        self._session_replay_buffer_size = 256

    def prepare_session_event(self, event: EventMessage) -> EventMessage:
        """为 durable 事件补齐 session_seq 并写入缓冲。"""
        session_key = event.session_key
        if not session_key or event.delivery_mode != "durable":
            return event

        if event.session_seq is not None:
            return event

        next_session_seq = self._session_sequences.get(session_key, 0) + 1
        self._session_sequences[session_key] = next_session_seq
        prepared_event = event.model_copy(update={"session_seq": next_session_seq})
        buffer = self._session_replay_buffers.setdefault(
            session_key,
            deque(maxlen=self._session_replay_buffer_size),
        )
        buffer.append(prepared_event)
        return prepared_event

    async def replay_session_events(
        self,
        sender: WebSocketSender,
        session_key: str,
        last_seen_session_seq: int,
    ) -> None:
        """向重连后的连接回放仍在缓冲区内的增量事件。"""
        latest_session_seq = self._session_sequences.get(session_key, 0)
        if latest_session_seq <= last_seen_session_seq:
            return

        buffer = list(self._session_replay_buffers.get(session_key, ()))
        if not buffer:
            await self._send_session_resync_required(
                sender=sender,
                session_key=session_key,
                last_seen_session_seq=last_seen_session_seq,
                latest_session_seq=latest_session_seq,
                buffer_start_session_seq=None,
            )
            return

        earliest_session_seq = buffer[0].session_seq
        if earliest_session_seq is None:
            return

        # 中文注释：客户端游标如果已经落到缓冲区之外，就不要再拼不完整增量，
        # 直接要求前端整段重拉当前会话。
        if last_seen_session_seq < earliest_session_seq - 1:
            await self._send_session_resync_required(
                sender=sender,
                session_key=session_key,
                last_seen_session_seq=last_seen_session_seq,
                latest_session_seq=latest_session_seq,
                buffer_start_session_seq=earliest_session_seq,
            )
            return

        replay_events = [
            event
            for event in buffer
            if (event.session_seq or 0) > last_seen_session_seq
        ]
        for replay_event in replay_events:
            await sender.send_event_message(replay_event)

    async def _send_session_resync_required(
        self,
        sender: WebSocketSender,
        session_key: str,
        last_seen_session_seq: int,
        latest_session_seq: int,
        buffer_start_session_seq: int | None,
    ) -> None:
        """通知前端当前 session 需要回源重拉。"""
        await sender.send_event_message(
            EventMessage(
                event_type="session_resync_required",
                delivery_mode="ephemeral",
                session_key=session_key,
                data={
                    "session_key": session_key,
                    "last_seen_session_seq": last_seen_session_seq,
                    "latest_session_seq": latest_session_seq,
                    "buffer_start_session_seq": buffer_start_session_seq,
                },
            )
        )


ws_session_replay_registry = WsSessionReplayRegistry()
