from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.project import Project


def list_all_projects(
    db: Session, tenant_id: int,
    workspace_id: int = None,
    include_archived: bool = False,
):
    stmt = select(Project).where(Project.tenant_id == tenant_id)
    if workspace_id is not None:
        stmt = stmt.where(Project.workspace_id == workspace_id)
    if not include_archived:
        stmt = stmt.where(Project.is_archived == False)
    stmt = stmt.order_by(Project.created_at.desc())
    return paginate(db, stmt)
