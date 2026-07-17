from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate as fastapi_paginate
from app.models.platform.knowledge_article import KnowledgeArticle
from app.models.platform.knowledge_category import KnowledgeCategory
from app.core.log import get_logger
from app.core.tenant import tenant_filter
from app.services.audit_log_service import log_action

logger = get_logger("knowledge_service")


def create_article(
    db: Session,
    title: str,
    content: str,
    current_user,
    category_id: Optional[int] = None,
    tags: Optional[str] = None,
    status: str = "draft",
    tenant_id: Optional[int] = None,
):
    logger.info(
        "Creating article: title=%s by user_id=%d",
        title, current_user.id,
    )

    tid = tenant_id or getattr(current_user, "tenant_id", None)

    if category_id is not None:
        cat = db.scalar(
            tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
            .where(KnowledgeCategory.id == category_id)
        )
        if not cat:
            raise HTTPException(404, "Category not found")

    article = KnowledgeArticle(
        title=title,
        content=content,
        category_id=category_id,
        tags=tags,
        status=status,
        author_id=current_user.id,
        tenant_id=tid,
    )

    db.add(article)
    db.commit()
    db.refresh(article)

    log_action(
        db, current_user.id, "create", "knowledge_article", article.id,
        new_value={"title": article.title, "status": article.status},
    )

    logger.info("Article created: id=%d title=%s", article.id, article.title)
    return article


def get_article(
    db: Session,
    article_id: int,
    current_user,
    tenant_id: Optional[int] = None,
):
    logger.debug("Fetching article id=%d by user_id=%d", article_id, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tid)
        .where(KnowledgeArticle.id == article_id)
    )

    if not article:
        raise HTTPException(404, "Article not found")

    return article


def increment_view_count(
    db: Session,
    article_id: int,
    current_user,
    tenant_id: Optional[int] = None,
):
    article = get_article(db, article_id, current_user, tenant_id=tenant_id)
    article.view_count = (article.view_count or 0) + 1
    db.commit()
    db.refresh(article)
    return article


def list_articles(
    db: Session,
    current_user,
    tenant_id: Optional[int] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
):
    logger.debug("Listing articles for user_id=%d", current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    query = tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tid)

    if category_id is not None:
        query = query.where(KnowledgeArticle.category_id == category_id)

    if status:
        query = query.where(KnowledgeArticle.status == status)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                KnowledgeArticle.title.ilike(pattern),
                KnowledgeArticle.content.ilike(pattern),
            )
        )

    if tags:
        query = query.where(KnowledgeArticle.tags.ilike(f"%{tags}%"))

    if sort_by:
        column = getattr(KnowledgeArticle, sort_by, None)
        if column:
            order_fn = desc if sort_order == "desc" else asc
            query = query.order_by(order_fn(column))
    else:
        query = query.order_by(KnowledgeArticle.created_at.desc())

    return fastapi_paginate(db, query)


def update_article(
    db: Session,
    article_id: int,
    current_user,
    tenant_id: Optional[int] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    category_id: Optional[str] = None,
    tags: Optional[str] = None,
    status: Optional[str] = None,
):
    logger.info("Updating article id=%d by user_id=%d", article_id, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tid)
        .where(KnowledgeArticle.id == article_id)
    )

    if not article:
        raise HTTPException(404, "Article not found")

    old_value = {"title": article.title, "status": article.status}

    if title is not None:
        article.title = title
    if content is not None:
        article.content = content
    if category_id is not None:
        article.category_id = category_id
    if tags is not None:
        article.tags = tags
    if status is not None:
        article.status = status

    db.commit()
    db.refresh(article)

    log_action(
        db, current_user.id, "update", "knowledge_article", article.id,
        old_value=old_value,
        new_value={"title": article.title, "status": article.status},
    )

    logger.info("Article updated: id=%d title=%s", article.id, article.title)
    return article


