from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, cast, Date
from fastapi_pagination.ext.sqlalchemy import paginate
from app.models.tenant import Tenant, TenantStatus
from app.models.workspace import Workspace
from app.models.channel import Channel
from app.models.user import User
from app.models.tenant_collaboration_usage import TenantCollaborationUsage
from app.core.log import get_logger

logger = get_logger("saas_dashboard_service")


class SaasDashboardService:

    @staticmethod
    def get_summary(db: Session) -> dict:
        total_tenants = db.scalar(select(func.count(Tenant.id))) or 0
        active_tenants = db.scalar(
            select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.ACTIVE)
        ) or 0
        suspended_tenants = db.scalar(
            select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.SUSPENDED)
        ) or 0
        trial_tenants = db.scalar(
            select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.TRIAL)
        ) or 0
        cancelled_tenants = db.scalar(
            select(func.count(Tenant.id)).where(Tenant.status == TenantStatus.CANCELLED)
        ) or 0
        total_workspaces = db.scalar(select(func.count(Workspace.id))) or 0
        total_channels = db.scalar(select(func.count(Channel.id))) or 0
        total_users = db.scalar(select(func.count(User.id))) or 0

        return {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "suspended_tenants": suspended_tenants,
            "trial_tenants": trial_tenants,
            "cancelled_tenants": cancelled_tenants,
            "total_workspaces": total_workspaces,
            "total_channels": total_channels,
            "total_users": total_users,
        }

    @staticmethod
    def get_tenant_growth(db: Session, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        results = db.execute(
            select(
                cast(Tenant.created_at, Date).label("date"),
                func.count(Tenant.id).label("count"),
            )
            .where(Tenant.created_at >= cutoff)
            .group_by(cast(Tenant.created_at, Date))
            .order_by(cast(Tenant.created_at, Date))
        ).all()

        return [{"date": str(row.date), "count": row.count} for row in results]

    @staticmethod
    def get_usage(db: Session) -> list[dict]:
        results = db.execute(
            select(
                Tenant.id.label("tenant_id"),
                Tenant.name.label("tenant_name"),
                Tenant.slug,
                func.coalesce(TenantCollaborationUsage.workspace_count, 0).label("workspace_count"),
                func.coalesce(TenantCollaborationUsage.channel_count, 0).label("channel_count"),
                func.coalesce(TenantCollaborationUsage.member_count, 0).label("member_count"),
                func.coalesce(TenantCollaborationUsage.storage_used_mb, 0.0).label("storage_used_mb"),
            )
            .outerjoin(
                TenantCollaborationUsage,
                TenantCollaborationUsage.tenant_id == Tenant.id,
            )
            .order_by(Tenant.name)
        ).all()

        return [
            {
                "tenant_id": row.tenant_id,
                "tenant_name": row.tenant_name,
                "slug": row.slug,
                "workspace_count": row.workspace_count,
                "channel_count": row.channel_count,
                "member_count": row.member_count,
                "storage_used_mb": float(row.storage_used_mb),
            }
            for row in results
        ]

    @staticmethod
    def get_top_tenants(db: Session):
        stmt = (
            select(
                Tenant.id.label("tenant_id"),
                Tenant.name.label("tenant_name"),
                Tenant.slug,
                Tenant.status,
                func.coalesce(TenantCollaborationUsage.workspace_count, 0).label("workspace_count"),
                func.coalesce(TenantCollaborationUsage.channel_count, 0).label("channel_count"),
                func.coalesce(TenantCollaborationUsage.storage_used_mb, 0.0).label("storage_used_mb"),
                Tenant.created_at,
            )
            .outerjoin(
                TenantCollaborationUsage,
                TenantCollaborationUsage.tenant_id == Tenant.id,
            )
            .order_by(
                func.coalesce(TenantCollaborationUsage.workspace_count, 0).desc(),
                func.coalesce(TenantCollaborationUsage.channel_count, 0).desc(),
                Tenant.created_at.desc(),
            )
        )
        return paginate(db, stmt)
