"""create tenant collaboration settings table

Revision ID: h1i2j3k4l5m6
Revises: g7h8i9j0k1l2
Create Date: 2026-06-05 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'h1i2j3k4l5m6'
down_revision: Union[str, Sequence[str], None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_collaboration_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("max_workspaces", sa.Integer(), nullable=False),
        sa.Column("max_channels_per_workspace", sa.Integer(), nullable=False),
        sa.Column("max_workspace_members", sa.Integer(), nullable=False),
        sa.Column("max_storage_mb", sa.Integer(), nullable=False),
        sa.Column("workspace_enabled", sa.Boolean(), nullable=False),
        sa.Column("channel_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_tenant_collaboration_settings_id"),
        "tenant_collaboration_settings", ["id"],
    )
    op.create_index(
        op.f("ix_tenant_collaboration_settings_tenant_id"),
        "tenant_collaboration_settings", ["tenant_id"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_collab_settings_tenant_id",
        "tenant_collaboration_settings", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_collab_settings_tenant_id", "tenant_collaboration_settings", type_="foreignkey")
    op.drop_index(op.f("ix_tenant_collaboration_settings_tenant_id"), table_name="tenant_collaboration_settings")
    op.drop_index(op.f("ix_tenant_collaboration_settings_id"), table_name="tenant_collaboration_settings")
    op.drop_table("tenant_collaboration_settings")
