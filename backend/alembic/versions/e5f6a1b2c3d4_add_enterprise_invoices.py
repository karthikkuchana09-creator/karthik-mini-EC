"""add enterprise invoice and failed payment log tables

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-05-20 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a1b2c3d4'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a1b2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- invoices table ---
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),

        sa.Column("invoice_number", sa.String(30), nullable=False),
        sa.Column("invoice_type", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'draft'")),

        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("amount_paid", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("tax_pct", sa.Integer(), nullable=True, server_default=sa.text("18")),
        sa.Column("tax_amount", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("cgst", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("sgst", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("igst", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("total_amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=True, server_default=sa.text("'INR'")),

        sa.Column("billing_name", sa.String(255), nullable=True),
        sa.Column("billing_address", sa.Text(), nullable=True),
        sa.Column("billing_gstin", sa.String(20), nullable=True),
        sa.Column("billing_email", sa.String(255), nullable=True),

        sa.Column("plan_tier", sa.String(20), nullable=True),
        sa.Column("billing_interval", sa.String(10), nullable=True),
        sa.Column("credit_amount", sa.Integer(), nullable=True),

        sa.Column("billing_period_start", sa.DateTime(), nullable=True),
        sa.Column("billing_period_end", sa.DateTime(), nullable=True),

        sa.Column("issued_date", sa.DateTime(), nullable=True),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("paid_date", sa.DateTime(), nullable=True),
        sa.Column("cancelled_date", sa.DateTime(), nullable=True),

        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("subscription_id", sa.Integer(), nullable=True),

        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),

        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("receipt_pdf_path", sa.String(500), nullable=True),

        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),

        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payment_id"], ["razorpay_payments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subscription_id"], ["tenant_subscriptions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoices_number", "invoices", ["invoice_number"], unique=True)
    op.create_index("ix_invoices_org", "invoices", ["organization_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])
    op.create_index("ix_invoices_payment", "invoices", ["payment_id"])

    # --- failed_payment_logs table ---
    op.create_table(
        "failed_payment_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=True),

        sa.Column("razorpay_order_id", sa.String(100), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(100), nullable=True),

        sa.Column("amount", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("currency", sa.String(3), nullable=True, server_default=sa.text("'INR'")),
        sa.Column("payment_type", sa.String(30), nullable=True),

        sa.Column("error_code", sa.String(100), nullable=True),
        sa.Column("error_description", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.String(255), nullable=True),

        sa.Column("attempt_count", sa.Integer(), nullable=True, server_default=sa.text("1")),
        sa.Column("resolved", sa.Boolean(), nullable=True, server_default=sa.text("0")),

        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),

        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payment_id"], ["razorpay_payments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_failed_payments_org", "failed_payment_logs", ["organization_id"])
    op.create_index("ix_failed_payments_order", "failed_payment_logs", ["razorpay_order_id"])
    op.create_index("ix_failed_payments_payment", "failed_payment_logs", ["razorpay_payment_id"])


def downgrade() -> None:
    op.drop_table("failed_payment_logs")
    op.drop_table("invoices")
