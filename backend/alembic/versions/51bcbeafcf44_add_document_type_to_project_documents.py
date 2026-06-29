"""add_document_type_to_project_documents

Revision ID: 51bcbeafcf44
Revises: 1baecb402ce2
Create Date: 2026-06-29 14:39:47.343349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision: str = '51bcbeafcf44'
down_revision: Union[str, Sequence[str], None] = '1baecb402ce2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('project_documents',
        sa.Column('document_type', mysql.ENUM('REQUIREMENT', 'DESIGN', 'TEST', 'RELEASE', 'OTHER'), nullable=False, server_default='OTHER')
    )


def downgrade() -> None:
    op.drop_column('project_documents', 'document_type')
