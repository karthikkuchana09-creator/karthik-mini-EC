"""add ip_address and entity_action index to audit_logs

Revision ID: v0w1x2y3z4a5
Revises: q5r6s7t8u9v0
Create Date: 2026-05-18 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'v0w1x2y3z4a5'
down_revision: Union[str, Sequence[str], None] = 'q5r6s7t8u9v0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("ip_address", sa.String(45), nullable=True))
    op.create_index("ix_audit_logs_entity_action", "audit_logs", ["entity", "action"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_entity_action", table_name="audit_logs")
    op.drop_column("audit_logs", "ip_address")
