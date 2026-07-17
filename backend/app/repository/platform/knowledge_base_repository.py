from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.platform.knowledge_article import KnowledgeArticle
from app.models.platform.knowledge_category import KnowledgeCategory


def list_articles(db: Session, tenant_id: int | None = None):
    stmt = select(KnowledgeArticle)
    if tenant_id:
        stmt = stmt.where(KnowledgeArticle.tenant_id == tenant_id)
    return paginate(db, stmt)


def get_article(db: Session, article_id: int):
    return db.get(KnowledgeArticle, article_id)


def list_categories(db: Session, tenant_id: int | None = None):
    stmt = select(KnowledgeCategory).order_by(KnowledgeCategory.sort_order)
    if tenant_id:
        stmt = stmt.where(KnowledgeCategory.tenant_id == tenant_id)
    return db.execute(stmt).scalars().all()
