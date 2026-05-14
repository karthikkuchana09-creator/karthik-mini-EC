"""add database indexes for query optimization

Revision ID: o1p2q3r4s5t6
Revises: n1o2p3q4r5s6
Create Date: 2026-05-14 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'o1p2q3r4s5t6'
down_revision: Union[str, Sequence[str], None] = 'n1o2p3q4r5s6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # tasks
    op.create_index("ix_tasks_assigned_to_id", "tasks", ["assigned_to_id"])
    op.create_index("ix_tasks_assigned_to_id_status", "tasks", ["assigned_to_id", "status"])
    op.create_index("ix_tasks_created_by_id", "tasks", ["created_by_id"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_priority", "tasks", ["priority"])
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"])
    op.create_index("ix_tasks_created_at", "tasks", ["created_at"])

    # approvals
    op.create_index("ix_approvals_requested_by", "approvals", ["requested_by"])
    op.create_index("ix_approvals_requested_by_status", "approvals", ["requested_by", "status"])
    op.create_index("ix_approvals_status", "approvals", ["status"])
    op.create_index("ix_approvals_current_level", "approvals", ["current_level"])
    op.create_index("ix_approvals_current_level_status", "approvals", ["current_level", "status"])

    # approval_history
    op.create_index("ix_approval_history_approval_id", "approval_history", ["approval_id"])

    # notifications
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_user_id_is_read", "notifications", ["user_id", "is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    # audit_logs
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_entity_entity_id", "audit_logs", ["entity", "entity_id"])

    # comments
    op.create_index("ix_comments_task_id", "comments", ["task_id"])
    op.create_index("ix_comments_task_id_created_at", "comments", ["task_id", "created_at"])
    op.create_index("ix_comments_user_id", "comments", ["user_id"])
    op.create_index("ix_comments_created_at", "comments", ["created_at"])

    # leaves
    op.create_index("ix_leaves_user_id", "leaves", ["user_id"])
    op.create_index("ix_leaves_status", "leaves", ["status"])

    # documents
    op.create_index("ix_documents_task_id", "documents", ["task_id"])
    op.create_index("ix_documents_uploaded_by", "documents", ["uploaded_by"])

    # ai_analyses
    op.create_index("ix_ai_analyses_user_id", "ai_analyses", ["user_id"])
    op.create_index("ix_ai_analyses_task_id", "ai_analyses", ["task_id"])


def downgrade() -> None:
    # ai_analyses
    op.drop_index("ix_ai_analyses_task_id", table_name="ai_analyses")
    op.drop_index("ix_ai_analyses_user_id", table_name="ai_analyses")

    # documents
    op.drop_index("ix_documents_uploaded_by", table_name="documents")
    op.drop_index("ix_documents_task_id", table_name="documents")

    # leaves
    op.drop_index("ix_leaves_status", table_name="leaves")
    op.drop_index("ix_leaves_user_id", table_name="leaves")

    # comments
    op.drop_index("ix_comments_created_at", table_name="comments")
    op.drop_index("ix_comments_user_id", table_name="comments")
    op.drop_index("ix_comments_task_id_created_at", table_name="comments")
    op.drop_index("ix_comments_task_id", table_name="comments")

    # audit_logs
    op.drop_index("ix_audit_logs_entity_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")

    # notifications
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_user_id_is_read", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")

    # approval_history
    op.drop_index("ix_approval_history_approval_id", table_name="approval_history")

    # approvals
    op.drop_index("ix_approvals_current_level_status", table_name="approvals")
    op.drop_index("ix_approvals_current_level", table_name="approvals")
    op.drop_index("ix_approvals_status", table_name="approvals")
    op.drop_index("ix_approvals_current_level", table_name="approvals")
    op.drop_index("ix_approvals_requested_by_status", table_name="approvals")
    op.drop_index("ix_approvals_requested_by", table_name="approvals")

    # tasks
    op.drop_index("ix_tasks_created_at", table_name="tasks")
    op.drop_index("ix_tasks_due_date", table_name="tasks")
    op.drop_index("ix_tasks_priority", table_name="tasks")
    op.drop_index("ix_tasks_status", table_name="tasks")
    op.drop_index("ix_tasks_created_by_id", table_name="tasks")
    op.drop_index("ix_tasks_assigned_to_id_status", table_name="tasks")
    op.drop_index("ix_tasks_assigned_to_id", table_name="tasks")
