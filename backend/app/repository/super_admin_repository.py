from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.organization import Organization
from app.models.subscription import TenantSubscription
from app.models.user import User


def list_all_orgs_for_admin(db: Session):
    stmt = select(Organization).order_by(Organization.created_at.desc())
    return paginate(db, stmt)


def list_all_subs_for_admin(db: Session):
    stmt = select(TenantSubscription).options(
        selectinload(TenantSubscription.plan)
    ).order_by(TenantSubscription.created_at.desc())
    return paginate(db, stmt)


def list_all_users_for_admin(db: Session):
    stmt = select(User).order_by(User.created_at.desc())
    return paginate(db, stmt)
