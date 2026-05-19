"""migrate notification type enum to varchar

Revision ID: a2b3c4d5e6f7
Revises: f1g2h3i4j5k6
Create Date: 2026-05-19 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f1g2h3i4j5k6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "notifications",
        "type",
        existing_type=mysql.ENUM(
            "task_assignment", "task_status", "approval_request",
            "approval_action", "comment", "document_upload", "system",
        ),
        type_=sa.String(50),
        existing_nullable=False,
        existing_server_default="system",
    )


def downgrade() -> None:
    op.alter_column(
        "notifications",
        "type",
        existing_type=sa.String(50),
        type_=mysql.ENUM(
            "task_assignment", "task_status", "approval_request",
            "approval_action", "comment", "document_upload", "system",
        ),
        existing_nullable=False,
        existing_server_default="system",
    )
