"""add_is_pinned_to_messages

Revision ID: a75802222274
Revises: 0de92fe3f858
Create Date: 2026-06-19 15:50:15.285603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a75802222274'
down_revision: Union[str, Sequence[str], None] = '0de92fe3f858'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('channel_messages', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('channel_messages', sa.Column('pinned_at', sa.DateTime(), nullable=True))
    op.add_column('workspace_messages', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('workspace_messages', sa.Column('pinned_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('workspace_messages', 'pinned_at')
    op.drop_column('workspace_messages', 'is_pinned')
    op.drop_column('channel_messages', 'pinned_at')
    op.drop_column('channel_messages', 'is_pinned')
