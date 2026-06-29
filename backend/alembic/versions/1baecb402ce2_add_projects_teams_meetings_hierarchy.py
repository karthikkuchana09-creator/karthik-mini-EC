"""add_projects_teams_meetings_hierarchy

Revision ID: 1baecb402ce2
Revises: a75802222274
Create Date: 2026-06-29 14:00:05.152327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1baecb402ce2'
down_revision: Union[str, Sequence[str], None] = 'a75802222274'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- teams ---
    op.create_table('teams',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_teams_id'), 'teams', ['id'])
    op.create_index(op.f('ix_teams_tenant_id'), 'teams', ['tenant_id'])
    op.create_index(op.f('ix_teams_workspace_id'), 'teams', ['workspace_id'])

    # --- team_members ---
    op.create_table('team_members',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.Enum('LEAD', 'MEMBER', name='teammemberrole'), nullable=False),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'user_id', name='uq_team_member'),
    )
    op.create_index(op.f('ix_team_members_id'), 'team_members', ['id'])
    op.create_index(op.f('ix_team_members_tenant_id'), 'team_members', ['tenant_id'])
    op.create_index(op.f('ix_team_members_team_id'), 'team_members', ['team_id'])
    op.create_index(op.f('ix_team_members_user_id'), 'team_members', ['user_id'])

    # --- projects ---
    op.create_table('projects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', name='projectstatus'), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='projectpriority'), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'])
    op.create_index(op.f('ix_projects_tenant_id'), 'projects', ['tenant_id'])
    op.create_index(op.f('ix_projects_workspace_id'), 'projects', ['workspace_id'])

    # --- project_teams ---
    op.create_table('project_teams',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'team_id', name='uq_project_team'),
    )
    op.create_index(op.f('ix_project_teams_id'), 'project_teams', ['id'])
    op.create_index(op.f('ix_project_teams_tenant_id'), 'project_teams', ['tenant_id'])
    op.create_index(op.f('ix_project_teams_project_id'), 'project_teams', ['project_id'])
    op.create_index(op.f('ix_project_teams_team_id'), 'project_teams', ['team_id'])

    # --- project_documents ---
    op.create_table('project_documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_documents_id'), 'project_documents', ['id'])
    op.create_index(op.f('ix_project_documents_tenant_id'), 'project_documents', ['tenant_id'])
    op.create_index(op.f('ix_project_documents_project_id'), 'project_documents', ['project_id'])

    # --- meetings ---
    op.create_table('meetings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meeting_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('meeting_link', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='meetingstatus'), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_meetings_id'), 'meetings', ['id'])
    op.create_index(op.f('ix_meetings_tenant_id'), 'meetings', ['tenant_id'])
    op.create_index(op.f('ix_meetings_project_id'), 'meetings', ['project_id'])

    # --- meeting_attendees ---
    op.create_table('meeting_attendees',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('meeting_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE', name='attendeestatus'), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meeting_id', 'user_id', name='uq_meeting_attendee'),
    )
    op.create_index(op.f('ix_meeting_attendees_id'), 'meeting_attendees', ['id'])
    op.create_index(op.f('ix_meeting_attendees_tenant_id'), 'meeting_attendees', ['tenant_id'])
    op.create_index(op.f('ix_meeting_attendees_meeting_id'), 'meeting_attendees', ['meeting_id'])
    op.create_index(op.f('ix_meeting_attendees_user_id'), 'meeting_attendees', ['user_id'])

    # --- meeting_notes ---
    op.create_table('meeting_notes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('meeting_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_meeting_notes_id'), 'meeting_notes', ['id'])
    op.create_index(op.f('ix_meeting_notes_tenant_id'), 'meeting_notes', ['tenant_id'])
    op.create_index(op.f('ix_meeting_notes_meeting_id'), 'meeting_notes', ['meeting_id'])

    # --- ai_meeting_summaries ---
    op.create_table('ai_meeting_summaries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('meeting_id', sa.Integer(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('action_items', sa.Text(), nullable=True),
        sa.Column('key_decisions', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ai_meeting_summaries_id'), 'ai_meeting_summaries', ['id'])
    op.create_index(op.f('ix_ai_meeting_summaries_tenant_id'), 'ai_meeting_summaries', ['tenant_id'])
    op.create_index(op.f('ix_ai_meeting_summaries_meeting_id'), 'ai_meeting_summaries', ['meeting_id'], unique=True)

    # --- channels: add project_id ---
    op.add_column('channels', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_channels_project_id'), 'channels', ['project_id'])
    op.create_foreign_key(
        'fk_channels_project_id', 'channels', 'projects',
        ['project_id'], ['id'], ondelete='SET NULL',
    )

    # --- tasks: add project_id, team_id ---
    op.add_column('tasks', sa.Column('project_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('team_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_tasks_project_id'), 'tasks', ['project_id'])
    op.create_index(op.f('ix_tasks_team_id'), 'tasks', ['team_id'])
    op.create_foreign_key(
        'fk_tasks_project_id', 'tasks', 'projects',
        ['project_id'], ['id'], ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_tasks_team_id', 'tasks', 'teams',
        ['team_id'], ['id'], ondelete='SET NULL',
    )


def downgrade() -> None:
    # Remove task FKs and columns
    op.drop_constraint('fk_tasks_team_id', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_project_id', 'tasks', type_='foreignkey')
    op.drop_index(op.f('ix_tasks_team_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_project_id'), table_name='tasks')
    op.drop_column('tasks', 'team_id')
    op.drop_column('tasks', 'project_id')

    # Remove channel FK and column
    op.drop_constraint('fk_channels_project_id', 'channels', type_='foreignkey')
    op.drop_index(op.f('ix_channels_project_id'), table_name='channels')
    op.drop_column('channels', 'project_id')

    # Drop new tables (order respects FK dependencies)
    op.drop_table('ai_meeting_summaries')
    op.drop_table('meeting_notes')
    op.drop_table('meeting_attendees')
    op.drop_table('meetings')
    op.drop_table('project_documents')
    op.drop_table('project_teams')
    op.drop_table('projects')
    op.drop_table('team_members')
    op.drop_table('teams')
