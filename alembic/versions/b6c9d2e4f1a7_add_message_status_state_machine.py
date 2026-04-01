# !/usr/bin/env python
# -*- coding: utf-8 -*-
# =====================================================
# @File   ：b6c9d2e4f1a7_add_message_status_state_machine.py
# @Date   ：2026/04/01 16:50
# @Author ：leemysw
# 2026/04/01 16:50   Create
# =====================================================

"""add_message_status_state_machine

Revision ID: b6c9d2e4f1a7
Revises: a3b7e1c4d5f6
Create Date: 2026-04-01 16:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b6c9d2e4f1a7"
down_revision: Union[str, None] = "a3b7e1c4d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """为消息索引补充状态机字段。"""
    with op.batch_alter_table("messages") as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="completed",
            )
        )
        batch_op.create_check_constraint(
            "ck_messages_status",
            "status IN ('pending', 'streaming', 'completed', 'cancelled', 'error')",
        )

    op.create_index(
        "idx_messages_conversation_status",
        "messages",
        ["conversation_id", "status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """回滚消息状态机字段。"""
    op.drop_index("idx_messages_conversation_status", table_name="messages")
    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_constraint("ck_messages_status", type_="check")
        batch_op.drop_column("status")
