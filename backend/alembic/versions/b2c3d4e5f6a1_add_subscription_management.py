"""add subscription management (plans, subscriptions, billing history)

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- subscription_plans table ---
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tier", sa.Enum("basic", "silver", "gold", name="plantier"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_monthly", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("price_yearly", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("max_users", sa.Integer(), nullable=True, server_default="5"),
        sa.Column("max_tasks", sa.Integer(), nullable=True, server_default="100"),
        sa.Column("max_ai_queries", sa.Integer(), nullable=True, server_default="50"),
        sa.Column("max_storage_mb", sa.Integer(), nullable=True, server_default="100"),
        sa.Column("max_teams", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("has_analytics", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_approvals", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_ai_intelligence", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_realtime_collaboration", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_advanced_analytics", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_api_access", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_audit_trail", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_custom_branding", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_priority_support", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("has_sla", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("features_json", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("sort_order", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscription_plans_tier", "subscription_plans", ["tier"], unique=True)

    # --- tenant_subscriptions table ---
    op.create_table(
        "tenant_subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("active", "trialing", "past_due", "canceled", "expired", name="subscriptionstatus"), nullable=False, server_default="active"),
        sa.Column("billing_interval", sa.Enum("monthly", "yearly", name="billinginterval"), nullable=True, server_default="monthly"),
        sa.Column("start_date", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("current_period_start", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("current_period_end", sa.DateTime(), nullable=False),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("auto_renew", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenant_subscriptions_org", "tenant_subscriptions", ["organization_id"])
    op.create_index("ix_tenant_subscriptions_plan", "tenant_subscriptions", ["plan_id"])

    # --- billing_history table ---
    op.create_table(
        "billing_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("previous_plan_id", sa.Integer(), nullable=True),
        sa.Column("new_plan_id", sa.Integer(), nullable=True),
        sa.Column("previous_status", sa.String(50), nullable=True),
        sa.Column("new_status", sa.String(50), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=True, server_default="USD"),
        sa.Column("interval", sa.String(20), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("invoice_url", sa.String(500), nullable=True),
        sa.Column("receipt_url", sa.String(500), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["tenant_subscriptions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_billing_history_org_id", "billing_history", ["organization_id"])
    op.create_index("ix_billing_history_event", "billing_history", ["event_type"])
    op.create_index("ix_billing_history_sub", "billing_history", ["subscription_id"])

    # --- seed default subscription plans ---
    op.execute("""
        INSERT INTO subscription_plans (tier, name, description, price_monthly, price_yearly,
            max_users, max_tasks, max_ai_queries, max_storage_mb, max_teams,
            has_analytics, has_approvals, has_ai_intelligence, has_realtime_collaboration,
            has_advanced_analytics, has_api_access, has_audit_trail, has_custom_branding,
            has_priority_support, has_sla, sort_order, is_active)
        VALUES
        ('basic', 'Basic', 'Essential features for small teams getting started',
            0, 0, 5, 100, 50, 100, 1,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1),
        ('silver', 'Silver', 'Advanced features for growing businesses',
            2900, 29000, 25, 1000, 500, 500, 5,
            1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 2, 1),
        ('gold', 'Gold', 'Unlimited access with AI intelligence and realtime collaboration',
            9900, 99000, 100, 10000, 5000, 2000, 20,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1)
    """)


def downgrade() -> None:
    op.drop_table("billing_history")
    op.drop_table("tenant_subscriptions")
    op.drop_table("subscription_plans")
