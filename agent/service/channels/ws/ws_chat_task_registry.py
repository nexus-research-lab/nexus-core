# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：ws_chat_task_registry.py
# @Date   ：2026/04/07 13:02
# @Author ：leemysw
# 2026/04/07 13:02   Create
# =====================================================

"""WebSocket 运行中聊天任务注册表。"""

import asyncio
import uuid
from collections import defaultdict
from typing import Any, Awaitable, Callable, DefaultDict, Dict, Optional

from agent.utils.logger import logger

AgentRuntimeListener = Callable[[dict[str, Any]], Awaitable[None]]


class WsChatTaskRegistry:
    """托管跨连接存活的聊天任务。"""

    def __init__(self) -> None:
        self.tasks: dict[str, asyncio.Task] = {}
        self._round_ids: dict[str, str] = {}
        self._agent_tasks: dict[str, asyncio.Task] = {}
        self._agent_ids: dict[str, str] = {}
        self._agent_round_ids: dict[str, str] = {}
        self._runtime_listeners: DefaultDict[str, Dict[str, AgentRuntimeListener]] = defaultdict(dict)
        self._runtime_subscriptions: Dict[str, str] = {}

    def register(self, session_key: str, task: asyncio.Task, round_id: Optional[str]) -> None:
        """注册运行中的会话任务。"""
        self.tasks[session_key] = task
        if round_id:
            self._round_ids[session_key] = round_id
        else:
            self._round_ids.pop(session_key, None)

    def unregister(self, session_key: str, task: Optional[asyncio.Task] = None) -> None:
        """注销会话任务，仅移除当前仍匹配的任务。"""
        current_task = self.tasks.get(session_key)
        if task is not None and current_task is not task:
            return
        self.tasks.pop(session_key, None)
        self._round_ids.pop(session_key, None)

    def is_running(self, session_key: str) -> bool:
        """判断指定 session 是否有运行中的任务。"""
        task = self.tasks.get(session_key)
        return task is not None and not task.done()

    def get_running_round_id(self, session_key: str) -> Optional[str]:
        """返回指定 session 当前运行的 round_id。"""
        if not self.is_running(session_key):
            return None
        return self._round_ids.get(session_key)

    def get_running_round_ids(self, session_key: str) -> list[str]:
        """返回指定 session 当前运行中的 round_id 列表。"""
        round_id = self.get_running_round_id(session_key)
        return [round_id] if round_id else []

    def register_agent_task(
        self,
        task_key: str,
        agent_id: str,
        task: asyncio.Task,
        round_id: Optional[str],
    ) -> None:
        """注册 agent 维度的运行中任务。"""
        if not task_key or not agent_id:
            return
        self._agent_tasks[task_key] = task
        self._agent_ids[task_key] = agent_id
        if round_id:
            self._agent_round_ids[task_key] = round_id
        else:
            self._agent_round_ids.pop(task_key, None)
        self._publish_agent_runtime_snapshot(agent_id)

    def unregister_agent_task(
        self,
        task_key: str,
        task: Optional[asyncio.Task] = None,
    ) -> None:
        """注销 agent 维度任务，仅移除当前仍匹配的任务。"""
        current_task = self._agent_tasks.get(task_key)
        if task is not None and current_task is not task:
            return
        agent_id = self._agent_ids.pop(task_key, None)
        self._agent_tasks.pop(task_key, None)
        self._agent_round_ids.pop(task_key, None)
        if agent_id:
            self._publish_agent_runtime_snapshot(agent_id)

    def subscribe_agent_runtime(
        self,
        agent_id: str,
        listener: AgentRuntimeListener,
    ) -> str:
        """订阅指定 agent 的运行态变更。"""
        token = str(uuid.uuid4())
        self._runtime_listeners[agent_id][token] = listener
        self._runtime_subscriptions[token] = agent_id
        return token

    def unsubscribe_agent_runtime(self, token: str) -> None:
        """取消订阅指定 agent 的运行态变更。"""
        agent_id = self._runtime_subscriptions.pop(token, None)
        if not agent_id:
            return
        listeners = self._runtime_listeners.get(agent_id)
        if not listeners:
            return
        listeners.pop(token, None)
        if not listeners:
            self._runtime_listeners.pop(agent_id, None)

    def build_agent_runtime_snapshot(self, agent_id: str) -> dict[str, Any]:
        """构建单个 agent 的运行态快照。"""
        self._prune_finished_agent_tasks()
        running_task_count = sum(
            1
            for task_key, current_agent_id in self._agent_ids.items()
            if current_agent_id == agent_id
            and (task := self._agent_tasks.get(task_key)) is not None
            and not task.done()
        )
        return {
            "agent_id": agent_id,
            "running_task_count": running_task_count,
            "status": "running" if running_task_count > 0 else "idle",
        }

    def build_agent_runtime_snapshots(self, agent_ids: list[str]) -> list[dict[str, Any]]:
        """构建指定 agent 集合的运行态快照。"""
        return [self.build_agent_runtime_snapshot(agent_id) for agent_id in agent_ids]

    def _prune_finished_agent_tasks(self) -> None:
        """清理已经结束的 agent 任务，避免快照残留脏数据。"""
        stale_task_keys = [
            task_key
            for task_key, task in self._agent_tasks.items()
            if task.done()
        ]
        for task_key in stale_task_keys:
            self.unregister_agent_task(task_key)

    def _publish_agent_runtime_snapshot(self, agent_id: str) -> None:
        """向订阅者广播指定 agent 的最新运行态。"""
        listeners = list(self._runtime_listeners.get(agent_id, {}).values())
        if not listeners:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            logger.warning("⚠️ 当前无运行中的事件循环，忽略 agent 运行态事件")
            return
        snapshot = self.build_agent_runtime_snapshot(agent_id)
        loop.create_task(self._dispatch_agent_runtime_snapshot(listeners, snapshot))

    async def _dispatch_agent_runtime_snapshot(
        self,
        listeners: list[AgentRuntimeListener],
        snapshot: dict[str, Any],
    ) -> None:
        """异步分发 agent 运行态快照。"""
        await asyncio.gather(
            *(listener(snapshot) for listener in listeners),
            return_exceptions=True,
        )


ws_chat_task_registry = WsChatTaskRegistry()
