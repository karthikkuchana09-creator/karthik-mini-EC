from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.user import User
from app.models.team_member import TeamMember
from app.schemas.workload import WorkloadResponse, UserWorkload
from app.services.business_validation_service import get_team_or_404, get_project_or_404, validate_workspace_member
from app.core.tenant import tenant_filter


PENDING_STATUSES = ("todo", "in_progress", "review")


def _compute_workload(tasks: list[Task]) -> tuple[int, int, int, int]:
    now = datetime.now(timezone.utc)
    total = len(tasks)
    pending = sum(1 for t in tasks if t.status in PENDING_STATUSES)
    completed = sum(1 for t in tasks if t.status == "done")
    overdue = sum(1 for t in tasks if t.due_date and t.due_date < now and t.status != "done")
    return total, pending, completed, overdue


def get_team_workload(
    db: Session,
    team_id: int,
    user: User,
) -> WorkloadResponse:
    team = get_team_or_404(db, team_id)
    validate_workspace_member(db, team.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    all_tasks = db.scalars(
        tenant_filter(select(Task), Task, tid).where(Task.team_id == team_id)
    ).all()

    total, pending, completed, overdue = _compute_workload(all_tasks)

    member_ids = db.scalars(
        select(TeamMember.user_id).where(TeamMember.team_id == team_id)
    ).all()
    users_map = {}
    if member_ids:
        urows = db.execute(select(User.id, User.name).where(User.id.in_(member_ids))).all()
        users_map = {row.id: row.name for row in urows}

    user_workloads = []
    for uid in member_ids:
        name = users_map.get(uid, f"User #{uid}")
        user_tasks = [t for t in all_tasks if t.assigned_to_id == uid]
        ut, up, uc, uo = _compute_workload(user_tasks)
        user_workloads.append(UserWorkload(
            user_id=uid, user_name=name,
            total=ut, pending=up, completed=uc, overdue=uo,
        ))

    return WorkloadResponse(
        total=total, pending=pending, completed=completed, overdue=overdue,
        users=user_workloads,
    )


def get_project_workload(
    db: Session,
    project_id: int,
    user: User,
) -> WorkloadResponse:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    all_tasks = db.scalars(
        tenant_filter(select(Task), Task, tid).where(Task.project_id == project_id)
    ).all()

    total, pending, completed, overdue = _compute_workload(all_tasks)

    member_ids = set()
    for t in all_tasks:
        if t.assigned_to_id:
            member_ids.add(t.assigned_to_id)
    users_map = {}
    if member_ids:
        urows = db.execute(select(User.id, User.name).where(User.id.in_(list(member_ids)))).all()
        users_map = {row.id: row.name for row in urows}

    user_workloads = []
    for uid in sorted(member_ids):
        name = users_map.get(uid, f"User #{uid}")
        user_tasks = [t for t in all_tasks if t.assigned_to_id == uid]
        ut, up, uc, uo = _compute_workload(user_tasks)
        user_workloads.append(UserWorkload(
            user_id=uid, user_name=name,
            total=ut, pending=up, completed=uc, overdue=uo,
        ))

    return WorkloadResponse(
        total=total, pending=pending, completed=completed, overdue=overdue,
        users=user_workloads,
    )
