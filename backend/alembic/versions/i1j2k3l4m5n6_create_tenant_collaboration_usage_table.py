"""create tenant collaboration usage table

Revision ID: i1j2k3l4m5n6
Revises: h1i2j3k4l5m6
Create Date: 2026-06-05 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'i1j2k3l4m5n6'
down_revision: Union[str, Sequence[str], None] = 'h1i2j3k4l5m6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_collaboration_usage",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("workspace_count", sa.Integer(), nullable=False),
        sa.Column("channel_count", sa.Integer(), nullable=False),
        sa.Column("member_count", sa.Integer(), nullable=False),
        sa.Column("storage_used_mb", sa.Float(), nullable=False),
        sa.Column("last_calculated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_tenant_collaboration_usage_id"),
        "tenant_collaboration_usage", ["id"],
    )
    op.create_index(
        op.f("ix_tenant_collaboration_usage_tenant_id"),
        "tenant_collaboration_usage", ["tenant_id"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_collab_usage_tenant_id",
        "tenant_collaboration_usage", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_collab_usage_tenant_id", "tenant_collaboration_usage", type_="foreignkey")
    op.drop_index(op.f("ix_tenant_collaboration_usage_tenant_id"), table_name="tenant_collaboration_usage")
    op.drop_index(op.f("ix_tenant_collaboration_usage_id"), table_name="tenant_collaboration_usage")
    op.drop_table("tenant_collaboration_usage")
