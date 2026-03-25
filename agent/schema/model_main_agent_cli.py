# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：model_main_agent_cli.py
# @Date   ：2026/03/26 11:10
# @Author ：leemysw
# 2026/03/26 11:10   Create
# =====================================================

"""main agent CLI 参数类型。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ListAgentsCommand(BaseModel):
    """列出成员命令。"""

    include_main: bool = Field(default=False, description="是否包含 main agent")


class ValidateAgentNameCommand(BaseModel):
    """校验成员名称命令。"""

    name: str = Field(..., description="待校验的 agent 名称")


class CreateAgentCommand(BaseModel):
    """创建成员命令。"""

    name: str = Field(..., description="agent 名称")
    model: str | None = Field(default=None, description="模型标识")


class ListRoomsCommand(BaseModel):
    """列出房间命令。"""

    limit: int = Field(default=20, description="数量上限")


class CreateRoomCommand(BaseModel):
    """创建 room 命令。"""

    agent_ids: list[str] = Field(..., description="成员 agent_id 列表")
    name: str | None = Field(default=None, description="room 名称")
    title: str | None = Field(default=None, description="首条对话标题")
    description: str = Field(default="", description="room 描述")


class AddRoomMemberCommand(BaseModel):
    """追加 room 成员命令。"""

    room_id: str = Field(..., description="room_id")
    agent_id: str = Field(..., description="待追加的 agent_id")
