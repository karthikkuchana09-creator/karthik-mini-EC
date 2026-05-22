from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.ai import AIAnalysis


def list_ai_history(db: Session, user_id: int):
    stmt = (
        select(AIAnalysis)
        .where(AIAnalysis.user_id == user_id)
        .order_by(AIAnalysis.created_at.desc())
    )
    return paginate(db, stmt)
