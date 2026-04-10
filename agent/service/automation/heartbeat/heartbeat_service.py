# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：heartbeat_service.py
# @Date   ：2026/4/10
# @Author ：Codex
# 2026/4/10   Create
# =====================================================

"""Automation heartbeat 服务门面。"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from agent.infra.schemas.model_cython import AModel
from agent.schema.model_automation import AutomationHeartbeatConfig, AutomationSessionWakeMode
from agent.service.automation.heartbeat.heartbeat_scheduler import HeartbeatScheduler

if TYPE_CHECKING:
    from agent.service.automation.heartbeat.heartbeat_dispatcher import HeartbeatDispatcher
    from agent.service.automation.heartbeat.heartbeat_state_store import HeartbeatStateStore
    from agent.service.automation.runtime.system_event_queue import SystemEventQueue


class HeartbeatStatus(AModel):
    """Heartbeat 状态与配置快照。"""

    agent_id: str
    enabled: bool = False
    every_seconds: int = 1800
    target_mode: str = "none"
    ack_max_chars: int = 300
    running: bool = False
    pending_wake: bool = False
    next_run_at: datetime | None = None
    last_heartbeat_at: datetime | None = None
    last_ack_at: datetime | None = None


class HeartbeatWakeResult(AModel):
    """Wake API 返回体。"""

    agent_id: str
    mode: AutomationSessionWakeMode
    scheduled: bool = False


class HeartbeatService:
    """对外提供 heartbeat 生命周期、状态与 wake 能力。"""

    def __init__(
        self,
        *,
        state_store: HeartbeatStateStore | None = None,
        scheduler: HeartbeatScheduler | None = None,
        dispatcher: HeartbeatDispatcher | None = None,
        system_event_queue: SystemEventQueue | None = None,
    ) -> None:
        if state_store is None:
            from agent.service.automation.heartbeat.heartbeat_state_store import HeartbeatStateStore

            state_store = HeartbeatStateStore()
        if system_event_queue is None:
            from agent.service.automation.runtime.system_event_queue import SystemEventQueue

            system_event_queue = SystemEventQueue()
        if dispatcher is None:
            from agent.service.automation.heartbeat.heartbeat_dispatcher import HeartbeatDispatcher

            dispatcher = HeartbeatDispatcher(system_event_queue=system_event_queue)

        self._state_store = state_store
        self._system_event_queue = system_event_queue
        self._dispatcher = dispatcher
        self._scheduler = scheduler or HeartbeatScheduler(
            dispatcher=self._dispatcher,
        )

    async def start(self) -> None:
        """启动 heartbeat 运行态。"""
        await self._scheduler.start()

    async def stop(self) -> None:
        """停止 heartbeat 运行态。"""
        await self._scheduler.stop()

    def set_channel_register(self, channel_register) -> None:
        """绑定 app 生命周期维护的通道注册表。"""
        self._dispatcher.set_channel_register(channel_register)

    async def get_status(self, agent_id: str) -> HeartbeatStatus:
        """读取配置与调度运行态。"""
        config, row = await self._load_config(agent_id)
        await self._scheduler.sync_agent(agent_id, config)
        runtime = self._scheduler.get_runtime_status(agent_id)
        return HeartbeatStatus(
            agent_id=agent_id,
            enabled=config.enabled,
            every_seconds=config.every_seconds,
            target_mode=config.target_mode,
            ack_max_chars=config.ack_max_chars,
            running=bool(runtime.get("running")),
            pending_wake=bool(runtime.get("pending_wake")),
            next_run_at=runtime.get("next_run_at"),
            last_heartbeat_at=getattr(row, "last_heartbeat_at", None),
            last_ack_at=getattr(row, "last_ack_at", None),
        )

    async def wake(
        self,
        *,
        agent_id: str,
        mode: AutomationSessionWakeMode,
        text: str | None = None,
    ) -> HeartbeatWakeResult:
        """登记一次 heartbeat wake 请求。"""
        config, _row = await self._load_config(agent_id)
        await self._scheduler.sync_agent(agent_id, config)
        if text:
            await self._system_event_queue.enqueue(
                event_type="heartbeat.wake",
                source_type="heartbeat",
                source_id=agent_id,
                payload={
                    "agent_id": agent_id,
                    "text": text,
                    "wake_mode": mode,
                },
            )
        wake = await self._scheduler.request_wake(agent_id=agent_id, mode=mode)
        return HeartbeatWakeResult(
            agent_id=agent_id,
            mode=mode,
            scheduled=bool(wake.get("scheduled")),
        )

    async def _load_config(self, agent_id: str) -> tuple[AutomationHeartbeatConfig, object | None]:
        row = await self._state_store.get_state(agent_id)
        if row is None:
            return AutomationHeartbeatConfig(agent_id=agent_id), None
        return (
            AutomationHeartbeatConfig(
                agent_id=agent_id,
                enabled=bool(row.enabled),
                every_seconds=int(row.every_seconds),
                target_mode=str(row.target_mode),
                ack_max_chars=int(row.ack_max_chars),
            ),
            row,
        )


heartbeat_service = HeartbeatService()
