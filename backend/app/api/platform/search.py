from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.schemas.platform.search import SearchResponse, EntitySearchResponse
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.search_service import (
    global_search,
    search_tasks,
    search_projects,
    search_documents,
    search_messages,
    ALLOWED_ENTITY_TYPES,
)

router = APIRouter(prefix="/search", tags=["Search"])


@router.get(
    "/global",
    response_model=SearchResponse,
    summary="Global enterprise search",
    description="Search across all authorized modules: tasks, projects, teams, documents, users, meetings, approvals, knowledge articles, and messages. Results are grouped by entity type. Only authorized data is returned based on the user's role and ownership.",
)
def global_search_endpoint(
    q: str = Query(..., min_length=1, description="Search keyword"),
    entity_types: Optional[str] = Query(
        None,
        description="Comma-separated entity types to search. Available: " + ", ".join(sorted(ALLOWED_ENTITY_TYPES)),
    ),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    types = None
    if entity_types:
        types = [t.strip() for t in entity_types.split(",") if t.strip() in ALLOWED_ENTITY_TYPES]
    return global_search(
        db, tenant_id=user.tenant_id, query=q,
        entity_types=types, page=page, size=size, user=user,
    )


@router.get(
    "/projects",
    response_model=EntitySearchResponse,
    summary="Search projects",
    description="Search projects by name or description within your tenant. Returns only projects you created.",
)
def search_projects_endpoint(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return search_projects(db, tenant_id=user.tenant_id, query=q, user=user, page=page, size=size)


@router.get(
    "/tasks",
    response_model=EntitySearchResponse,
    summary="Search tasks",
    description="Search tasks by title or description. Returns only tasks you are assigned to or created.",
)
def search_tasks_endpoint(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return search_tasks(db, tenant_id=user.tenant_id, query=q, user=user, page=page, size=size)


@router.get(
    "/documents",
    response_model=EntitySearchResponse,
    summary="Search documents",
    description="Search documents by file name. Returns only documents you uploaded.",
)
def search_documents_endpoint(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return search_documents(db, tenant_id=user.tenant_id, query=q, user=user, page=page, size=size)


@router.get(
    "/messages",
    response_model=EntitySearchResponse,
    summary="Search messages",
    description="Search channel and workspace messages by content. Returns only messages you sent.",
)
def search_messages_endpoint(
    q: str = Query(..., min_length=1, description="Search keyword"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return search_messages(db, tenant_id=user.tenant_id, query=q, user=user, page=page, size=size)