def delete_article(
    db: Session,
    article_id: int,
    current_user,
    tenant_id: Optional[int] = None,
):
    logger.info("Deleting article id=%d by user_id=%d", article_id, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    article = db.scalar(
        tenant_filter(select(KnowledgeArticle), KnowledgeArticle, tid)
        .where(KnowledgeArticle.id == article_id)
    )

    if not article:
        raise HTTPException(404, "Article not found")

    log_action(
        db, current_user.id, "delete", "knowledge_article", article_id,
        old_value={"title": article.title, "status": article.status},
    )

    db.delete(article)
    db.commit()

    logger.info("Article id=%d deleted successfully", article_id)
    return {"message": "Article deleted"}


def create_category(
    db: Session,
    name: str,
    current_user,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    parent_id: Optional[int] = None,
    sort_order: int = 0,
    tenant_id: Optional[int] = None,
):
    logger.info("Creating category: name=%s by user_id=%d", name, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)

    if parent_id is not None:
        parent = db.scalar(
            tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
            .where(KnowledgeCategory.id == parent_id)
        )
        if not parent:
            raise HTTPException(404, "Parent category not found")

    category = KnowledgeCategory(
        name=name,
        description=description,
        icon=icon,
        parent_id=parent_id,
        sort_order=sort_order,
        tenant_id=tid,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    log_action(
        db, current_user.id, "create", "knowledge_category", category.id,
        new_value={"name": category.name},
    )

    logger.info("Category created: id=%d name=%s", category.id, category.name)
    return category


def get_category(
    db: Session,
    category_id: int,
    current_user,
    tenant_id: Optional[int] = None,
):
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    category = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
        .where(KnowledgeCategory.id == category_id)
    )
    if not category:
        raise HTTPException(404, "Category not found")
    return category


def list_categories(
    db: Session,
    current_user,
    tenant_id: Optional[int] = None,
):
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    query = (
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
        .order_by(KnowledgeCategory.sort_order.asc(), KnowledgeCategory.name.asc())
    )
    return db.execute(query).scalars().all()


def update_category(
    db: Session,
    category_id: int,
    current_user,
    tenant_id: Optional[int] = None,
    name: Optional[str] = None,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    parent_id: Optional[str] = None,
    sort_order: Optional[int] = None,
):
    logger.info("Updating category id=%d by user_id=%d", category_id, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    category = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
        .where(KnowledgeCategory.id == category_id)
    )

    if not category:
        raise HTTPException(404, "Category not found")

    old_value = {"name": category.name}

    if name is not None:
        category.name = name
    if description is not None:
        category.description = description
    if icon is not None:
        category.icon = icon
    if parent_id is not None:
        if parent_id == category_id:
            raise HTTPException(400, "Category cannot be its own parent")
        category.parent_id = parent_id
    if sort_order is not None:
        category.sort_order = sort_order

    db.commit()
    db.refresh(category)

    log_action(
        db, current_user.id, "update", "knowledge_category", category.id,
        old_value=old_value,
        new_value={"name": category.name},
    )

    logger.info("Category updated: id=%d name=%s", category.id, category.name)
    return category


def delete_category(
    db: Session,
    category_id: int,
    current_user,
    tenant_id: Optional[int] = None,
):
    logger.info("Deleting category id=%d by user_id=%d", category_id, current_user.id)
    tid = tenant_id or getattr(current_user, "tenant_id", None)
    category = db.scalar(
        tenant_filter(select(KnowledgeCategory), KnowledgeCategory, tid)
        .where(KnowledgeCategory.id == category_id)
    )

    if not category:
        raise HTTPException(404, "Category not found")

    article_count = db.scalar(
        select(func.count(KnowledgeArticle.id))
        .where(KnowledgeArticle.category_id == category_id)
    ) or 0

    if article_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete category with {article_count} article(s). Reassign articles first.",
        )

    child_count = db.scalar(
        select(func.count(KnowledgeCategory.id))
        .where(KnowledgeCategory.parent_id == category_id)
    ) or 0

    if child_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete category with {child_count} child category(ies). Remove children first.",
        )

    log_action(
        db, current_user.id, "delete", "knowledge_category", category_id,
        old_value={"name": category.name},
    )

    db.delete(category)
    db.commit()

    logger.info("Category id=%d deleted successfully", category_id)
    return {"message": "Category deleted"}
