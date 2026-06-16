from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.approval_document import ApprovalDocument


def list_documents_by_approval(db: Session, approval_id: int):
    stmt = (
        select(ApprovalDocument)
        .where(ApprovalDocument.approval_id == approval_id)
        .options(selectinload(ApprovalDocument.uploader))
        .order_by(ApprovalDocument.created_at.desc())
    )
    return paginate(db, stmt)
