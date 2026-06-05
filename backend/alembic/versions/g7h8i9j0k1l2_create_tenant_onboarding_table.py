"""create tenant onboarding table

Revision ID: g7h8i9j0k1l2
Revises: f7e8d9c0b1a2
Create Date: 2026-06-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, Sequence[str], None] = 'f7e8d9c0b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_onboarding",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("admin_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "onboarding_status",
            sa.Enum("PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", name="onboardingstatus"),
            nullable=False,
        ),
        sa.Column("admin_created", sa.Boolean(), nullable=False),
        sa.Column("default_workspace_created", sa.Boolean(), nullable=False),
        sa.Column("settings_created", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tenant_onboarding_id"), "tenant_onboarding", ["id"])
    op.create_index(op.f("ix_tenant_onboarding_tenant_id"), "tenant_onboarding", ["tenant_id"], unique=True)

    op.create_foreign_key(
        "fk_tenant_onboarding_tenant_id",
        "tenant_onboarding", "tenants",
        ["tenant_id"], ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_tenant_onboarding_admin_user_id",
        "tenant_onboarding", "users",
        ["admin_user_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tenant_onboarding_admin_user_id", "tenant_onboarding", type_="foreignkey")
    op.drop_constraint("fk_tenant_onboarding_tenant_id", "tenant_onboarding", type_="foreignkey")
    op.drop_index(op.f("ix_tenant_onboarding_tenant_id"), table_name="tenant_onboarding")
    op.drop_index(op.f("ix_tenant_onboarding_id"), table_name="tenant_onboarding")
    op.drop_table("tenant_onboarding")
    op.execute("DROP TYPE IF EXISTS onboardingstatus")
