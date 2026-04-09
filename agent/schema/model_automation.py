# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：model_automation.py
# @Date   ：2026/4/9
# @Author ：Codex
# 2026/4/9   Create
# =====================================================

"""Automation 域数据模型。"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from agent.infra.schemas.model_cython import AModel

# 中文注释：这些 Literal 把调度、会话和投递模式限定在受控枚举内，避免上层直接塞任意字符串。
AutomationDeliveryMode = Literal["none", "direct", "thread"]
AutomationSessionTargetKind = Literal["isolated", "bound", "named"]
AutomationSessionWakeMode = Literal["next-heartbeat", "immediate"]
AutomationCronScheduleKind = Literal["every", "cron", "at"]
AutomationHeartbeatTargetMode = Literal["none", "delivery", "session"]


class AutomationDeliveryTarget(AModel):
    mode: AutomationDeliveryMode = "none"
    channel: str | None = None
    to: str | None = None
    account_id: str | None = None
    thread_id: str | None = None


class AutomationSessionTarget(AModel):
    kind: AutomationSessionTargetKind = "isolated"
    bound_session_key: str | None = None
    named_session_key: str | None = None
    wake_mode: AutomationSessionWakeMode = "next-heartbeat"


class AutomationCronSchedule(AModel):
    kind: AutomationCronScheduleKind
    run_at: str | None = None
    interval_seconds: int | None = None
    cron_expression: str | None = None
    timezone: str | None = "Asia/Shanghai"


class AutomationCronJobCreate(AModel):
    name: str
    agent_id: str
    schedule: AutomationCronSchedule
    instruction: str
    session_target: AutomationSessionTarget = Field(default_factory=AutomationSessionTarget)
    delivery: AutomationDeliveryTarget = Field(default_factory=AutomationDeliveryTarget)
    enabled: bool = True


class AutomationHeartbeatConfig(AModel):
    agent_id: str
    enabled: bool = False
    every_seconds: int = 1800
    target_mode: AutomationHeartbeatTargetMode = "none"
    ack_max_chars: int = 300
