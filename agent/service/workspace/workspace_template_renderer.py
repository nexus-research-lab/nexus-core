# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：workspace_template_renderer.py
# @Date   ：2026/04/07 11:52
# @Author ：leemysw
# 2026/04/07 11:52   Create
# =====================================================

"""Workspace 模板占位符渲染器。"""

from __future__ import annotations

import re
from collections.abc import Mapping


class WorkspaceTemplateRenderer:
    """只替换受控占位符，未知花括号保持原样。"""

    _PLACEHOLDER_PATTERN = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")

    def __init__(self, context: Mapping[str, object]):
        self._context = {
            key: str(value)
            for key, value in context.items()
        }

    def render(self, template: str) -> str:
        """渲染模板字符串。"""

        # 外部 skill 文本里可能包含普通花括号示例，未知占位符必须原样保留。
        def replace(match: re.Match[str]) -> str:
            key = match.group(1)
            return self._context.get(key, match.group(0))

        return self._PLACEHOLDER_PATTERN.sub(replace, template)
