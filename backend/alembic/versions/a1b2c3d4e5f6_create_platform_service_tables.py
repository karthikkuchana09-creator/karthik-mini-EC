"""create all platform service tables

Revision ID: a1b2c3d4e5f6
Revises: 1267de2f0396
Create Date: 2026-07-16 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "1267de2f0396"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = (
    "be8e24f5a03e",
    "a2b3c4d5e6f7",
    "e5f6a1b2c3d4",
    "p6q7r8s9t0u1",
    "v0w1x2y3z4a5",
    "m2n3o4p5q6r7",
)


def upgrade() -> None:
    # ---------------------------------------------------------------
    # knowledge_categories
    # ---------------------------------------------------------------
    op.create_table(
        "knowledge_categories",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # knowledge_articles
    # ---------------------------------------------------------------
    op.create_table(
        "knowledge_articles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("knowledge_categories.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("tags", sa.String(length=500), nullable=True),
        sa.Column("version", sa.Integer(), default=1),
        sa.Column("status", sa.String(length=20), default="draft", index=True),
        sa.Column("view_count", sa.Integer(), default=0),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_knowledge_articles_category_id_status", "knowledge_articles", ["category_id", "status"])

    # ---------------------------------------------------------------
    # custom_forms
    # ---------------------------------------------------------------
    op.create_table(
        "custom_forms",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), default="draft"),
        sa.Column("fields_config", sa.JSON(), default=list),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # form_submissions
    # ---------------------------------------------------------------
    op.create_table(
        "form_submissions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("custom_forms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("submitted_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # custom_form_fields
    # ---------------------------------------------------------------
    op.create_table(
        "custom_form_fields",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("custom_forms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("field_type", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("required", sa.Boolean(), default=False),
        sa.Column("placeholder", sa.String(length=500), nullable=True),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("validation_rules", sa.JSON(), nullable=True),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # workflow_definitions
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_definitions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False, index=True),
        sa.Column("trigger_event", sa.String(length=100), nullable=True, index=True),
        sa.Column("status", sa.String(length=20), default="active", index=True),
        sa.Column("is_deleted", sa.Boolean(), default=False, index=True),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # workflow_rules
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_rules",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("workflow_id", sa.Integer(), sa.ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("condition_config", sa.JSON(), nullable=False),
        sa.Column("action_config", sa.JSON(), nullable=False),
        sa.Column("priority", sa.Integer(), default=0),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # workflow_executions
    # ---------------------------------------------------------------
    op.create_table(
        "workflow_executions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("workflow_id", sa.Integer(), sa.ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False, index=True),
        sa.Column("entity_id", sa.Integer(), nullable=False, index=True),
        sa.Column("trigger_event", sa.String(length=100), nullable=True, index=True),
        sa.Column("status", sa.String(length=20), default="pending", index=True),
        sa.Column("result_log", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("started_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_workflow_executions_entity", "workflow_executions", ["entity_type", "entity_id"])
    op.create_index("ix_workflow_executions_workflow_status", "workflow_executions", ["workflow_id", "status"])

    # ---------------------------------------------------------------
    # reports
    # ---------------------------------------------------------------
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False, index=True),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("is_shared", sa.Boolean(), default=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # notification_rules
    # ---------------------------------------------------------------
    op.create_table(
        "notification_rules",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False, index=True),
        sa.Column("channel", sa.String(length=50), nullable=False, server_default="in_app"),
        sa.Column("condition_config", sa.JSON(), nullable=True),
        sa.Column("template_config", sa.JSON(), nullable=True),
        sa.Column("recipient_config", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, index=True),
        sa.Column("is_deleted", sa.Boolean(), default=False, index=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # saved_searches
    # ---------------------------------------------------------------
    op.create_table(
        "saved_searches",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("query", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # knowledge_article_versions
    # ---------------------------------------------------------------
    op.create_table(
        "knowledge_article_versions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("article_id", sa.Integer(), sa.ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", sa.String(length=500), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("knowledge_article_versions")
    op.drop_table("saved_searches")
    op.drop_table("notification_rules")
    op.drop_table("reports")
    op.drop_table("workflow_executions")
    op.drop_table("workflow_rules")
    op.drop_table("workflow_definitions")
    op.drop_table("custom_form_fields")
    op.drop_table("form_submissions")
    op.drop_table("custom_forms")
    op.drop_table("knowledge_articles")
    op.drop_table("knowledge_categories")
