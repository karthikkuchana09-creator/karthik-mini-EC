from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project
from app.models.team import Team
from app.models.document import Document
from app.models.user import User
from app.models.meeting import Meeting
from app.models.approval import Approval
from app.models.channel_message import ChannelMessage
from app.models.workspace_message import WorkspaceMessage
from app.models.platform.knowledge_article import KnowledgeArticle
from app.core.tenant import tenant_filter
from app.core.cache import cached
from app.core.config import settings
from app.services.enterprise_audit_service import log_search


ENTITY_MAP = {
    "tasks": {"model": Task, "title_col": Task.title, "desc_col": Task.description, "url": "/tasks/{}"},
    "projects": {"model": Project, "title_col": Project.name, "desc_col": Project.description, "url": "/projects/{}"},
    "teams": {"model": Team, "title_col": Team.name, "desc_col": Team.description, "url": "/teams/{}"},
    "documents": {"model": Document, "title_col": Document.file_name, "desc_col": None, "url": "/documents/{}"},
    "users": {"model": User, "title_col": User.name, "desc_col": User.email, "url": "/users/{}"},
    "meetings": {"model": Meeting, "title_col": Meeting.title, "desc_col": Meeting.description, "url": "/meetings/{}"},
    "approvals": {"model": Approval, "title_col": Approval.title, "desc_col": Approval.description, "url": "/approvals/{}"},
    "knowledge_articles": {"model": KnowledgeArticle, "title_col": KnowledgeArticle.title, "desc_col": KnowledgeArticle.content, "url": "/knowledge-base/{}"},
}

MESSAGE_ENTITY = {
    "messages": {
        "models": [ChannelMessage, WorkspaceMessage],
        "title_col": None,
        "desc_col": None,
        "content_cols": [ChannelMessage.content, WorkspaceMessage.content],
        "url": "/messages/{}",
    },
}

ALLOWED_ENTITY_TYPES = list(ENTITY_MAP.keys()) + ["messages"]
DEFAULT_ENTITY_TYPES = [
    "tasks", "projects", "teams", "documents",
    "users", "meetings", "approvals", "knowledge_articles",
]


# ---------------------------------------------------------------------------
# Permission helpers – restrict results to data the user is authorized to see
# ---------------------------------------------------------------------------

def _apply_user_filter(stmt, model, user):
    table = model.__tablename__
    uid = user.id

    if table == "tasks":
        stmt = stmt.where(
            or_(model.assigned_to_id == uid, model.created_by_id == uid)
        )
    elif table == "projects":
        stmt = stmt.where(model.created_by == uid)
    elif table == "documents":
        stmt = stmt.where(model.uploaded_by == uid)
    elif table == "approvals":
        stmt = stmt.where(model.requested_by == uid)
    elif table == "meetings":
        stmt = stmt.where(model.created_by == uid)
    elif table == "channel_messages":
        stmt = stmt.where(model.sender_id == uid)
    elif table == "workspace_messages":
        stmt = stmt.where(model.sender_id == uid)
    elif table == "teams":
        pass
    elif table == "knowledge_articles":
        pass

    return stmt


# ---------------------------------------------------------------------------
# Core search logic
# ---------------------------------------------------------------------------

