from datetime import datetime
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.tenant_collaboration_usage import TenantCollaborationUsage
from app.models.organization import Organization
from app.models.user import User
from app.core.log import get_logger

logger = get_logger("tenant_collaboration_usage_service")


def _get_tenant_or_404(db: Session, tenant_id: int) -> Tenant:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )
    return tenant


def _get_or_create_usage(db: Session, tenant_id: int) -> TenantCollaborationUsage:
    usage = db.scalar(
        select(TenantCollaborationUsage).where(
            TenantCollaborationUsage.tenant_id == tenant_id
        )
    )
    if not usage:
        usage = TenantCollaborationUsage(tenant_id=tenant_id)
        db.add(usage)
        db.flush()
    return usage


def recalculate_usage(
    db: Session, tenant_id: int,
) -> TenantCollaborationUsage:
    _get_tenant_or_404(db, tenant_id)

    workspace_count = db.scalar(
        select(sa_func.count(Organization.id))
    ) or 0

    channel_count = 0

    member_count = db.scalar(
        select(sa_func.count(User.id))
    ) or 0

    storage_used_mb = 0.0

    usage = _get_or_create_usage(db, tenant_id)
    usage.workspace_count = workspace_count
    usage.channel_count = channel_count
    usage.member_count = member_count
    usage.storage_used_mb = storage_used_mb
    usage.last_calculated_at = datetime.utcnow()

    db.commit()
    db.refresh(usage)

    logger.info(
        "Recalculated collaboration usage tenant_id=%d workspaces=%d channels=%d members=%d storage=%.2fMB",
        tenant_id, workspace_count, channel_count, member_count, storage_used_mb,
    )
    return usage


def get_usage(
    db: Session, tenant_id: int,
) -> TenantCollaborationUsage:
    _get_tenant_or_404(db, tenant_id)

    usage = db.scalar(
        select(TenantCollaborationUsage).where(
            TenantCollaborationUsage.tenant_id == tenant_id
        )
    )
    if not usage:
        usage = TenantCollaborationUsage(tenant_id=tenant_id)
        db.add(usage)
        db.commit()
        db.refresh(usage)
        logger.info("Created default usage record tenant_id=%d", tenant_id)

    return usage
