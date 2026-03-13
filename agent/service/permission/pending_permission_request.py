# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：pending_permission_request.py
# @Date   ：2026/3/14 12:23
# @Author ：leemysw
# 2026/3/14 12:23   Create
# =====================================================

"""挂起中的权限请求模型。"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class PendingPermissionRequest:
    """挂起中的权限请求。"""

    request_id: str
    session_key: str
    tool_name: str
    input_data: dict[str, Any]
    event: asyncio.Event
    expires_at: datetime
