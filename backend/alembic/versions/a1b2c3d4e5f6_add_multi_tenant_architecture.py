"""add multi-tenant architecture (organizations, tenant_id columns)

Revision ID: a1b2c3d4e5f6
Revises: v0w1x2y3z4a5
Create Date: 2026-05-20 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'v0w1x2y3z4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- organizations table ---
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("logo", sa.String(500), nullable=True),
        sa.Column("subscription_plan", sa.Enum("free", "starter", "business", "enterprise", name="subscriptionplan"), nullable=False, server_default="free"),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("1")),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("suspended_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
    op.create_index("ix_organizations_is_active", "organizations", ["is_active"])

    # --- organization_settings table ---
    op.create_table(
        "organization_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("primary_color", sa.String(7), nullable=True, server_default="#6366f1"),
        sa.Column("secondary_color", sa.String(7), nullable=True, server_default="#8b5cf6"),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("company_address", sa.Text(), nullable=True),
        sa.Column("timezone", sa.String(50), nullable=True, server_default="UTC"),
        sa.Column("date_format", sa.String(20), nullable=True, server_default="YYYY-MM-DD"),
        sa.Column("max_users", sa.Integer(), nullable=True, server_default="50"),
        sa.Column("max_storage_gb", sa.Integer(), nullable=True, server_default="5"),
        sa.Column("allowed_auth_providers", sa.JSON(), nullable=True),
        sa.Column("feature_flags", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )

    # --- organization_invitations table ---
    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=True, server_default="employee"),
        sa.Column("token", sa.String(255), nullable=False),
        sa.Column("status", sa.Enum("pending", "accepted", "expired", name="invitationstatus"), nullable=True, server_default="pending"),
        sa.Column("invited_by", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invitations_token", "organization_invitations", ["token"], unique=True)
    op.create_index("ix_invitations_email", "organization_invitations", ["email"])
    op.create_index("ix_invitations_org", "organization_invitations", ["organization_id"])

    # --- add tenant_id to existing tables ---
    tables = [
        ("users", "users", "SET NULL"),
        ("tasks", "tasks", "SET NULL"),
        ("approvals", "approvals", "SET NULL"),
        ("approval_history", "approval_history", "SET NULL"),
        ("comments", "comments", "SET NULL"),
        ("documents", "documents", "SET NULL"),
        ("leaves", "leaves", "SET NULL"),
        ("notifications", "notifications", "SET NULL"),
        ("audit_logs", "audit_logs", "SET NULL"),
        ("ai_analyses", "ai_analyses", "SET NULL"),
        ("refresh_tokens", "refresh_tokens", "SET NULL"),
        ("password_reset_tokens", "password_reset_tokens", "SET NULL"),
    ]
    for table, fk_name, ondelete in tables:
        op.add_column(table, sa.Column("tenant_id", sa.Integer(), nullable=True))
        op.create_index(f"ix_{fk_name}_tenant_id", table, ["tenant_id"])
        op.create_foreign_key(
            f"fk_{fk_name}_tenant_id",
            source_table=table,
            referent_table="organizations",
            local_cols=["tenant_id"],
            remote_cols=["id"],
            ondelete=ondelete,
        )

    # --- add subscription_role to users ---
    op.add_column("users", sa.Column("subscription_role", sa.Enum("owner", "admin", "member", "guest", name="subscriptionrole"), nullable=False, server_default="member"))

    # --- seed default organization for existing data ---
    op.execute("INSERT INTO organizations (name, slug, subscription_plan, is_active) VALUES ('Main Organization', 'main-org', 'enterprise', 1)")
    op.execute("INSERT INTO organization_settings (organization_id, max_users, max_storage_gb) VALUES (1, 1000, 100)")
    for table, _, _ in tables:
        op.execute(f"UPDATE {table} SET tenant_id = 1 WHERE tenant_id IS NULL")


def downgrade() -> None:
    tables = [
        ("users", "users"),
        ("tasks", "tasks"),
        ("approvals", "approvals"),
        ("approval_history", "approval_history"),
        ("comments", "comments"),
        ("documents", "documents"),
        ("leaves", "leaves"),
        ("notifications", "notifications"),
        ("audit_logs", "audit_logs"),
        ("ai_analyses", "ai_analyses"),
        ("refresh_tokens", "refresh_tokens"),
        ("password_reset_tokens", "password_reset_tokens"),
        ("organization_invitations", "organization_invitations"),
        ("organization_settings", "organization_settings"),
    ]
    for table, fk_name in tables:
        try:
            op.drop_constraint(f"fk_{fk_name}_tenant_id", table, type_="foreignkey")
        except Exception:
            pass
        try:
            op.drop_index(f"ix_{fk_name}_tenant_id", table_name=table)
        except Exception:
            pass
        try:
            op.drop_column(table, "tenant_id")
        except Exception:
            pass

    op.drop_table("organization_invitations")
    op.drop_table("organization_settings")
    op.drop_table("organizations")
