from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi_pagination import add_pagination
from app.routes import auth, tasks, users, comments, approvals, dashboard, documents, audit_logs, notifications, ai, leaves, organizations, subscription, credits, usage, payments, webhooks, billing, super_admin, monitoring, sla_rules, sla_tracking, approval_escalations, approval_delegations, notification_preferences as notification_prefs_router, tenants, tenant_onboarding, tenant_collaboration_settings, tenant_collaboration_usage, workspaces, workspace_members, channels, workspace_channels, channel_members, saas_dashboard, workspace_messages, channel_messages, workspace_tasks, channel_tasks, task_documents_route as task_documents, approval_documents_route as approval_documents, teams, team_members, projects, project_teams, project_channels, project_tasks, project_documents, project_meetings, meeting_attendees, meeting_notes, ai_meeting_summaries, project_calendar, team_workload, project_workload
from app.api.platform import knowledge_base_router, custom_forms_router, workflows_router, search_router, reports_router, notification_rules_router, saved_searches_router, analytics_router
from app.websocket.routes import router as ws_router
from app.websocket.manager import manager
from app.websocket.pubsub import ws_pubsub
from app.services.ai_notification_service import start_ai_notification_daemon
from app.ai.scheduler import start_ai_scheduler, stop_ai_scheduler
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from fastapi.middleware.cors import CORSMiddleware
from app.core.log import setup_logging, get_logger, RequestLogMiddleware
from app.core.rate_limiter import RateLimitMiddleware
from app.core.tenant import TenantMiddleware
from app.core.audit_middleware import EnterpriseAuditMiddleware
from app.core.exceptions import register_exception_handlers
from app.core.background_tasks import task_queue
from app.core.redis_client import close as close_redis
from app.core.input_middleware import InputCleaningMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.body_size_middleware import RequestBodySizeMiddleware
from app.core.csrf import CSRFMiddleware
from app.services.enterprise_scheduler import enterprise_scheduler
from app.services.seed_tenants import seed_example_tenants
from app.services.seed_technova import seed_technova
from app.db.session import SessionLocal

setup_logging()
logger = get_logger("main")

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    db = SessionLocal()
    try:
        seed_example_tenants(db)
        seed_technova(db)
    finally:
        db.close()
    manager.start_heartbeat()
    start_ai_notification_daemon()
    task_queue.start()
    await ws_pubsub.start_listener()
    await enterprise_scheduler.start()
    if settings.AI_SCHEDULER_ENABLED:
        start_ai_scheduler()
    yield
    logger.info("Shutting down...")
    await enterprise_scheduler.stop()
    stop_ai_scheduler()
    await task_queue.stop(wait=True)
    await ws_pubsub.stop_listener()
    await close_redis()
    logger.info("Shutdown complete")


app = FastAPI(lifespan=lifespan)

register_exception_handlers(app)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(RequestBodySizeMiddleware)

if settings.INPUT_CLEANING_ENABLED:
    app.add_middleware(InputCleaningMiddleware)

if settings.CSRF_PROTECTION_ENABLED:
    app.add_middleware(CSRFMiddleware)

app.add_middleware(EnterpriseAuditMiddleware)

app.add_middleware(RequestLogMiddleware)

app.add_middleware(TenantMiddleware)

app.add_middleware(
    RateLimitMiddleware,
    requests=200,
    window=60,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(users.router)
app.include_router(comments.router)
app.include_router(approvals.router)
app.include_router(dashboard.router)
app.include_router(documents.router)
app.include_router(audit_logs.router)
app.include_router(notifications.router)
app.include_router(ai.router)
app.include_router(ws_router)
app.include_router(leaves.router)
app.include_router(organizations.router)
app.include_router(subscription.router)
app.include_router(credits.router)
app.include_router(usage.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
app.include_router(billing.router)
app.include_router(super_admin.router)
app.include_router(monitoring.router)
app.include_router(sla_rules.router)
app.include_router(sla_tracking.router)
app.include_router(approval_escalations.router)
app.include_router(approval_delegations.router)
app.include_router(notification_prefs_router.router)
app.include_router(tenants.router)
app.include_router(tenant_onboarding.router)
app.include_router(tenant_collaboration_settings.router)
app.include_router(tenant_collaboration_usage.router)
app.include_router(workspaces.router)
app.include_router(workspace_members.router)
app.include_router(channels.router)
app.include_router(workspace_channels.router)
app.include_router(channel_members.router)
app.include_router(saas_dashboard.router)
app.include_router(workspace_messages.router)
app.include_router(channel_messages.router)
app.include_router(workspace_tasks.router)
app.include_router(channel_tasks.router)
app.include_router(task_documents.router)
app.include_router(approval_documents.router)
app.include_router(teams.router)
app.include_router(team_members.router)
app.include_router(projects.router)
app.include_router(project_teams.router)
app.include_router(project_channels.router)
app.include_router(project_tasks.router)
app.include_router(project_documents.router)
app.include_router(project_meetings.router)
app.include_router(meeting_attendees.router)
app.include_router(meeting_notes.router)
app.include_router(ai_meeting_summaries.router)
app.include_router(project_calendar.router)
app.include_router(team_workload.router)
app.include_router(project_workload.router)
app.include_router(knowledge_base_router)
app.include_router(custom_forms_router)
app.include_router(workflows_router)
app.include_router(search_router)
app.include_router(reports_router)
app.include_router(notification_rules_router)
app.include_router(saved_searches_router)
app.include_router(analytics_router)

add_pagination(app)
logger.info("Application started")