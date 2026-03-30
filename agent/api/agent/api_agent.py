# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：api_agent.py
# @Date   ：2026/3/13 14:36
# @Author ：leemysw
# 2026/3/13 14:36   Create
# =====================================================

"""Agent CRUD + 会话/成本 API。"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from agent.schema.model_agent import AAgent, CreateAgentRequest, UpdateAgentRequest
from agent.schema.model_cost import AgentCostSummary
from agent.service.agent.agent_service import agent_service
from agent.infra.server.common import resp

router = APIRouter(tags=["agent"])


@router.get("/agents", response_model=List[AAgent])
async def get_agents():
    """获取所有 Agent 列表。"""
    agents = await agent_service.get_agents()
    return resp.ok(resp.Resp(data=[agent.model_dump() for agent in agents]))


@router.post("/agents")
async def create_agent(request: CreateAgentRequest):
    """创建新 Agent。"""
    try:
        agent = await agent_service.create_agent(
            name=request.name,
            options=request.options,
            avatar=request.avatar,
            description=request.description,
            vibe_tags=request.vibe_tags,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return resp.ok(resp.Resp(data=agent.model_dump()))


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """获取 Agent 配置。"""
    try:
        agent = await agent_service.get_agent(agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=agent.model_dump()))


@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """更新 Agent 配置。"""
    try:
        agent = await agent_service.update_agent(
            agent_id=agent_id,
            name=request.name,
            options=request.options,
            avatar=request.avatar,
            description=request.description,
            vibe_tags=request.vibe_tags,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=agent.model_dump()))


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """删除 Agent。"""
    try:
        await agent_service.delete_agent(agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data={"success": True}))


@router.get("/agents/validate/name")
async def validate_agent_name(name: str, exclude_agent_id: Optional[str] = None):
    """校验 Agent 名称是否合法、是否重复。"""
    result = await agent_service.validate_agent_name(name, exclude_agent_id=exclude_agent_id)
    return resp.ok(resp.Resp(data=result.model_dump()))


@router.get("/agents/{agent_id}/sessions")
async def get_agent_sessions(agent_id: str):
    """获取 Agent 下的所有会话。"""
    try:
        sessions = await agent_service.get_agent_sessions(agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=[session.model_dump() for session in sessions]))


@router.get("/agents/{agent_id}/cost/summary", response_model=AgentCostSummary)
async def get_agent_cost_summary(agent_id: str):
    """获取 Agent 成本汇总。"""
    try:
        summary = await agent_service.get_agent_cost_summary(agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=summary.model_dump(mode="json")))
