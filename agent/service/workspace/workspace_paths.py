# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：workspace_paths.py
# @Date   ：2026/3/17 20:15
# @Author ：leemysw
# 2026/3/17 20:15   Create
# =====================================================

"""Workspace 路径规则。"""

import os
from pathlib import Path


def get_workspace_base_path() -> Path:
    """获取 workspace 基础路径。"""
    from agent.config.config import settings

    workspace_path = getattr(settings, "WORKSPACE_PATH", None)
    if not workspace_path:
        workspace_path = os.path.join(Path.home(), ".nexus-core", "workspace")
    return Path(workspace_path).expanduser()
