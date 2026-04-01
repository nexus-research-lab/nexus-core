# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：e5f6a7b8c9d0_drop_runtime_skill_columns.py
# @Date   ：2026/04/01 23:10
# @Author ：leemysw
# 2026/04/01 23:10   Create
# =====================================================

"""drop runtime skill columns

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-01 23:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """移除 Runtime 上已废弃的技能字段。"""
    with op.batch_alter_table("runtimes") as batch_op:
        batch_op.drop_column("installed_skills_json")
        batch_op.drop_column("skills_enabled")


def downgrade() -> None:
    """恢复 Runtime 上的旧技能字段。"""
    with op.batch_alter_table("runtimes") as batch_op:
        batch_op.add_column(
            sa.Column(
                "skills_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "installed_skills_json",
                sa.Text(),
                nullable=False,
                server_default="[]",
            )
        )
