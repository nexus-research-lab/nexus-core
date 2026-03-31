#!/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：api_activity.py
# @Date   ：2026/3/30 00:00
# @Author ：leemysw
# 2026/3/30 00:00   Create
# =====================================================

"""Activity API。"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agent.infra.server.common import resp
from agent.service.activity.activity_event_service import activity_event_service

router = APIRouter(tags=["activity"])


class MarkAsReadRequest(BaseModel):
    """标记事件为已读请求。"""

    event_ids: list[str] = Field(..., description="要标记的事件 ID 列表")


@router.get("/activity")
async def list_activity(
    limit: int = Query(default=50, ge=1, le=200, description="返回数量限制"),
    offset: int = Query(default=0, ge=0, description="分页偏移"),
    event_type: Optional[str] = Query(default=None, description="按事件类型筛选"),
    unread_only: bool = Query(default=False, description="仅返回未读事件"),
):
    """获取活动事件列表。"""
    try:
        events = await activity_event_service.list_events(
            limit=limit,
            offset=offset,
            event_type=event_type,
            unread_only=unread_only,
        )
        return resp.ok(resp.Resp(data=[event.model_dump(mode="json") for event in events]))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/activity/read")
async def mark_activity_read(request: MarkAsReadRequest):
    """标记事件为已读。"""
    try:
        marked_count = await activity_event_service.mark_as_read(
            event_ids=request.event_ids,
        )
        return resp.ok(resp.Resp(data={"marked_count": marked_count}))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/activity/unread-count")
async def get_unread_count():
    """获取未读事件数量。"""
    try:
        count = await activity_event_service.get_unread_count()
        return resp.ok(resp.Resp(data={"unread_count": count}))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
