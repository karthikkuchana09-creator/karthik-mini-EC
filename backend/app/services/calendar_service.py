from datetime import datetime, date, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.meeting import Meeting, MeetingStatus
from app.models.task import Task
from app.models.project_document import ProjectDocument, DocumentType
from app.models.user import User
from app.schemas.calendar import CalendarEvent
from app.models.project import Project
from app.services.business_validation_service import get_project_or_404, validate_workspace_member
from app.core.tenant import tenant_filter


def _meeting_to_event(meeting: Meeting) -> CalendarEvent:
    return CalendarEvent(
        event_type="meeting",
        id=meeting.id,
        title=meeting.title,
        description=meeting.description,
        event_date=meeting.meeting_date,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        status=meeting.status.value if meeting.status else None,
        url=f"/projects/{meeting.project_id}/meetings/{meeting.id}",
    )


def _task_to_event(task: Task) -> CalendarEvent:
    return CalendarEvent(
        event_type="task_due_date",
        id=task.id,
        title=task.title,
        description=task.description,
        event_date=task.due_date.date() if task.due_date else date.today(),
        status=task.status,
        url=f"/tasks/{task.id}",
    )


def _milestone_to_event(project: Project, kind: str) -> CalendarEvent:
    date_val = project.start_date if kind == "start" else project.due_date
    if not date_val:
        return None
    return CalendarEvent(
        event_type="milestone",
        id=project.id,
        title=f"Project {kind.title()}: {project.name}",
        description=f"Project milestone - {kind}",
        event_date=date_val.date() if isinstance(date_val, datetime) else date_val,
        status=project.status.value if project.status else None,
        url=f"/projects/{project.id}",
    )


def _release_to_event(doc: ProjectDocument) -> CalendarEvent:
    created = doc.created_at
    return CalendarEvent(
        event_type="release",
        id=doc.id,
        title=f"Release: {doc.file_name}",
        description=f"Release document for project",
        event_date=created.date() if isinstance(created, datetime) else date.today(),
        url=f"/projects/{doc.project_id}/documents/{doc.id}",
    )


def get_calendar(
    db: Session,
    project_id: int,
    user: User,
) -> list[CalendarEvent]:
    project = get_project_or_404(db, project_id)
    validate_workspace_member(db, project.workspace_id, user)

    tid = getattr(user, "tenant_id", None)
    events: list[CalendarEvent] = []

    meetings = db.scalars(
        tenant_filter(select(Meeting), Meeting, tid).where(
            Meeting.project_id == project_id,
            Meeting.status != MeetingStatus.CANCELLED,
        )
    ).all()
    events.extend(_meeting_to_event(m) for m in meetings)

    tasks = db.scalars(
        tenant_filter(select(Task), Task, tid).where(
            Task.project_id == project_id,
            Task.due_date.isnot(None),
        )
    ).all()
    events.extend(_task_to_event(t) for t in tasks)

    start_milestone = _milestone_to_event(project, "start")
    if start_milestone:
        events.append(start_milestone)
    due_milestone = _milestone_to_event(project, "due")
    if due_milestone:
        events.append(due_milestone)

    releases = db.scalars(
        tenant_filter(select(ProjectDocument), ProjectDocument, tid).where(
            ProjectDocument.project_id == project_id,
            ProjectDocument.document_type == DocumentType.RELEASE,
        )
    ).all()
    events.extend(_release_to_event(r) for r in releases)

    events.sort(key=lambda e: (e.event_date, e.start_time or e.end_time or e.event_date))

    return events
