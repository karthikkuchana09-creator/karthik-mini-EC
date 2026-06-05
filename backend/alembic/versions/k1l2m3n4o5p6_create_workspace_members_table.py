"""create workspace members table

Revision ID: k1l2m3n4o5p6
Revises: j1k2l3m4n5o6
Create Date: 2026-06-05 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'k1l2m3n4o5p6'
down_revision: Union[str, Sequence[str], None] = 'j1k2l3m4n5o6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("WORKSPACE_ADMIN", "MODERATOR", "MEMBER", "VIEWER", name="workspacememberrole"),
            nullable=False,
        ),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )
    op.create_index(op.f("ix_workspace_members_id"), "workspace_members", ["id"])
    op.create_index(op.f("ix_workspace_members_workspace_id"), "workspace_members", ["workspace_id"])
    op.create_index(op.f("ix_workspace_members_user_id"), "workspace_members", ["user_id"])

    op.create_foreign_key(
        "fk_workspace_members_workspace_id",
        "workspace_members", "workspaces",
        ["workspace_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_workspace_members_user_id",
        "workspace_members", "users",
        ["user_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_workspace_members_user_id", "workspace_members", type_="foreignkey")
    op.drop_constraint("fk_workspace_members_workspace_id", "workspace_members", type_="foreignkey")
    op.drop_index(op.f("ix_workspace_members_user_id"), table_name="workspace_members")
    op.drop_index(op.f("ix_workspace_members_workspace_id"), table_name="workspace_members")
    op.drop_index(op.f("ix_workspace_members_id"), table_name="workspace_members")
    op.drop_table("workspace_members")
    op.execute("DROP TYPE IF EXISTS workspacememberrole")
