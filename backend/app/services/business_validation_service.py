from typing import Optional, Union
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.models.team import Team
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.project import Project
from app.models.project_team import ProjectTeam
from app.models.project_document import ProjectDocument
from app.models.meeting import Meeting
from app.models.meeting_attendee import MeetingAttendee

# ──────────────────────────────────────────────
#  Entity Lookup
# ──────────────────────────────────────────────

def _not_found(name: str):
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{name} not found")


def _bad_request(detail: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _conflict(detail: str):
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _forbidden(detail: str):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    ws = db.scalar(select(Workspace).where(Workspace.id == workspace_id))
    if not ws:
        _not_found("Workspace")
    return ws


def get_team_or_404(db: Session, team_id: int) -> Team:
    t = db.scalar(select(Team).where(Team.id == team_id))
    if not t:
        _not_found("Team")
    return t


def get_project_or_404(db: Session, project_id: int) -> Project:
    p = db.scalar(select(Project).where(Project.id == project_id))
    if not p:
        _not_found("Project")
    return p


def get_meeting_or_404(db: Session, meeting_id: int) -> Meeting:
    m = db.scalar(select(Meeting).where(Meeting.id == meeting_id))
    if not m:
        _not_found("Meeting")
    return m


def get_user_or_404(db: Session, user_id: int) -> User:
    u = db.scalar(select(User).where(User.id == user_id))
    if not u:
        _not_found("User")
    return u


# ──────────────────────────────────────────────
#  Tenant Isolation
# ──────────────────────────────────────────────

def validate_same_tenant(entity_a, entity_b, label_a: str = "Entity", label_b: str = "entity"):
    ta = getattr(entity_a, "tenant_id", None)
    tb = getattr(entity_b, "tenant_id", None)
    if ta is not None and tb is not None and ta != tb:
        _bad_request(f"{label_a} and {label_b} belong to different tenants")


def validate_tenant_match(entity, tenant_id: int, label: str = "Entity"):
    eid = getattr(entity, "tenant_id", None)
    if eid is not None and eid != tenant_id:
        _bad_request(f"{label} does not belong to this tenant")


def validate_user_tenant(user: User, tenant_id: int):
    if user.tenant_id is not None and user.tenant_id != tenant_id:
        _forbidden("User does not belong to this tenant")


# ──────────────────────────────────────────────
#  Workspace Membership & Role
# ──────────────────────────────────────────────

def _get_workspace_membership(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,
        )
    )


