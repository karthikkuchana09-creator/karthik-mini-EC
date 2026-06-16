"""add workspace, channel FKs to tasks/approvals and create message/document tables

Revision ID: p6q7r8s9t0u1
Revises: abcdef123456
Create Date: 2026-06-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p6q7r8s9t0u1'
down_revision: Union[str, Sequence[str], None] = 'abcdef123456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add workspace_id and channel_id to tasks
    op.add_column("tasks", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("channel_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_tasks_workspace_id"), "tasks", ["workspace_id"])
    op.create_index(op.f("ix_tasks_channel_id"), "tasks", ["channel_id"])
    op.create_foreign_key(
        "fk_tasks_workspace_id", "tasks", "workspaces",
        ["workspace_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tasks_channel_id", "tasks", "channels",
        ["channel_id"], ["id"], ondelete="SET NULL",
    )

    # Add workspace_id and channel_id to approvals
    op.add_column("approvals", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column("approvals", sa.Column("channel_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_approvals_workspace_id"), "approvals", ["workspace_id"])
    op.create_index(op.f("ix_approvals_channel_id"), "approvals", ["channel_id"])
    op.create_foreign_key(
        "fk_approvals_workspace_id", "approvals", "workspaces",
        ["workspace_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_approvals_channel_id", "approvals", "channels",
        ["channel_id"], ["id"], ondelete="SET NULL",
    )

    # Create workspace_messages table
    op.create_table(
        "workspace_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("message_type", sa.String(length=50), nullable=False),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspace_messages_id"), "workspace_messages", ["id"])
    op.create_index(op.f("ix_workspace_messages_tenant_id"), "workspace_messages", ["tenant_id"])
    op.create_index(op.f("ix_workspace_messages_workspace_id"), "workspace_messages", ["workspace_id"])
    op.create_index(op.f("ix_workspace_messages_sender_id"), "workspace_messages", ["sender_id"])
    op.create_foreign_key(
        "fk_workspace_messages_tenant_id", "workspace_messages", "tenants",
        ["tenant_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_workspace_messages_workspace_id", "workspace_messages", "workspaces",
        ["workspace_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_workspace_messages_sender_id", "workspace_messages", "users",
        ["sender_id"], ["id"], ondelete="CASCADE",
    )

    # Create channel_messages table
    op.create_table(
        "channel_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("channel_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("message_type", sa.String(length=50), nullable=False),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_channel_messages_id"), "channel_messages", ["id"])
    op.create_index(op.f("ix_channel_messages_tenant_id"), "channel_messages", ["tenant_id"])
    op.create_index(op.f("ix_channel_messages_workspace_id"), "channel_messages", ["workspace_id"])
    op.create_index(op.f("ix_channel_messages_channel_id"), "channel_messages", ["channel_id"])
    op.create_index(op.f("ix_channel_messages_sender_id"), "channel_messages", ["sender_id"])
    op.create_foreign_key(
        "fk_channel_messages_tenant_id", "channel_messages", "tenants",
        ["tenant_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channel_messages_workspace_id", "channel_messages", "workspaces",
        ["workspace_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channel_messages_channel_id", "channel_messages", "channels",
        ["channel_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_channel_messages_sender_id", "channel_messages", "users",
        ["sender_id"], ["id"], ondelete="CASCADE",
    )

    # Create task_documents table
    op.create_table(
        "task_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("document_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_documents_id"), "task_documents", ["id"])
    op.create_index(op.f("ix_task_documents_tenant_id"), "task_documents", ["tenant_id"])
    op.create_index(op.f("ix_task_documents_task_id"), "task_documents", ["task_id"])
    op.create_index(op.f("ix_task_documents_uploaded_by"), "task_documents", ["uploaded_by"])
    op.create_foreign_key(
        "fk_task_documents_tenant_id", "task_documents", "tenants",
        ["tenant_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_documents_task_id", "task_documents", "tasks",
        ["task_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_documents_uploaded_by", "task_documents", "users",
        ["uploaded_by"], ["id"], ondelete="SET NULL",
    )

    # Create approval_documents table
    op.create_table(
        "approval_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("approval_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("document_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_approval_documents_id"), "approval_documents", ["id"])
    op.create_index(op.f("ix_approval_documents_tenant_id"), "approval_documents", ["tenant_id"])
    op.create_index(op.f("ix_approval_documents_approval_id"), "approval_documents", ["approval_id"])
    op.create_index(op.f("ix_approval_documents_uploaded_by"), "approval_documents", ["uploaded_by"])
    op.create_foreign_key(
        "fk_approval_documents_tenant_id", "approval_documents", "tenants",
        ["tenant_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_approval_documents_approval_id", "approval_documents", "approvals",
        ["approval_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_approval_documents_uploaded_by", "approval_documents", "users",
        ["uploaded_by"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    # Drop approval_documents
    op.drop_constraint("fk_approval_documents_uploaded_by", "approval_documents", type_="foreignkey")
    op.drop_constraint("fk_approval_documents_approval_id", "approval_documents", type_="foreignkey")
    op.drop_constraint("fk_approval_documents_tenant_id", "approval_documents", type_="foreignkey")
    op.drop_index(op.f("ix_approval_documents_uploaded_by"), table_name="approval_documents")
    op.drop_index(op.f("ix_approval_documents_approval_id"), table_name="approval_documents")
    op.drop_index(op.f("ix_approval_documents_tenant_id"), table_name="approval_documents")
    op.drop_index(op.f("ix_approval_documents_id"), table_name="approval_documents")
    op.drop_table("approval_documents")

    # Drop task_documents
    op.drop_constraint("fk_task_documents_uploaded_by", "task_documents", type_="foreignkey")
    op.drop_constraint("fk_task_documents_task_id", "task_documents", type_="foreignkey")
    op.drop_constraint("fk_task_documents_tenant_id", "task_documents", type_="foreignkey")
    op.drop_index(op.f("ix_task_documents_uploaded_by"), table_name="task_documents")
    op.drop_index(op.f("ix_task_documents_task_id"), table_name="task_documents")
    op.drop_index(op.f("ix_task_documents_tenant_id"), table_name="task_documents")
    op.drop_index(op.f("ix_task_documents_id"), table_name="task_documents")
    op.drop_table("task_documents")

    # Drop channel_messages
    op.drop_constraint("fk_channel_messages_sender_id", "channel_messages", type_="foreignkey")
    op.drop_constraint("fk_channel_messages_channel_id", "channel_messages", type_="foreignkey")
    op.drop_constraint("fk_channel_messages_workspace_id", "channel_messages", type_="foreignkey")
    op.drop_constraint("fk_channel_messages_tenant_id", "channel_messages", type_="foreignkey")
    op.drop_index(op.f("ix_channel_messages_sender_id"), table_name="channel_messages")
    op.drop_index(op.f("ix_channel_messages_channel_id"), table_name="channel_messages")
    op.drop_index(op.f("ix_channel_messages_workspace_id"), table_name="channel_messages")
    op.drop_index(op.f("ix_channel_messages_tenant_id"), table_name="channel_messages")
    op.drop_index(op.f("ix_channel_messages_id"), table_name="channel_messages")
    op.drop_table("channel_messages")

    # Drop workspace_messages
    op.drop_constraint("fk_workspace_messages_sender_id", "workspace_messages", type_="foreignkey")
    op.drop_constraint("fk_workspace_messages_workspace_id", "workspace_messages", type_="foreignkey")
    op.drop_constraint("fk_workspace_messages_tenant_id", "workspace_messages", type_="foreignkey")
    op.drop_index(op.f("ix_workspace_messages_sender_id"), table_name="workspace_messages")
    op.drop_index(op.f("ix_workspace_messages_workspace_id"), table_name="workspace_messages")
    op.drop_index(op.f("ix_workspace_messages_tenant_id"), table_name="workspace_messages")
    op.drop_index(op.f("ix_workspace_messages_id"), table_name="workspace_messages")
    op.drop_table("workspace_messages")

    # Drop approval FKs and columns
    op.drop_constraint("fk_approvals_channel_id", "approvals", type_="foreignkey")
    op.drop_constraint("fk_approvals_workspace_id", "approvals", type_="foreignkey")
    op.drop_index(op.f("ix_approvals_channel_id"), table_name="approvals")
    op.drop_index(op.f("ix_approvals_workspace_id"), table_name="approvals")
    op.drop_column("approvals", "channel_id")
    op.drop_column("approvals", "workspace_id")

    # Drop task FKs and columns
    op.drop_constraint("fk_tasks_channel_id", "tasks", type_="foreignkey")
    op.drop_constraint("fk_tasks_workspace_id", "tasks", type_="foreignkey")
    op.drop_index(op.f("ix_tasks_channel_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_workspace_id"), table_name="tasks")
    op.drop_column("tasks", "channel_id")
    op.drop_column("tasks", "workspace_id")
