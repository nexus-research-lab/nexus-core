# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：permission_request_presenter.py
# @Date   ：2026/3/14 12:09
# @Author ：leemysw
# 2026/3/14 12:09   Create
# =====================================================

"""权限请求展示数据组装器。"""

from __future__ import annotations

from datetime import datetime, timedelta

from agent.service.permission.pending_permission_request import PendingPermissionRequest


class PermissionRequestPresenter:
    """构建发送给前端的权限请求展示数据。"""

    READ_ONLY_TOOLS = {
        "Read",
        "Glob",
        "Grep",
        "LS",
        "WebFetch",
        "WebSearch",
        "Skill",
    }
    EDIT_TOOLS = {"Edit", "Write", "NotebookEdit", "TodoWrite"}
    EXECUTE_TOOLS = {"Bash", "KillShell", "Task", "TaskOutput"}
    INTERACTIVE_TOOLS = {"AskUserQuestion", "EnterPlanMode", "ExitPlanMode"}

    @classmethod
    def build_payload(
        cls,
        request: PendingPermissionRequest,
        suggestion_updates: list[dict[str, object]],
    ) -> dict[str, object]:
        """构建前端展示所需的权限请求载荷。"""
        risk_level, risk_label = cls._resolve_risk(request.tool_name)
        return {
            "request_id": request.request_id,
            "tool_name": request.tool_name,
            "tool_input": request.input_data,
            "interaction_mode": cls._resolve_interaction_mode(request.tool_name),
            "risk_level": risk_level,
            "risk_label": risk_label,
            "summary": cls._summarize_input(request.tool_name, request.input_data),
            "suggestions": suggestion_updates,
            "expires_at": request.expires_at.isoformat(),
        }

    @classmethod
    def _resolve_risk(cls, tool_name: str) -> tuple[str, str]:
        """根据工具名给出风险级别。"""
        if tool_name in cls.READ_ONLY_TOOLS:
            return "low", "只读"
        if tool_name in cls.EDIT_TOOLS:
            return "medium", "写入"
        if tool_name in cls.EXECUTE_TOOLS:
            return "high", "执行"
        if tool_name in cls.INTERACTIVE_TOOLS:
            return "medium", "交互"
        return "high", "敏感"

    @staticmethod
    def _resolve_interaction_mode(tool_name: str) -> str:
        """区分普通权限确认与问答交互。"""
        if tool_name == "AskUserQuestion":
            return "question"
        return "permission"

    @classmethod
    def _summarize_input(cls, tool_name: str, input_data: dict[str, object]) -> str:
        """提取适合在权限面板显示的摘要。"""
        if tool_name == "Bash":
            command = input_data.get("command")
            if isinstance(command, str) and command.strip():
                return command.strip()

        for key in ("file_path", "path", "target_file", "cwd", "url", "query"):
            value = input_data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        if tool_name == "AskUserQuestion":
            questions = input_data.get("questions")
            if isinstance(questions, list) and questions:
                first_question = questions[0]
                if isinstance(first_question, dict):
                    question_text = first_question.get("question")
                    if isinstance(question_text, str) and question_text.strip():
                        return question_text.strip()

        for key in ("description", "task", "prompt"):
            value = input_data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        return tool_name

    @staticmethod
    def build_expiry(timeout_seconds: float) -> datetime:
        """根据超时时间生成过期时间。"""
        return datetime.now() + timedelta(seconds=timeout_seconds)
