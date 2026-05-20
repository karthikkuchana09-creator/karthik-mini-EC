"""add old_value, new_value, metadata_json to audit_logs

Revision ID: q5r6s7t8u9v0
Revises: f1g2h3i4j5k6
Create Date: 2026-05-18 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'q5r6s7t8u9v0'
down_revision: Union[str, Sequence[str], None] = 'f1g2h3i4j5k6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("old_value", sa.Text, nullable=True))
    op.add_column("audit_logs", sa.Column("new_value", sa.Text, nullable=True))
    op.add_column("audit_logs", sa.Column("metadata_json", sa.Text, nullable=True))
    op.create_index("ix_audit_logs_user_action", "audit_logs", ["user_id", "action"])
    op.create_index("ix_audit_logs_timestamp_action", "audit_logs", ["timestamp", "action"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_timestamp_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_action", table_name="audit_logs")
    op.drop_column("audit_logs", "metadata_json")
    op.drop_column("audit_logs", "new_value")
    op.drop_column("audit_logs", "old_value")
