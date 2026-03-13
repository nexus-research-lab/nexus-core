# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：permission_update_codec.py
# @Date   ：2026/3/14 12:09
# @Author ：leemysw
# 2026/3/14 12:09   Create
# =====================================================

"""权限更新编解码器。"""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any, Iterable, Optional

from claude_agent_sdk import PermissionUpdate
from claude_agent_sdk.types import PermissionRuleValue


class PermissionUpdateCodec:
    """权限更新对象与前端 JSON 之间的转换器。"""

    @classmethod
    def serialize_updates(
        cls,
        updates: Optional[Iterable[Any]],
    ) -> list[dict[str, Any]]:
        """将 SDK 返回的权限建议转换为可序列化结构。"""
        serialized: list[dict[str, Any]] = []
        for update in updates or []:
            normalized = cls._serialize_single(update)
            if normalized:
                serialized.append(normalized)
        return serialized

    @classmethod
    def deserialize_updates(
        cls,
        updates: Optional[list[dict[str, Any]]],
    ) -> list[PermissionUpdate]:
        """将前端回传的权限更新恢复为 SDK 对象。"""
        result: list[PermissionUpdate] = []
        for item in updates or []:
            update_type = item.get("type")
            if not update_type:
                continue

            rules: list[PermissionRuleValue] | None = None
            raw_rules = item.get("rules")
            if isinstance(raw_rules, list):
                rules = []
                for raw_rule in raw_rules:
                    if not isinstance(raw_rule, dict):
                        continue
                    tool_name = raw_rule.get("toolName") or raw_rule.get("tool_name")
                    if not tool_name:
                        continue
                    rules.append(
                        PermissionRuleValue(
                            tool_name=tool_name,
                            rule_content=raw_rule.get("ruleContent") or raw_rule.get("rule_content"),
                        )
                    )

            result.append(
                PermissionUpdate(
                    type=update_type,
                    rules=rules,
                    behavior=item.get("behavior"),
                    mode=item.get("mode"),
                    directories=item.get("directories"),
                    destination=item.get("destination"),
                )
            )
        return result

    @classmethod
    def _serialize_single(cls, update: Any) -> dict[str, Any] | None:
        """序列化单个权限更新。"""
        if isinstance(update, PermissionUpdate):
            return update.to_dict()
        if is_dataclass(update):
            return cls._normalize_update_dict(asdict(update))
        if isinstance(update, dict):
            return cls._normalize_update_dict(update)
        return None

    @classmethod
    def _normalize_update_dict(cls, raw: dict[str, Any]) -> dict[str, Any]:
        """统一权限更新字段命名。"""
        result: dict[str, Any] = {"type": raw.get("type")}
        for key in ("behavior", "mode", "destination"):
            if raw.get(key) is not None:
                result[key] = raw.get(key)

        if raw.get("directories") is not None:
            result["directories"] = raw.get("directories")

        rules = raw.get("rules")
        if isinstance(rules, list):
            normalized_rules = []
            for rule in rules:
                if isinstance(rule, PermissionRuleValue):
                    normalized_rules.append(
                        {
                            "toolName": rule.tool_name,
                            "ruleContent": rule.rule_content,
                        }
                    )
                    continue

                if is_dataclass(rule):
                    rule = asdict(rule)

                if isinstance(rule, dict):
                    tool_name = rule.get("toolName") or rule.get("tool_name")
                    if not tool_name:
                        continue
                    normalized_rules.append(
                        {
                            "toolName": tool_name,
                            "ruleContent": rule.get("ruleContent") or rule.get("rule_content"),
                        }
                    )

            if normalized_rules:
                result["rules"] = normalized_rules

        return result