def validate_workspace_member(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    get_workspace_or_404(db, workspace_id)
    member = _get_workspace_membership(db, workspace_id, user.id)
    if not member:
        _forbidden("User is not a member of this workspace")
    return member


def validate_workspace_admin(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    member = validate_workspace_member(db, workspace_id, user)
    if member.role != WorkspaceMemberRole.WORKSPACE_ADMIN:
        _forbidden("Workspace admin access required")
    return member


def validate_workspace_moderator(db: Session, workspace_id: int, user: User) -> WorkspaceMember:
    member = validate_workspace_member(db, workspace_id, user)
    if member.role not in (WorkspaceMemberRole.WORKSPACE_ADMIN, WorkspaceMemberRole.MODERATOR):
        _forbidden("Workspace moderator or admin access required")
    return member


def validate_workspace_task_assignment(
    db: Session, workspace_id: int, user: User, assignee_id: int | None,
) -> WorkspaceMember:
    member = validate_workspace_member(db, workspace_id, user)
    if assignee_id is not None:
        assignee = _get_workspace_membership(db, workspace_id, assignee_id)
        if not assignee:
            _forbidden("Assignee is not a member of this workspace")
        is_admin_or_mod = member.role in (WorkspaceMemberRole.WORKSPACE_ADMIN, WorkspaceMemberRole.MODERATOR)
        is_manager_or_above = user.role.value in ("manager", "admin", "super_admin")
        if not is_admin_or_mod and not is_manager_or_above:
            _forbidden("Only workspace admin, moderator, or manager can assign tasks")
    return member


# ──────────────────────────────────────────────
#  Team Membership & Role
# ──────────────────────────────────────────────

def validate_team_member(db: Session, team_id: int, user_id: int) -> TeamMember:
    member = db.scalar(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    if not member:
        _bad_request("User is not a member of this team")
    return member


def validate_team_lead_limit(db: Session, team_id: int):
    existing = db.scalar(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.role == TeamMemberRole.LEAD,
        )
    )
    if existing:
        _conflict("A team lead already exists for this team. Remove the current lead first.")


def validate_no_duplicate_team_member(db: Session, team_id: int, user_id: int):
    existing = db.scalar(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    if existing:
        _conflict("User is already a member of this team")


# ──────────────────────────────────────────────
#  Project Access & Ownership
# ──────────────────────────────────────────────

def validate_project_access(db: Session, project_id: int, user: User) -> Project:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)
    return project


def validate_project_ownership(db: Session, project_id: int, user: User) -> Project:
    project = get_project_or_404(db, project_id)
    if project.created_by != user.id:
        _forbidden("Only the project owner can perform this action")
    return project


def validate_owner_in_workspace(db: Session, user_id: int, workspace_id: int):
    member = _get_workspace_membership(db, workspace_id, user_id)
    if not member:
        _bad_request("Owner must be an active member of the workspace")


# ──────────────────────────────────────────────
#  Cross-Resource Validation
# ──────────────────────────────────────────────

def validate_same_workspace(entity_a, entity_b, label_a: str = "Entity", label_b: str = "entity"):
    wa = getattr(entity_a, "workspace_id", None)
    wb = getattr(entity_b, "workspace_id", None)
    if wa is not None and wb is not None and wa != wb:
        _bad_request(f"{label_a} and {label_b} belong to different workspaces")


def validate_same_project(entity_a, entity_b, label_a: str = "Entity", label_b: str = "entity"):
    pa = getattr(entity_a, "project_id", None)
    pb = getattr(entity_b, "project_id", None)
    if pa is not None and pb is not None and pa != pb:
        _bad_request(f"{label_a} and {label_b} belong to different projects")


def validate_team_belongs_to_project(db: Session, team_id: int, project_id: int):
    link = db.scalar(
        select(ProjectTeam).where(
            ProjectTeam.project_id == project_id,
            ProjectTeam.team_id == team_id,
        )
    )
    if not link:
        _bad_request("Team is not assigned to this project")


def validate_user_belongs_to_team(db: Session, user_id: int, team_id: int):
    validate_team_member(db, team_id, user_id)


def validate_user_in_project_teams(db: Session, user_id: int, project_id: int):
    team_ids = db.scalars(
        select(ProjectTeam.team_id).where(ProjectTeam.project_id == project_id)
    ).all()
    if not team_ids:
        _bad_request("No teams are assigned to this project")
    membership = db.scalar(
        select(TeamMember).where(
            TeamMember.team_id.in_(team_ids),
            TeamMember.user_id == user_id,
        )
    )
    if not membership:
        _bad_request("User is not a member of any team assigned to this project")


def validate_workspace_not_archived(workspace: Workspace):
    if workspace.is_archived:
        _bad_request("Cannot perform action in an archived workspace")


def validate_project_not_archived(project: Project):
    if project.is_archived:
        _bad_request("Cannot update an archived project")


# ──────────────────────────────────────────────
#  Duplicate Assignment Checks
# ──────────────────────────────────────────────

def validate_no_duplicate_project_team(db: Session, project_id: int, team_id: int):
    existing = db.scalar(
        select(ProjectTeam).where(
            ProjectTeam.project_id == project_id,
            ProjectTeam.team_id == team_id,
        )
    )
    if existing:
        _conflict("Team is already assigned to this project")


def validate_no_duplicate_meeting_attendee(db: Session, meeting_id: int, user_id: int):
    existing = db.scalar(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == user_id,
        )
    )
    if existing:
        _conflict("User is already an attendee of this meeting")


# ──────────────────────────────────────────────
#  File Ownership
# ──────────────────────────────────────────────

def validate_file_owner(document: ProjectDocument, user: User):
    if document.uploaded_by is not None and document.uploaded_by != user.id:
        _forbidden("You do not have permission to modify this document")


# ──────────────────────────────────────────────
#  Role-Based Permissions
# ──────────────────────────────────────────────

ALLOWED_ROLES = {"admin", "manager", "super_admin"}


def validate_has_role(user: User, *allowed_roles: str) -> bool:
    if user.role.value not in allowed_roles:
        _forbidden(f"Requires one of these roles: {', '.join(allowed_roles)}")
    return True


def validate_workspace_role(db: Session, workspace_id: int, user: User, *roles: WorkspaceMemberRole):
    member = validate_workspace_member(db, workspace_id, user)
    if member.role not in roles:
        names = ", ".join(r.value for r in roles)
        _forbidden(f"Requires one of these workspace roles: {names}")
    return member
