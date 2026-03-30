# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：api_agent_skill.py
# @Date   ：2026/3/30
# @Author ：leemysw
# 2026/3/30   从 api_agent.py 拆分
# =====================================================

"""Agent Skill 操作 API。"""

from typing import List

from fastapi import APIRouter, HTTPException

from agent.schema.model_agent import AgentSkillEntry, InstallSkillRequest, SkillInfo
from agent.service.workspace.skill_service import skill_service
from agent.infra.server.common import resp

router = APIRouter(tags=["agent-skill"])


@router.get("/skills", response_model=List[SkillInfo])
async def get_available_skills():
    """获取所有可用 Skill 清单。"""
    skills = skill_service.get_all_skills()
    return resp.ok(resp.Resp(data=[s.model_dump() for s in skills]))


@router.get("/agents/{agent_id}/skills", response_model=List[AgentSkillEntry])
async def get_agent_skills(agent_id: str):
    """获取 Agent 的 Skill 列表（含安装状态）。"""
    try:
        skills = await skill_service.get_agent_skills(agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=[s.model_dump() for s in skills]))


@router.post("/agents/{agent_id}/skills")
async def install_agent_skill(agent_id: str, request: InstallSkillRequest):
    """为 Agent 安装 Skill。"""
    try:
        entry = await skill_service.install_skill(agent_id, request.skill_name)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data=entry.model_dump()))


@router.delete("/agents/{agent_id}/skills/{skill_name}")
async def uninstall_agent_skill(agent_id: str, skill_name: str):
    """从 Agent 卸载 Skill。"""
    try:
        await skill_service.uninstall_skill(agent_id, skill_name)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return resp.ok(resp.Resp(data={"success": True}))
