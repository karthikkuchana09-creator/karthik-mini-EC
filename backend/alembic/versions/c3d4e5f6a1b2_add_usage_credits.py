"""add usage credits and credit transactions for credit-based metering

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-05-20 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a1b2'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- usage_credits table ---
    op.create_table(
        "usage_credits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("total_credits", sa.Integer(), nullable=False, server_default=sa.text("100")),
        sa.Column("used_credits", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("remaining_credits", sa.Integer(), nullable=False, server_default=sa.text("100")),
        sa.Column("low_credit_threshold", sa.Integer(), nullable=True, server_default=sa.text("20")),
        sa.Column("low_credit_alert_sent", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("last_reset_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", name="uq_usage_credits_org"),
    )
    op.create_index("ix_usage_credits_org", "usage_credits", ["organization_id"])

    # --- credit_transactions table ---
    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("credit_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("transaction_type", sa.String(20), nullable=False, server_default=sa.text("'deduction'")),
        sa.Column("feature", sa.String(100), nullable=False),
        sa.Column("credits_used", sa.Integer(), nullable=False),
        sa.Column("balance_before", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["credit_id"], ["usage_credits.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_credit_tx_credit_id", "credit_transactions", ["credit_id"])
    op.create_index("ix_credit_tx_org", "credit_transactions", ["organization_id"])
    op.create_index("ix_credit_tx_feature", "credit_transactions", ["feature"])
    op.create_index("ix_credit_tx_created", "credit_transactions", ["created_at"])


def downgrade() -> None:
    op.drop_table("credit_transactions")
    op.drop_table("usage_credits")
