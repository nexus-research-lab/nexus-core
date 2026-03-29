"""add_agent_identity_and_activity_events

Revision ID: a3b7e1c4d5f6
Revises: 69f6631b59e4
Create Date: 2026-03-29 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b7e1c4d5f6'
down_revision: Union[str, None] = '69f6631b59e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- agents 表：新增身份标识字段 ---
    op.add_column('agents', sa.Column(
        'avatar', sa.String(255), nullable=True,
        comment='头像标识（emoji 或图标名称）',
    ))
    op.add_column('agents', sa.Column(
        'vibe_tags', sa.JSON(), nullable=True,
        comment='氛围标签列表',
    ))

    # --- 创建 activity_events 表 ---
    op.create_table(
        'activity_events',
        sa.Column('id', sa.String(32), primary_key=True, comment='事件 ID（Snowflake）'),
        sa.Column('event_type', sa.String(50), nullable=False, index=True, comment='事件类型'),
        sa.Column('actor_type', sa.String(20), nullable=False, comment='执行者类型'),
        sa.Column('actor_id', sa.String(32), nullable=True, comment='执行者 ID'),
        sa.Column('target_type', sa.String(20), nullable=True, comment='目标类型'),
        sa.Column('target_id', sa.String(32), nullable=True, comment='目标 ID'),
        sa.Column('summary', sa.String(500), nullable=True, comment='事件摘要'),
        sa.Column('metadata', sa.JSON(), nullable=True, comment='事件元数据'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False, comment='创建时间'),
    )


def downgrade() -> None:
    op.drop_table('activity_events')
    op.drop_column('agents', 'vibe_tags')
    op.drop_column('agents', 'avatar')
