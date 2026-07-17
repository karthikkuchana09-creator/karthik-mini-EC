from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_pagination import Page
from app.schemas.platform.knowledge_base import (
    ArticleCreate, ArticleUpdate, ArticleOut, ArticleVersionOut,
    KnowledgeCategoryCreate, KnowledgeCategoryOut,
)
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.knowledge_base_service import (
    create_article, get_article, list_articles, update_article, delete_article,
    create_category, list_categories, update_category, delete_category,
    list_article_versions, get_article_version, restore_article_version,
)

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.post(
    "/categories",
    response_model=KnowledgeCategoryOut,
    summary="Create knowledge category",
    description="Create a new category for organizing knowledge articles. Requires knowledge_category:manage permission.",
)
def create_category_endpoint(
    data: KnowledgeCategoryCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_category_manage)),
):
    return create_category(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "/categories",
    response_model=list[KnowledgeCategoryOut],
    summary="List knowledge categories",
    description="Retrieve all knowledge categories with published article counts. Requires knowledge_article:read permission.",
)
def list_categories_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_read)),
):
    return list_categories(db, tenant_id=user.tenant_id)


@router.put(
    "/categories/{category_id}",
    response_model=KnowledgeCategoryOut,
    summary="Update knowledge category",
    description="Update a category's name, description, icon, or sort order. Requires knowledge_category:manage permission.",
)
def update_category_endpoint(
    category_id: int,
    data: KnowledgeCategoryCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_category_manage)),
):
    return update_category(db, category_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/categories/{category_id}",
    summary="Delete knowledge category",
    description="Delete a knowledge category. Requires knowledge_category:manage permission.",
)
def delete_category_endpoint(
    category_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_category_manage)),
):
    return delete_category(db, category_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Articles
# ---------------------------------------------------------------------------

@router.post(
    "/articles",
    response_model=ArticleOut,
    status_code=201,
    summary="Create knowledge article",
    description="Create a new knowledge article with version 1. A version snapshot is automatically created. Requires knowledge_article:create permission.",
)
def create_article_endpoint(
    data: ArticleCreate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_create)),
):
    return create_article(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "/articles",
    response_model=Page[ArticleOut],
    summary="List knowledge articles",
    description="List articles with optional filters: category_id, status, search (title/content), tag. Paginated. Requires knowledge_article:read permission.",
)
def list_articles_endpoint(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status (draft/published/archived)"),
    search: Optional[str] = Query(None, description="Full-text search in title and content"),
    tag: Optional[str] = Query(None, description="Filter by tag (partial match)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_read)),
):
    return list_articles(db, tenant_id=user.tenant_id, category_id=category_id, status=status, search=search, tag=tag, page=page, size=size)


@router.get(
    "/articles/{article_id}",
    response_model=ArticleOut,
    summary="Get knowledge article",
    description="Retrieve a single article by ID. View count is incremented. Requires knowledge_article:read permission.",
)
def get_article_endpoint(
    article_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_read)),
):
    return get_article(db, article_id, tenant_id=user.tenant_id)


@router.put(
    "/articles/{article_id}",
    response_model=ArticleOut,
    summary="Update knowledge article",
    description="Update article fields. The current version is automatically snapshotted before changes, and the version number increments. Requires knowledge_article:update permission.",
)
def update_article_endpoint(
    article_id: int,
    data: ArticleUpdate = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_update)),
):
    return update_article(db, article_id, data, user, tenant_id=user.tenant_id)


@router.delete(
    "/articles/{article_id}",
    summary="Delete knowledge article",
    description="Permanently delete a knowledge article and its version history. Requires knowledge_article:delete permission.",
)
def delete_article_endpoint(
    article_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_delete)),
):
    return delete_article(db, article_id, user, tenant_id=user.tenant_id)


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------

@router.get(
    "/articles/{article_id}/versions",
    response_model=list[ArticleVersionOut],
    summary="List article versions",
    description="List all historical versions of an article, newest first. Requires knowledge_article:read permission.",
)
def list_versions_endpoint(
    article_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_read)),
):
    return list_article_versions(db, article_id, tenant_id=user.tenant_id)


@router.get(
    "/articles/{article_id}/versions/{version_id}",
    response_model=ArticleVersionOut,
    summary="Get article version",
    description="Retrieve a specific historical version by ID. Requires knowledge_article:read permission.",
)
def get_version_endpoint(
    article_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_read)),
):
    return get_article_version(db, article_id, version_id, tenant_id=user.tenant_id)


@router.post(
    "/articles/{article_id}/versions/{version_id}/restore",
    response_model=ArticleOut,
    summary="Restore article version",
    description="Restore the article to a previous version. The current state is snapshotted before restoration, and version number increments. Requires knowledge_article:update permission.",
)
def restore_version_endpoint(
    article_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.knowledge_article_update)),
):
    return restore_article_version(db, article_id, version_id, user, tenant_id=user.tenant_id)
