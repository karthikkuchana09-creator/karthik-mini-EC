from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.platform.saved_search import SavedSearch
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_saved_search_create, log_saved_search_delete,
)


def create_saved_search(db: Session, data, user, tenant_id: int | None = None):
    search = SavedSearch(
        name=data.name,
        query=data.query,
        user_id=user.id,
        tenant_id=tenant_id,
    )
    db.add(search)
    db.commit()
    db.refresh(search)
    log_saved_search_create(db, user.id, search.id, {"name": search.name, "query": search.query})
    return search


def get_saved_search(db: Session, search_id: int, user, tenant_id: int | None = None):
    stmt = tenant_filter(
        select(SavedSearch), SavedSearch, tenant_id,
    ).where(SavedSearch.id == search_id)
    search = db.scalar(stmt)
    if not search:
        raise HTTPException(404, "Saved search not found")
    if search.user_id != user.id:
        raise HTTPException(403, "You can only access your own saved searches")
    return search


def list_saved_searches(db: Session, user, tenant_id: int | None = None):
    stmt = tenant_filter(
        select(SavedSearch), SavedSearch, tenant_id,
    ).where(SavedSearch.user_id == user.id).order_by(SavedSearch.created_at.desc())
    from fastapi_pagination.ext.sqlalchemy import paginate
    return paginate(db, stmt)


def delete_saved_search(db: Session, search_id: int, user, tenant_id: int | None = None):
    stmt = tenant_filter(
        select(SavedSearch), SavedSearch, tenant_id,
    ).where(SavedSearch.id == search_id)
    search = db.scalar(stmt)
    if not search:
        raise HTTPException(404, "Saved search not found")
    if search.user_id != user.id:
        raise HTTPException(403, "You can only delete your own saved searches")
    log_saved_search_delete(db, user.id, search_id, {"name": search.name})
    db.delete(search)
    db.commit()
    return {"message": "Saved search deleted"}
