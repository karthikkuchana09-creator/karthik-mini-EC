"""add platform infrastructure tables (webhook_retry_logs, usage_aggregations, tenant_metrics)

Revision ID: abcdef123456
Revises: 1267de2f0396, e5f6a1b2c3d4
Create Date: 2026-05-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'abcdef123456'
down_revision: Union[str, Sequence[str], None] = ('1267de2f0396', 'e5f6a1b2c3d4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # webhook_retry_logs
    op.create_table('webhook_retry_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('razorpay_event_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default=sa.text('5')),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_webhook_retry_logs_id'), 'webhook_retry_logs', ['id'], unique=False)
    op.create_index(op.f('ix_webhook_retry_logs_event_type'), 'webhook_retry_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_webhook_retry_logs_razorpay_event_id'), 'webhook_retry_logs', ['razorpay_event_id'], unique=False)
    op.create_index(op.f('ix_webhook_retry_logs_status'), 'webhook_retry_logs', ['status'], unique=False)
    op.create_index(op.f('ix_webhook_retry_logs_next_retry_at'), 'webhook_retry_logs', ['next_retry_at'], unique=False)

    # usage_aggregations
    op.create_table('usage_aggregations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('period', sa.String(length=7), nullable=False),
        sa.Column('metric', sa.String(length=50), nullable=False),
        sa.Column('value', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_usage_aggregations_id'), 'usage_aggregations', ['id'], unique=False)
    op.create_index(op.f('ix_usage_aggregations_organization_id'), 'usage_aggregations', ['organization_id'], unique=False)
    op.create_index(op.f('ix_usage_aggregations_period'), 'usage_aggregations', ['period'], unique=False)
    op.create_index(op.f('ix_usage_aggregations_metric'), 'usage_aggregations', ['metric'], unique=False)

    # tenant_metrics
    op.create_table('tenant_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False, server_default=sa.text('0.0')),
        sa.Column('recorded_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tenant_metrics_id'), 'tenant_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_tenant_metrics_organization_id'), 'tenant_metrics', ['organization_id'], unique=False)
    op.create_index(op.f('ix_tenant_metrics_metric_name'), 'tenant_metrics', ['metric_name'], unique=False)
    op.create_index(op.f('ix_tenant_metrics_recorded_at'), 'tenant_metrics', ['recorded_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tenant_metrics_recorded_at'), table_name='tenant_metrics')
    op.drop_index(op.f('ix_tenant_metrics_metric_name'), table_name='tenant_metrics')
    op.drop_index(op.f('ix_tenant_metrics_organization_id'), table_name='tenant_metrics')
    op.drop_index(op.f('ix_tenant_metrics_id'), table_name='tenant_metrics')
    op.drop_table('tenant_metrics')
    op.drop_index(op.f('ix_usage_aggregations_metric'), table_name='usage_aggregations')
    op.drop_index(op.f('ix_usage_aggregations_period'), table_name='usage_aggregations')
    op.drop_index(op.f('ix_usage_aggregations_organization_id'), table_name='usage_aggregations')
    op.drop_index(op.f('ix_usage_aggregations_id'), table_name='usage_aggregations')
    op.drop_table('usage_aggregations')
    op.drop_index(op.f('ix_webhook_retry_logs_next_retry_at'), table_name='webhook_retry_logs')
    op.drop_index(op.f('ix_webhook_retry_logs_status'), table_name='webhook_retry_logs')
    op.drop_index(op.f('ix_webhook_retry_logs_razorpay_event_id'), table_name='webhook_retry_logs')
    op.drop_index(op.f('ix_webhook_retry_logs_event_type'), table_name='webhook_retry_logs')
    op.drop_index(op.f('ix_webhook_retry_logs_id'), table_name='webhook_retry_logs')
    op.drop_table('webhook_retry_logs')
