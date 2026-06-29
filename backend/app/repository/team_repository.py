from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.team import Team


def list_all_teams(db: Session, tenant_id: int, workspace_id: int = None):
    stmt = select(Team).where(Team.tenant_id == tenant_id)
    if workspace_id is not None:
        stmt = stmt.where(Team.workspace_id == workspace_id)
    stmt = stmt.order_by(Team.created_at.desc())
    return paginate(db, stmt)
