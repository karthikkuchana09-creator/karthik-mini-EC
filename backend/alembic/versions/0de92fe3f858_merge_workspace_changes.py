"""merge_workspace_changes

Revision ID: 0de92fe3f858
Revises: m2n3o4p5q6r7, p6q7r8s9t0u1
Create Date: 2026-06-19 14:47:39.567008

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0de92fe3f858'
down_revision: Union[str, Sequence[str], None] = ('m2n3o4p5q6r7', 'p6q7r8s9t0u1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
