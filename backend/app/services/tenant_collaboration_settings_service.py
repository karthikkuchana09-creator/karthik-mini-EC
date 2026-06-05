from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.tenant_collaboration_settings import TenantCollaborationSettings
from app.schemas.tenant_collaboration_settings import TenantCollaborationSettingsUpdate
from app.core.log import get_logger

logger = get_logger("tenant_collaboration_settings_service")


def _get_tenant_or_404(db: Session, tenant_id: int) -> Tenant:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant


def get_collaboration_settings(
    db: Session, tenant_id: int,
) -> TenantCollaborationSettings:
    _get_tenant_or_404(db, tenant_id)

    settings = db.scalar(
        select(TenantCollaborationSettings).where(
            TenantCollaborationSettings.tenant_id == tenant_id
        )
    )
    if not settings:
        settings = TenantCollaborationSettings(tenant_id=tenant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        logger.info("Created default collaboration settings tenant_id=%d", tenant_id)

    return settings


def update_collaboration_settings(
    db: Session, tenant_id: int, data: TenantCollaborationSettingsUpdate,
) -> TenantCollaborationSettings:
    _get_tenant_or_404(db, tenant_id)

    settings = db.scalar(
        select(TenantCollaborationSettings).where(
            TenantCollaborationSettings.tenant_id == tenant_id
        )
    )
    if not settings:
        settings = TenantCollaborationSettings(tenant_id=tenant_id)
        db.add(settings)
        db.flush()

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    logger.info(
        "Updated collaboration settings tenant_id=%d fields=%s",
        tenant_id, list(update_fields.keys()),
    )
    return settings
