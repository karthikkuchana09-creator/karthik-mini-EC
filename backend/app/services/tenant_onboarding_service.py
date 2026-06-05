import re
from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.tenant import Tenant, TenantStatus
from app.models.tenant_onboarding import TenantOnboarding, OnboardingStatus
from app.models.user import User, UserRole, SubscriptionRole
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.schemas.tenant_onboarding import TenantOnboardRequest, TenantAdminCreateRequest
from app.core.security import hash_password
from app.core.log import get_logger

logger = get_logger("tenant_onboarding_service")


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


def onboard_tenant(db: Session, data: TenantOnboardRequest) -> dict:
    existing_email = db.scalar(select(Tenant).where(Tenant.contact_email == data.contact_email))
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact email already in use",
        )

    existing_user = db.scalar(select(User).where(User.email == data.admin_email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin email already in use",
        )

    base_slug = _generate_slug(data.tenant_name)
    slug = _make_unique_slug(db, base_slug)

    try:
        tenant = Tenant(
            name=data.tenant_name,
            slug=slug,
            contact_email=data.contact_email,
            phone=data.phone,
            address=data.address,
            industry=data.industry,
            status=TenantStatus.ACTIVE,
        )
        db.add(tenant)
        db.flush()

        admin = User(
            tenant_id=tenant.id,
            name=data.admin_name,
            email=data.admin_email,
            hashed_password=hash_password(data.admin_password),
            role=UserRole.admin,
            subscription_role=SubscriptionRole.owner,
            is_active=True,
        )
        db.add(admin)
        db.flush()

        org = Organization(
            name=data.tenant_name,
            slug=slug,
            subscription_plan=SubscriptionPlan.free,
            is_active=True,
        )
        db.add(org)
        db.flush()

        settings = OrganizationSettings(organization_id=org.id)
        db.add(settings)
        db.flush()

        onboarding = TenantOnboarding(
            tenant_id=tenant.id,
            admin_user_id=admin.id,
            onboarding_status=OnboardingStatus.IN_PROGRESS,
            admin_created=True,
            default_workspace_created=True,
            settings_created=True,
        )
        db.add(onboarding)
        db.flush()

        onboarding.onboarding_status = OnboardingStatus.COMPLETED
        onboarding.completed_at = datetime.utcnow()

        db.commit()
        db.refresh(tenant)
        db.refresh(admin)
        db.refresh(onboarding)

        logger.info(
            "Tenant onboarding completed tenant_id=%d admin_id=%d onboarding_id=%d",
            tenant.id, admin.id, onboarding.id,
        )

        return {
            "tenant_id": tenant.id,
            "admin_user_id": admin.id,
            "onboarding_id": onboarding.id,
            "onboarding_status": onboarding.onboarding_status.value,
            "message": "Tenant onboarding completed successfully",
        }

    except Exception as e:
        db.rollback()
        logger.error("Tenant onboarding failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tenant onboarding failed: {str(e)}",
        )


def create_first_admin(db: Session, tenant_id: int, data: TenantAdminCreateRequest) -> User:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    existing_user = db.scalar(select(User).where(User.email == data.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin email already in use",
        )

    existing_onboarding = db.scalar(
        select(TenantOnboarding).where(TenantOnboarding.tenant_id == tenant_id)
    )
    if existing_onboarding and existing_onboarding.admin_created:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin user already created for this tenant",
        )

    try:
        admin = User(
            tenant_id=tenant_id,
            name=data.name,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=UserRole.admin,
            subscription_role=SubscriptionRole.owner,
            is_active=True,
        )
        db.add(admin)
        db.flush()

        if existing_onboarding:
            existing_onboarding.admin_user_id = admin.id
            existing_onboarding.admin_created = True
        else:
            onboarding = TenantOnboarding(
                tenant_id=tenant_id,
                admin_user_id=admin.id,
                onboarding_status=OnboardingStatus.IN_PROGRESS,
                admin_created=True,
            )
            db.add(onboarding)

        db.commit()
        db.refresh(admin)
        logger.info("First admin created tenant_id=%d admin_id=%d", tenant_id, admin.id)
        return admin

    except Exception as e:
        db.rollback()
        logger.error("First admin creation failed tenant_id=%d: %s", tenant_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin user: {str(e)}",
        )


def get_onboarding_status(db: Session, tenant_id: int) -> TenantOnboarding:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    onboarding = db.scalar(
        select(TenantOnboarding).where(TenantOnboarding.tenant_id == tenant_id)
    )
    if not onboarding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding not found for this tenant",
        )

    return onboarding
