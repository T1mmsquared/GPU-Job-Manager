"""add cancel_requested to jobs

Revision ID: 9e55a9916183
Revises: 20260312_01
Create Date: 2026-03-13 23:51:53.400692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e55a9916183'
down_revision: Union[str, None] = '20260312_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column(
            "cancel_requested",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("jobs", "cancel_requested")
