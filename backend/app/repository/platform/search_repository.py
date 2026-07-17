from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.models.platform.knowledge_article import KnowledgeArticle


def search_articles(db: Session, query: str, tenant_id: int | None = None):
    pattern = f"%{query}%"
    stmt = select(KnowledgeArticle).where(
        or_(
            KnowledgeArticle.title.ilike(pattern),
            KnowledgeArticle.content.ilike(pattern),
        )
    )
    if tenant_id:
        stmt = stmt.where(KnowledgeArticle.tenant_id == tenant_id)
    return db.execute(stmt).scalars().all()
