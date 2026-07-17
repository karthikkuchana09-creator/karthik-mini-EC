from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.knowledge_article import KnowledgeArticle
from app.models.platform.knowledge_article_version import KnowledgeArticleVersion
from app.models.platform.knowledge_category import KnowledgeCategory
from app.core.tenant import tenant_filter
from app.services.enterprise_audit_service import (
    log_kb_category_create, log_kb_category_update, log_kb_category_delete,
    log_kb_article_create, log_kb_article_update, log_kb_article_delete,
    log_kb_article_restore,
)
from app.core.cache import cached, invalidate
from app.core.config import settings


@invalidate(patterns=["kb:categories*"])
def create_category(db: Session, data, user, tenant_id: int | None = None):
    existing = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tenant_id)
        .where(KnowledgeCategory.name == data.name)
    )
    if existing:
        raise HTTPException(400, "Category with this name already exists")
    category = KnowledgeCategory(
        name=data.name,
        description=data.description,
        icon=data.icon,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
        tenant_id=tenant_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    log_kb_category_create(db, user.id, category.id, {"name": category.name})
    return category


@cached(prefix="kb:categories", ttl=lambda: settings.CACHE_TTL_KB, exclude_args=[0])
def list_categories(db: Session, tenant_id: int | None = None):
    categories = db.execute(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tenant_id)
        .order_by(KnowledgeCategory.sort_order)
    ).scalars().all()

    cat_ids = [c.id for c in categories]
    if cat_ids:
        count_query = select(KnowledgeArticle.category_id, func.count(KnowledgeArticle.id).label("c")).where(
            KnowledgeArticle.category_id.in_(cat_ids),
            KnowledgeArticle.status == "published",
        )
        if tenant_id:
            count_query = count_query.where(KnowledgeArticle.tenant_id == tenant_id)
        count_rows = db.execute(count_query.group_by(KnowledgeArticle.category_id)).all()
        count_map = {r.category_id: r.c for r in count_rows}
    else:
        count_map = {}

    result = []
    for cat in categories:
        d = {c.name: getattr(cat, c.name) for c in cat.__table__.columns}
        d["article_count"] = count_map.get(cat.id, 0)
        result.append(d)
    return result


@invalidate(patterns=["kb:categories*"])
def update_category(db: Session, category_id: int, data, user, tenant_id: int | None = None):
    cat = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tenant_id)
        .where(KnowledgeCategory.id == category_id)
    )
    if not cat:
        raise HTTPException(404, "Category not found")
    for field in ["name", "description", "icon", "parent_id", "sort_order"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(cat, field, val)
    db.commit()
    db.refresh(cat)
    log_kb_category_update(db, user.id, category_id, None, {"name": cat.name})
    return cat


@invalidate(patterns=["kb:categories*"])
def delete_category(db: Session, category_id: int, user, tenant_id: int | None = None):
    cat = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tenant_id)
        .where(KnowledgeCategory.id == category_id)
    )
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
    log_kb_category_delete(db, user.id, category_id, {"name": cat.name})
    return {"message": "Category deleted"}


# ---------------------------------------------------------------------------
# Articles
# ---------------------------------------------------------------------------

@invalidate(patterns=["kb:articles*", "kb:categories*"])
def create_article(db: Session, data, user, tenant_id: int | None = None):
    article = KnowledgeArticle(
        title=data.title,
        content=data.content,
        category_id=data.category_id,
        tags=data.tags,
        version=1,
        status=data.status,
        author_id=user.id,
        tenant_id=tenant_id,
    )
    db.add(article)
    db.commit()
    db.refresh(article)

    _snapshot_version(db, article, user.id)

    log_kb_article_create(db, user.id, article.id, {"title": article.title, "version": 1})
    return article


def get_article(db: Session, article_id: int, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
        .options(selectinload(KnowledgeArticle.category))
    )
    if not article:
        raise HTTPException(404, "Article not found")
    article.view_count = (article.view_count or 0) + 1
    db.commit()
    return article


@cached(prefix="kb:articles", ttl=lambda: settings.CACHE_TTL_KB, exclude_args=[0])
def list_articles(
    db: Session,
    tenant_id: int | None = None,
    category_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    tag: str | None = None,
    page: int = 1,
    size: int = 20,
):
    query = tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
    if category_id:
        query = query.where(KnowledgeArticle.category_id == category_id)
    if status:
        query = query.where(KnowledgeArticle.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(KnowledgeArticle.title.ilike(pattern), KnowledgeArticle.content.ilike(pattern))
        )
    if tag:
        query = query.where(KnowledgeArticle.tags.ilike(f"%{tag}%"))
    query = query.order_by(KnowledgeArticle.updated_at.desc())
    return paginate(db, query)


@invalidate(patterns=["kb:articles*", "kb:categories*"])
def update_article(db: Session, article_id: int, data, user, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
    )
    if not article:
        raise HTTPException(404, "Article not found")

    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        return article

    _snapshot_version(db, article, user.id)

    article.version += 1
    for key, val in update_data.items():
        setattr(article, key, val)
    db.commit()
    db.refresh(article)

    log_kb_article_update(db, user.id, article_id, None, {"title": article.title, "version": article.version})
    return article


@invalidate(patterns=["kb:articles*", "kb:categories*"])
def delete_article(db: Session, article_id: int, user, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
    )
    if not article:
        raise HTTPException(404, "Article not found")
    db.delete(article)
    db.commit()
    log_kb_article_delete(db, user.id, article_id, {"title": article.title})
    return {"message": "Article deleted"}


# ---------------------------------------------------------------------------
# Versioning
# ---------------------------------------------------------------------------

def _snapshot_version(db: Session, article, created_by: int):
    snapshot = KnowledgeArticleVersion(
        article_id=article.id,
        version_number=article.version,
        title=article.title,
        content=article.content,
        tags=article.tags,
        created_by=created_by,
    )
    db.add(snapshot)
    db.flush()


def list_article_versions(db: Session, article_id: int, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
    )
    if not article:
        raise HTTPException(404, "Article not found")
    versions = db.execute(
        select(KnowledgeArticleVersion)
        .where(KnowledgeArticleVersion.article_id == article_id)
        .order_by(KnowledgeArticleVersion.version_number.desc())
    ).scalars().all()
    return versions


def get_article_version(db: Session, article_id: int, version_id: int, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
    )
    if not article:
        raise HTTPException(404, "Article not found")
    version = db.get(KnowledgeArticleVersion, version_id)
    if not version or version.article_id != article_id:
        raise HTTPException(404, "Version not found")
    return version


@invalidate(patterns=["kb:articles*", "kb:categories*"])
def restore_article_version(db: Session, article_id: int, version_id: int, user, tenant_id: int | None = None):
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tenant_id)
        .where(KnowledgeArticle.id == article_id)
    )
    if not article:
        raise HTTPException(404, "Article not found")
    version = db.get(KnowledgeArticleVersion, version_id)
    if not version or version.article_id != article_id:
        raise HTTPException(404, "Version not found")

    _snapshot_version(db, article, user.id)

    article.version += 1
    article.title = version.title
    article.content = version.content
    article.tags = version.tags
    db.commit()
    db.refresh(article)

    log_kb_article_restore(db, user.id, article_id, version.version_number, {"title": article.title, "version": article.version})
    return article
