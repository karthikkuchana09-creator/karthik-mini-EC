import re
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.tenant import Tenant, TenantStatus
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.schemas.tenant import TenantCreate, TenantUpdate
from app.core.tenant import TenantResolver
from app.core.log import get_logger

logger = get_logger("tenant_service")


# ── Tenant model CRUD (new) ─────────────────────────────────────────


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    return slug


def _make_unique_slug(db: Session, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while db.scalar(select(Tenant).where(Tenant.slug == slug)):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def create_tenant(db: Session, data: TenantCreate):
    existing_email = db.scalar(select(Tenant).where(Tenant.contact_email == data.contact_email))
    if existing_email:
        raise HTTPException(status_code=400, detail="Contact email already in use")

    base_slug = _generate_slug(data.name)
    slug = _make_unique_slug(db, base_slug)

    tenant = Tenant(
        name=data.name,
        slug=slug,
        contact_email=data.contact_email,
        phone=data.phone,
        address=data.address,
        industry=data.industry,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    logger.info("Created tenant id=%d slug=%s", tenant.id, tenant.slug)
    return tenant


def get_tenant(db: Session, tenant_id: int):
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def update_tenant(db: Session, tenant_id: int, data: TenantUpdate):
    tenant = get_tenant(db, tenant_id)

    if data.contact_email is not None and data.contact_email != tenant.contact_email:
        existing = db.scalar(
            select(Tenant).where(Tenant.contact_email == data.contact_email, Tenant.id != tenant_id)
        )
        if existing:
            raise HTTPException(status_code=400, detail="Contact email already in use")
        tenant.contact_email = data.contact_email

    if data.name is not None and data.name != tenant.name:
        base_slug = _generate_slug(data.name)
        tenant.slug = _make_unique_slug(db, base_slug)
        tenant.name = data.name

    if data.phone is not None:
        tenant.phone = data.phone
    if data.address is not None:
        tenant.address = data.address
    if data.industry is not None:
        tenant.industry = data.industry

    db.commit()
    db.refresh(tenant)
    logger.info("Updated tenant id=%d", tenant.id)
    return tenant


def activate_tenant(db: Session, tenant_id: int):
    tenant = get_tenant(db, tenant_id)
    tenant.status = TenantStatus.ACTIVE
    db.commit()
    db.refresh(tenant)
    logger.info("Activated tenant id=%d", tenant.id)
    return tenant


def suspend_tenant(db: Session, tenant_id: int):
    tenant = get_tenant(db, tenant_id)
    tenant.status = TenantStatus.SUSPENDED
    db.commit()
    db.refresh(tenant)
    logger.info("Suspended tenant id=%d", tenant.id)
    return tenant


# ── Legacy Organization-based TenantService (kept for auth_service) ──


class TenantService:

    @staticmethod
    def get_org(db: Session, org_id: int) -> Optional[Organization]:
        return db.scalar(select(Organization).where(Organization.id == org_id))

    @staticmethod
    def get_org_by_slug(db: Session, slug: str) -> Optional[Organization]:
        return db.scalar(select(Organization).where(Organization.slug == slug))

    @staticmethod
    def assert_active(org: Organization) -> None:
        if not org.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization is inactive. Contact support.",
            )

    @staticmethod
    def assert_not_suspended(org: Organization) -> None:
        TenantService.assert_active(org)

    @staticmethod
    def validate_and_get(db: Session, org_id: int) -> Organization:
        org = TenantService.get_org(db, org_id)
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )
        TenantService.assert_active(org)
        return org

    @staticmethod
    def validate_slug(db: Session, slug: str) -> Organization:
        org = TenantService.get_org_by_slug(db, slug)
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )
        TenantService.assert_active(org)
        return org

    @staticmethod
    def create_org(
        db: Session,
        name: str,
        slug: str,
        logo: Optional[str] = None,
        plan: SubscriptionPlan = SubscriptionPlan.free,
    ) -> Organization:
        existing = db.scalar(select(Organization).where(Organization.slug == slug))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Organization slug already exists",
            )
        org = Organization(name=name, slug=slug, logo=logo, subscription_plan=plan)
        db.add(org)
        db.flush()
        settings = OrganizationSettings(organization_id=org.id)
        db.add(settings)
        db.commit()
        db.refresh(org)
        TenantResolver.invalidate_cache(slug)
        TenantResolver.invalidate_cache(org.id)
        return org

    @staticmethod
    def update_org(
        db: Session,
        org_id: int,
        updates: dict,
    ) -> Organization:
        org = TenantService.validate_and_get(db, org_id)
        for key, value in updates.items():
            if value is not None and hasattr(org, key):
                setattr(org, key, value)
        db.commit()
        db.refresh(org)
        TenantResolver.invalidate_cache(org.slug)
        TenantResolver.invalidate_cache(org.id)
        return org

    @staticmethod
    def deactivate_org(db: Session, org_id: int) -> Organization:
        org = TenantService.get_org(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        org.is_active = False
        db.commit()
        db.refresh(org)
        TenantResolver.invalidate_cache(org.slug)
        TenantResolver.invalidate_cache(org.id)
        return org

    @staticmethod
    def activate_org(db: Session, org_id: int) -> Organization:
        org = TenantService.get_org(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        org.is_active = True
        db.commit()
        db.refresh(org)
        TenantResolver.invalidate_cache(org.slug)
        TenantResolver.invalidate_cache(org.id)
        return org

    @staticmethod
    def list_orgs(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        include_inactive: bool = False,
    ) -> list[Organization]:
        stmt = select(Organization)
        if not include_inactive:
            stmt = stmt.where(Organization.is_active == True)
        return db.execute(stmt.order_by(Organization.created_at.desc()).offset(skip).limit(limit)).scalars().all()

    @staticmethod
    def get_settings(db: Session, org_id: int) -> Optional[OrganizationSettings]:
        return db.scalar(select(OrganizationSettings).where(OrganizationSettings.organization_id == org_id))

    @staticmethod
    def update_settings(db: Session, org_id: int, data: dict) -> OrganizationSettings:
        settings = TenantService.get_settings(db, org_id)
        if not settings:
            org = TenantService.get_org(db, org_id)
            if not org:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
            settings = OrganizationSettings(organization_id=org_id)
            db.add(settings)
            db.flush()
        for key, value in data.items():
            if value is not None:
                setattr(settings, key, value)
        db.commit()
        db.refresh(settings)
        return settings

    @staticmethod
    def count_active_users(db: Session, org_id: int) -> int:
        from app.models.user import User
        return db.scalar(select(func.count(User.id)).where(User.tenant_id == org_id, User.is_active == True))

    @staticmethod
    def is_at_user_limit(db: Session, org_id: int) -> bool:
        settings = TenantService.get_settings(db, org_id)
        if not settings:
            return False
        current = TenantService.count_active_users(db, org_id)
        return current >= settings.max_users

    @staticmethod
    def validate_user_limit(db: Session, org_id: int) -> None:
        if TenantService.is_at_user_limit(db, org_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization has reached its user limit. Upgrade your plan.",
            )
