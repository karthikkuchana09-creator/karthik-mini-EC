"""create channels and channel_members tables

Revision ID: l1m2n3o4p5q6
Revises: k1l2m3n4o5p6
Create Date: 2026-06-05 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'l1m2n3o4p5q6'
down_revision: Union[str, Sequence[str], None] = 'k1l2m3n4o5p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "channels",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "channel_type",
            sa.Enum("PUBLIC", "PRIVATE", "ANNOUNCEMENT", "PROJECT", name="channeltype"),
            nullable=False,
        ),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_channels_id"), "channels", ["id"])
    op.create_index(op.f("ix_channels_tenant_id"), "channels", ["tenant_id"])
    op.create_index(op.f("ix_channels_workspace_id"), "channels", ["workspace_id"])

    op.create_foreign_key(
        "fk_channels_tenant_id",
        "channels", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channels_workspace_id",
        "channels", "workspaces",
        ["workspace_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channels_created_by",
        "channels", "users",
        ["created_by"], ["id"],
        ondelete="CASCADE",
    )

    op.create_table(
        "channel_members",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("channel_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("is_muted", sa.Boolean(), nullable=False),
        sa.Column("last_read_message_id", sa.BigInteger(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel_id", "user_id", name="uq_channel_member"),
    )
    op.create_index(op.f("ix_channel_members_id"), "channel_members", ["id"])
    op.create_index(op.f("ix_channel_members_channel_id"), "channel_members", ["channel_id"])
    op.create_index(op.f("ix_channel_members_user_id"), "channel_members", ["user_id"])

    op.create_foreign_key(
        "fk_channel_members_channel_id",
        "channel_members", "channels",
        ["channel_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channel_members_user_id",
        "channel_members", "users",
        ["user_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_channel_members_user_id", "channel_members", type_="foreignkey")
    op.drop_constraint("fk_channel_members_channel_id", "channel_members", type_="foreignkey")
    op.drop_index(op.f("ix_channel_members_user_id"), table_name="channel_members")
    op.drop_index(op.f("ix_channel_members_channel_id"), table_name="channel_members")
    op.drop_index(op.f("ix_channel_members_id"), table_name="channel_members")
    op.drop_table("channel_members")

    op.drop_constraint("fk_channels_created_by", "channels", type_="foreignkey")
    op.drop_constraint("fk_channels_workspace_id", "channels", type_="foreignkey")
    op.drop_constraint("fk_channels_tenant_id", "channels", type_="foreignkey")
    op.drop_index(op.f("ix_channels_workspace_id"), table_name="channels")
    op.drop_index(op.f("ix_channels_tenant_id"), table_name="channels")
    op.drop_index(op.f("ix_channels_id"), table_name="channels")
    op.drop_table("channels")
    op.execute("DROP TYPE IF EXISTS channeltype")
