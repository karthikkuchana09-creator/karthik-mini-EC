from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.saved_search import SavedSearch
from app.core.tenant import tenant_filter


def list_saved_searches(db: Session, tenant_id: int, user_id: int):
    stmt = select(SavedSearch).where(
        SavedSearch.user_id == user_id,
    )
    stmt = tenant_filter(stmt, SavedSearch, tenant_id)
    stmt = stmt.order_by(SavedSearch.created_at.desc())
    return paginate(db, stmt)


def get_saved_search(db: Session, search_id: int, tenant_id: int | None = None):
    stmt = select(SavedSearch).where(SavedSearch.id == search_id)
    if tenant_id:
        stmt = tenant_filter(stmt, SavedSearch, tenant_id)
    return db.scalar(stmt)
