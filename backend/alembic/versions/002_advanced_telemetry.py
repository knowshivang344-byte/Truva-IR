"""advanced telemetry

Revision ID: 002_advanced_telemetry
Revises: 001_initial
Create Date: 2026-05-22 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_advanced_telemetry'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add iteration_history to investigations
    op.add_column('investigations', sa.Column('iteration_history', sa.JSON(), nullable=True))
    
    # Add evidence_trace and reasoning_chain to findings
    op.add_column('findings', sa.Column('evidence_trace', sa.JSON(), nullable=True))
    op.add_column('findings', sa.Column('reasoning_chain', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('findings', 'reasoning_chain')
    op.drop_column('findings', 'evidence_trace')
    op.drop_column('investigations', 'iteration_history')
