"""benchmarks table

Revision ID: 004_benchmarks
Revises: 003_replays
Create Date: 2026-05-22 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '004_benchmarks'
down_revision: Union[str, None] = '003_replays'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('benchmark_runs',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('true_positives', sa.Integer(), nullable=False),
    sa.Column('false_positives', sa.Integer(), nullable=False),
    sa.Column('false_negatives', sa.Integer(), nullable=False),
    sa.Column('hallucinations_caught', sa.Integer(), nullable=False),
    sa.Column('confidence_accuracy', sa.Float(), nullable=False),
    sa.Column('ground_truth_reference', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('benchmark_runs')
