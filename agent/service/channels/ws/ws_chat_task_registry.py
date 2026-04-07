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


class WsChatTaskRegistry:
    """托管跨连接存活的聊天任务。"""

    def __init__(self) -> None:
        self.tasks: dict[str, asyncio.Task] = {}

    def is_running(self, session_key: str) -> bool:
        """判断指定 session 是否有运行中的任务。"""
        task = self.tasks.get(session_key)
        return task is not None and not task.done()


ws_chat_task_registry = WsChatTaskRegistry()
