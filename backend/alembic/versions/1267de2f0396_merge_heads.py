"""merge_heads

Revision ID: 1267de2f0396
Revises: v0w1x2y3z4a5, a2b3c4d5e6f7
Create Date: 2026-05-19 18:35:21.987257

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1267de2f0396'
down_revision: Union[str, Sequence[str], None] = ('v0w1x2y3z4a5', 'a2b3c4d5e6f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
