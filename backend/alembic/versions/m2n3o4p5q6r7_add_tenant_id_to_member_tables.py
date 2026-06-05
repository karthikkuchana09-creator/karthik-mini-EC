"""add tenant_id to workspace_members and channel_members

Revision ID: m2n3o4p5q6r7
Revises: l1m2n3o4p5q6
Create Date: 2026-06-05 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'm2n3o4p5q6r7'
down_revision: Union[str, Sequence[str], None] = 'l1m2n3o4p5q6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- workspace_members
    op.add_column(
        "workspace_members",
        sa.Column("tenant_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_workspace_members_tenant_id",
        "workspace_members", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )
    op.execute(
        "UPDATE workspace_members SET tenant_id = "
        "(SELECT tenant_id FROM workspaces WHERE workspaces.id = workspace_members.workspace_id)"
    )
    op.alter_column("workspace_members", "tenant_id", existing_type=sa.Integer(), nullable=False)
    op.create_index(op.f("ix_workspace_members_tenant_id"), "workspace_members", ["tenant_id"])

    # -- channel_members
    op.add_column(
        "channel_members",
        sa.Column("tenant_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_channel_members_tenant_id",
        "channel_members", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )
    op.execute(
        "UPDATE channel_members SET tenant_id = "
        "(SELECT tenant_id FROM channels WHERE channels.id = channel_members.channel_id)"
    )
    op.alter_column("channel_members", "tenant_id", existing_type=sa.Integer(), nullable=False)
    op.create_index(op.f("ix_channel_members_tenant_id"), "channel_members", ["tenant_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_channel_members_tenant_id"), table_name="channel_members")
    op.drop_constraint("fk_channel_members_tenant_id", "channel_members", type_="foreignkey")
    op.drop_column("channel_members", "tenant_id")

    op.drop_index(op.f("ix_workspace_members_tenant_id"), table_name="workspace_members")
    op.drop_constraint("fk_workspace_members_tenant_id", "workspace_members", type_="foreignkey")
    op.drop_column("workspace_members", "tenant_id")