def _search_entity(
    db: Session,
    model,
    title_col,
    desc_col,
    url_template,
    pattern: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    stmt = select(model)
    if hasattr(model, "tenant_id"):
        stmt = tenant_filter(stmt, model, tenant_id)

    if user is not None:
        stmt = _apply_user_filter(stmt, model, user)

    if desc_col is not None:
        stmt = stmt.where(or_(title_col.ilike(pattern), desc_col.ilike(pattern)))
    else:
        stmt = stmt.where(title_col.ilike(pattern))

    total = db.execute(stmt.with_only_columns(model.id).limit(None).offset(None).order_by(None)).count() if hasattr(db, 'execute') else 0

    stmt = stmt.offset((page - 1) * size).limit(size)

    try:
        results = db.execute(stmt).scalars().all()
    except Exception:
        results = []

    items = []
    for r in results:
        title = str(getattr(r, title_col.name if hasattr(title_col, 'name') else '', '')) if title_col else ''
        desc = str(getattr(r, desc_col.name if hasattr(desc_col, 'name') else '', '')) if desc_col else ''
        items.append({
            "id": getattr(r, "id", 0),
            "title": title,
            "description": desc[:200] if desc else None,
            "url": url_template.format(getattr(r, "id", 0)),
        })

    return items


def _search_messages(
    db: Session,
    pattern: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    all_items = []
    for model_cls, content_col in [(ChannelMessage, ChannelMessage.content), (WorkspaceMessage, WorkspaceMessage.content)]:
        stmt = select(model_cls)
        if hasattr(model_cls, "tenant_id"):
            stmt = tenant_filter(stmt, model_cls, tenant_id)

        if user is not None:
            stmt = _apply_user_filter(stmt, model_cls, user)

        stmt = stmt.where(content_col.ilike(pattern))
        stmt = stmt.offset((page - 1) * size).limit(size)

        try:
            results = db.execute(stmt).scalars().all()
        except Exception:
            results = []

        for r in results:
            content = str(getattr(r, "content", ""))
            all_items.append({
                "id": getattr(r, "id", 0),
                "title": content[:100],
                "description": content[:200] if content else None,
                "url": f"/messages/{getattr(r, 'id', 0)}",
            })

    return all_items


# ---------------------------------------------------------------------------
# Global grouped search
# ---------------------------------------------------------------------------

@cached(prefix="search:global", ttl=lambda: settings.CACHE_TTL_SEARCH, exclude_args=[0])
def global_search(
    db: Session,
    tenant_id: int | None = None,
    query: str = "",
    entity_types: Optional[list[str]] = None,
    page: int = 1,
    size: int = 20,
    user=None,
):
    if not query:
        return {"query": "", "total": 0, "groups": [], "page": page, "size": size}

    if entity_types is None:
        entity_types = DEFAULT_ENTITY_TYPES

    pattern = f"%{query}%"
    groups = []
    total = 0

    for etype in entity_types:
        if etype in ENTITY_MAP:
            info = ENTITY_MAP[etype]
            items = _search_entity(
                db, info["model"], info["title_col"], info["desc_col"],
                info["url"], pattern, tenant_id, user, page, size,
            )
        elif etype == "messages":
            items = _search_messages(db, pattern, tenant_id, user, page, size)
        else:
            continue

        if not items:
            continue

        group = {
            "entity_type": etype if etype != "messages" else "messages",
            "count": len(items),
            "results": [
                {
                    "id": it["id"],
                    "title": it["title"],
                    "description": it["description"],
                    "entity_type": etype if etype != "messages" else "messages",
                    "url": it["url"],
                }
                for it in items
            ],
        }
        groups.append(group)
        total += len(items)

    if user:
        log_search(db, user.id, query, entity_types, total, tenant_id=tenant_id)

    return {
        "query": query,
        "total": total,
        "groups": groups,
        "page": page,
        "size": size,
    }


# ---------------------------------------------------------------------------
# Entity-specific search
# ---------------------------------------------------------------------------

@cached(prefix="search:tasks", ttl=lambda: settings.CACHE_TTL_SEARCH, exclude_args=[0])
def search_tasks(
    db: Session,
    query: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    if not query:
        return {"query": "", "entity_type": "tasks", "total": 0, "results": [], "page": page, "size": size}

    info = ENTITY_MAP["tasks"]
    items = _search_entity(
        db, info["model"], info["title_col"], info["desc_col"],
        info["url"], f"%{query}%", tenant_id, user, page, size,
    )
    if user:
        log_search(db, user.id, query, ["tasks"], len(items), tenant_id=tenant_id)
    return {
        "query": query,
        "entity_type": "tasks",
        "total": len(items),
        "results": items,
        "page": page,
        "size": size,
    }


@cached(prefix="search:projects", ttl=lambda: settings.CACHE_TTL_SEARCH, exclude_args=[0])
def search_projects(
    db: Session,
    query: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    if not query:
        return {"query": "", "entity_type": "projects", "total": 0, "results": [], "page": page, "size": size}

    info = ENTITY_MAP["projects"]
    items = _search_entity(
        db, info["model"], info["title_col"], info["desc_col"],
        info["url"], f"%{query}%", tenant_id, user, page, size,
    )
    if user:
        log_search(db, user.id, query, ["projects"], len(items), tenant_id=tenant_id)
    return {
        "query": query,
        "entity_type": "projects",
        "total": len(items),
        "results": items,
        "page": page,
        "size": size,
    }


@cached(prefix="search:documents", ttl=lambda: settings.CACHE_TTL_SEARCH, exclude_args=[0])
def search_documents(
    db: Session,
    query: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    if not query:
        return {"query": "", "entity_type": "documents", "total": 0, "results": [], "page": page, "size": size}

    info = ENTITY_MAP["documents"]
    items = _search_entity(
        db, info["model"], info["title_col"], info["desc_col"],
        info["url"], f"%{query}%", tenant_id, user, page, size,
    )
    if user:
        log_search(db, user.id, query, ["documents"], len(items), tenant_id=tenant_id)
    return {
        "query": query,
        "entity_type": "documents",
        "total": len(items),
        "results": items,
        "page": page,
        "size": size,
    }


@cached(prefix="search:messages", ttl=lambda: settings.CACHE_TTL_SEARCH, exclude_args=[0])
def search_messages(
    db: Session,
    query: str,
    tenant_id: int | None = None,
    user=None,
    page: int = 1,
    size: int = 20,
):
    if not query:
        return {"query": "", "entity_type": "messages", "total": 0, "results": [], "page": page, "size": size}

    items = _search_messages(db, f"%{query}%", tenant_id, user, page, size)
    if user:
        log_search(db, user.id, query, ["messages"], len(items), tenant_id=tenant_id)
    return {
        "query": query,
        "entity_type": "messages",
        "total": len(items),
        "results": items,
        "page": page,
        "size": size,
    }
