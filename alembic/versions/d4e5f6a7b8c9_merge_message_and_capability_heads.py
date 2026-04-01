# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：d4e5f6a7b8c9_merge_message_and_capability_heads.py
# @Date   ：2026/4/1 18:38
# @Author ：leemysw
# 2026/4/1 18:38   Create
# =====================================================

"""merge message status and capability heads

Revision ID: d4e5f6a7b8c9
Revises: b6c9d2e4f1a7, c3d4e5f6a7b8
Create Date: 2026-04-01 18:38:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, tuple[str, str], None] = ("b6c9d2e4f1a7", "c3d4e5f6a7b8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """合并并行迁移分支，不做额外结构变更。"""


def downgrade() -> None:
    """回退合并迁移，不做额外结构变更。"""
