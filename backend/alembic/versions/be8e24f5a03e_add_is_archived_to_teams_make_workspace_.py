"""add_is_archived_to_teams_make_workspace_id_nullable

Revision ID: be8e24f5a03e
Revises: 51bcbeafcf44
Create Date: 2026-07-02 17:48:13.460779

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be8e24f5a03e'
down_revision: Union[str, Sequence[str], None] = '51bcbeafcf44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("is_archived", sa.Boolean(), server_default="0", nullable=False))
    op.alter_column("teams", "workspace_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("teams", "workspace_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("teams", "is_archived")
