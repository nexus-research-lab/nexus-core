# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：protocol_auto_player.py
# @Date   ：2026/3/27
# @Author ：OpenAI
# =====================================================

"""Protocol room 自动参与者。"""

from __future__ import annotations

from typing import Optional

from agent.schema.model_protocol import ActionRequestRecord, ProtocolRunRecord


class ProtocolAutoPlayer:
    """为非本地玩家的 agent 生成自动动作。"""

    def select_actor(
        self,
        run: ProtocolRunRecord,
        request: ActionRequestRecord,
    ) -> Optional[str]:
        """选择自动执行该请求的 actor。"""
        local_player_agent_id = str(run.run_config.get("local_player_agent_id") or "").strip() or None
        if local_player_agent_id and local_player_agent_id in request.allowed_actor_agent_ids:
            return None

        for agent_id in request.allowed_actor_agent_ids:
            cleaned = str(agent_id or "").strip()
            if cleaned:
                return cleaned
        return None

    def build_payload(
        self,
        run: ProtocolRunRecord,
        request: ActionRequestRecord,
        actor_agent_id: str,
    ) -> dict[str, str]:
        """根据请求类型生成自动动作。"""
        if request.action_type == "speak":
            return {
                "content": self._build_speech_content(run, actor_agent_id),
            }

        candidate_agent_ids = self._candidate_agent_ids(request)
        if request.action_type in {"kill_target", "inspect_target", "save_target", "vote_target"}:
            target_agent_id = self._pick_target(run, request.action_type, actor_agent_id, candidate_agent_ids)
            return {"target_agent_id": target_agent_id} if target_agent_id else {}

        return {}

    def _candidate_agent_ids(self, request: ActionRequestRecord) -> list[str]:
        target_scope_candidates = request.target_scope.get("candidate_agent_ids")
        if isinstance(target_scope_candidates, list):
            return [str(item) for item in target_scope_candidates if str(item).strip()]

        fields = request.input_schema.get("fields")
        if isinstance(fields, list):
            for field_def in fields:
                if not isinstance(field_def, dict):
                    continue
                options = field_def.get("options")
                if isinstance(options, list):
                    return [str(item) for item in options if str(item).strip()]
        return []

    def _pick_target(
        self,
        run: ProtocolRunRecord,
        action_type: str,
        actor_agent_id: str,
        candidate_agent_ids: list[str],
    ) -> str:
        if not candidate_agent_ids:
            return ""

        roles = run.state.get("roles") or {}
        last_vote_target = str((run.state.get("last_vote_result") or {}).get("target") or "").strip()
        last_kill_target = str((run.state.get("last_night_result") or {}).get("kill_target") or "").strip()

        if action_type == "kill_target":
            preferred = [agent_id for agent_id in candidate_agent_ids if roles.get(agent_id) != "wolf"]
            return (preferred or candidate_agent_ids)[0]

        if action_type == "inspect_target":
            for candidate in candidate_agent_ids:
                if candidate != actor_agent_id:
                    return candidate
            return candidate_agent_ids[0]

        if action_type == "save_target":
            if actor_agent_id in candidate_agent_ids:
                return actor_agent_id
            if last_kill_target and last_kill_target in candidate_agent_ids:
                return last_kill_target
            return candidate_agent_ids[0]

        if action_type == "vote_target":
            if last_vote_target and last_vote_target in candidate_agent_ids:
                return last_vote_target
            if last_kill_target and last_kill_target in candidate_agent_ids:
                return last_kill_target
            return candidate_agent_ids[0]

        return candidate_agent_ids[0]

    def _build_speech_content(
        self,
        run: ProtocolRunRecord,
        actor_agent_id: str,
    ) -> str:
        roles = run.state.get("roles") or {}
        role = str(roles.get(actor_agent_id) or "member")
        day = int(run.state.get("day") or 1)

        if role == "wolf":
            return f"第{day}天我先保持谨慎，暂时更关注大家前后逻辑是否一致。"
        if role == "seer":
            return f"第{day}天我会重点观察谁在刻意带节奏，等信息更充分再表态。"
        if role == "healer":
            return f"第{day}天别急着定人，先看谁的发言更像在掩盖夜里的变化。"
        return f"第{day}天我目前信息有限，但会优先关注发言和投票里最矛盾的人。"


protocol_auto_player = ProtocolAutoPlayer()
