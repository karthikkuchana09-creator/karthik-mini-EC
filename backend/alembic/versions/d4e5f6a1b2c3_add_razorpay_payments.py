"""add razorpay payment tables (payments, subscription links, invoices)

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-05-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a1b2c3'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- razorpay_payments table ---
    op.create_table(
        "razorpay_payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),

        sa.Column("razorpay_order_id", sa.String(100), nullable=False),
        sa.Column("razorpay_payment_id", sa.String(100), nullable=True),
        sa.Column("razorpay_signature", sa.String(255), nullable=True),

        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("currency", sa.String(3), nullable=True, server_default=sa.text("'INR'")),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'created'")),

        sa.Column("payment_type", sa.String(30), nullable=False),
        sa.Column("plan_tier", sa.String(20), nullable=True),
        sa.Column("billing_interval", sa.String(10), nullable=True),
        sa.Column("credit_amount", sa.Integer(), nullable=True),

        sa.Column("invoice_id", sa.String(100), nullable=True),
        sa.Column("receipt", sa.String(100), nullable=True),
        sa.Column("error_code", sa.String(100), nullable=True),
        sa.Column("error_description", sa.Text(), nullable=True),
        sa.Column("notes_json", sa.Text(), nullable=True),

        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),

        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_razorpay_payments_order", "razorpay_payments", ["razorpay_order_id"], unique=True)
    op.create_index("ix_razorpay_payments_payment", "razorpay_payments", ["razorpay_payment_id"])
    op.create_index("ix_razorpay_payments_org", "razorpay_payments", ["organization_id"])

    # --- razorpay_subscription_links table ---
    op.create_table(
        "razorpay_subscription_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("tenant_subscription_id", sa.Integer(), nullable=True),

        sa.Column("razorpay_subscription_id", sa.String(100), nullable=False),
        sa.Column("plan_tier", sa.String(20), nullable=False),
        sa.Column("billing_interval", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'created'")),
        sa.Column("short_url", sa.String(500), nullable=True),

        sa.Column("current_start", sa.DateTime(), nullable=True),
        sa.Column("current_end", sa.DateTime(), nullable=True),
        sa.Column("total_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("paid_count", sa.Integer(), nullable=True, server_default=sa.text("0")),

        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),

        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_subscription_id"], ["tenant_subscriptions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rzp_sub_links_sub_id", "razorpay_subscription_links", ["razorpay_subscription_id"], unique=True)
    op.create_index("ix_rzp_sub_links_org", "razorpay_subscription_links", ["organization_id"])

    # --- razorpay_invoices table ---
    op.create_table(
        "razorpay_invoices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),

        sa.Column("razorpay_invoice_id", sa.String(100), nullable=False),
        sa.Column("razorpay_subscription_id", sa.String(100), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(100), nullable=True),
        sa.Column("order_id", sa.String(100), nullable=True),

        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("currency", sa.String(3), nullable=True, server_default=sa.text("'INR'")),
        sa.Column("status", sa.String(20), nullable=False),

        sa.Column("invoice_url", sa.String(500), nullable=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),

        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),

        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("paid_at", sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rzp_invoices_invoice_id", "razorpay_invoices", ["razorpay_invoice_id"], unique=True)
    op.create_index("ix_rzp_invoices_sub_id", "razorpay_invoices", ["razorpay_subscription_id"])
    op.create_index("ix_rzp_invoices_payment_id", "razorpay_invoices", ["razorpay_payment_id"])
    op.create_index("ix_rzp_invoices_org", "razorpay_invoices", ["organization_id"])


def downgrade() -> None:
    op.drop_table("razorpay_invoices")
    op.drop_table("razorpay_subscription_links")
    op.drop_table("razorpay_payments")
