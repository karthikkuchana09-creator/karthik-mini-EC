"""create workspaces table

Revision ID: j1k2l3m4n5o6
Revises: i1j2k3l4m5n6
Create Date: 2026-06-05 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'j1k2l3m4n5o6'
down_revision: Union[str, Sequence[str], None] = 'i1j2k3l4m5n6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column(
            "visibility",
            sa.Enum("PUBLIC", "PRIVATE", name="workspacevisibility"),
            nullable=False,
        ),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_workspace_tenant_slug"),
    )
    op.create_index(op.f("ix_workspaces_id"), "workspaces", ["id"])
    op.create_index(op.f("ix_workspaces_tenant_id"), "workspaces", ["tenant_id"])
    op.create_index(op.f("ix_workspaces_slug"), "workspaces", ["slug"])

    op.create_foreign_key(
        "fk_workspaces_tenant_id",
        "workspaces", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_workspaces_created_by",
        "workspaces", "users",
        ["created_by"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_workspaces_created_by", "workspaces", type_="foreignkey")
    op.drop_constraint("fk_workspaces_tenant_id", "workspaces", type_="foreignkey")
    op.drop_index(op.f("ix_workspaces_slug"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_tenant_id"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_id"), table_name="workspaces")
    op.drop_table("workspaces")
    op.execute("DROP TYPE IF EXISTS workspacevisibility")
