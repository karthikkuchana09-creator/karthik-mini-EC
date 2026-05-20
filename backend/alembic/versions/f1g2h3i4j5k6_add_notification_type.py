"""add notification type column

Revision ID: f1g2h3i4j5k6
Revises: o1p2q3r4s5t6
Create Date: 2026-05-18 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1g2h3i4j5k6'
down_revision: Union[str, Sequence[str], None] = 'o1p2q3r4s5t6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column(
            "type",
            sa.Enum(
                "task_assignment",
                "task_status",
                "approval_request",
                "approval_action",
                "comment",
                "document_upload",
                "system",
                name="notificationtype",
            ),
            nullable=False,
            server_default="system",
        ),
    )
    op.create_index("ix_notifications_type", "notifications", ["type"])


def downgrade() -> None:
    op.drop_index("ix_notifications_type", table_name="notifications")
    op.drop_column("notifications", "type")
    op.execute("DROP TYPE IF EXISTS notificationtype")
