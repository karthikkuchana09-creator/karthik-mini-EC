from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.workspace_message import WorkspaceMessage


def list_messages_by_workspace(db: Session, workspace_id: int):
    stmt = (
        select(WorkspaceMessage)
        .where(
            WorkspaceMessage.workspace_id == workspace_id,
            WorkspaceMessage.deleted_at.is_(None),
        )
        .order_by(WorkspaceMessage.created_at.desc())
    )
    return paginate(db, stmt)
