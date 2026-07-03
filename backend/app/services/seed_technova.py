from datetime import date, time, datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.tenant import Tenant, TenantStatus
from app.models.workspace import Workspace, WorkspaceVisibility
from app.models.team import Team
from app.models.project import Project, ProjectStatus
from app.models.project_team import ProjectTeam
from app.models.channel import Channel, ChannelType
from app.models.task import Task
from app.models.meeting import Meeting, MeetingStatus
from app.models.project_document import ProjectDocument, DocumentType
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.models.user import User, UserRole, SubscriptionRole
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.core.security import hash_password
from app.core.log import get_logger

logger = get_logger("seed_technova")


def seed_technova(db: Session):
    tenant, org, admin = _ensure_tenant(db)
    workspace = _ensure_workspace(db, tenant, admin)
    teams = _ensure_teams(db, tenant, workspace, admin)
    project = _ensure_project(db, tenant, workspace, admin)
    _assign_teams_to_project(db, project, teams)
    channels = _ensure_channels(db, tenant, workspace, project, admin)
    _ensure_tasks(db, project, workspace, teams, admin, org)
    _ensure_meetings(db, project, admin)
    _ensure_documents(db, project, admin)
    db.commit()
    logger.info("TechNova seeding complete")


def _ensure_tenant(db: Session):
    tenant = db.scalar(select(Tenant).where(Tenant.slug == "technova-solutions"))
    if not tenant:
        tenant = Tenant(
            name="TechNova Solutions Pvt Ltd",
            slug="technova-solutions",
            contact_email="admin@technova.com",
            industry="Technology",
            status=TenantStatus.ACTIVE,
        )
        db.add(tenant)
        db.flush()
        logger.info("Created tenant: TechNova Solutions Pvt Ltd")

    org = db.scalar(select(Organization).where(Organization.slug == tenant.slug))
    if not org:
        org = Organization(
            name=tenant.name,
            slug=tenant.slug,
            subscription_plan=SubscriptionPlan.free,
            is_active=True,
        )
        db.add(org)
        db.flush()
        settings = OrganizationSettings(organization_id=org.id)
        db.add(settings)
        db.flush()

    admin = db.scalar(
        select(User).where(User.tenant_id == org.id, User.role == UserRole.admin)
    )
    if not admin:
        admin = User(
            tenant_id=org.id,
            name="TechNova Admin",
            email="admin@technova.com",
            hashed_password=hash_password("Password@123"),
            role=UserRole.admin,
            subscription_role=SubscriptionRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.flush()

    existing_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == 0,
            WorkspaceMember.user_id == admin.id,
        )
    )

    return tenant, org, admin


def _ensure_workspace(db: Session, tenant: Tenant, admin: User) -> Workspace:
    ws = db.scalar(
        select(Workspace).where(
            Workspace.tenant_id == tenant.id,
            Workspace.slug == "technova-engineering",
        )
    )
    if not ws:
        ws = Workspace(
            tenant_id=tenant.id,
            name="Engineering Workspace",
            slug="technova-engineering",
            description="Engineering workspace for TechNova Solutions",
            visibility=WorkspaceVisibility.PUBLIC,
            created_by=admin.id,
        )
        db.add(ws)
        db.flush()
        logger.info("Created workspace: Engineering Workspace")

    existing_member = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == admin.id,
        )
    )
    if not existing_member:
        db.add(WorkspaceMember(
            tenant_id=tenant.id,
            workspace_id=ws.id,
            user_id=admin.id,
            role=WorkspaceMemberRole.WORKSPACE_ADMIN,
        ))
        db.flush()

    return ws


def _ensure_teams(db: Session, tenant: Tenant, workspace: Workspace, admin: User):
    team_names = ["Backend Team", "Frontend Team", "QA Team", "DevOps Team"]
    teams = {}
    for name in team_names:
        team = db.scalar(
            select(Team).where(
                Team.tenant_id == tenant.id,
                Team.name == name,
                Team.workspace_id == workspace.id,
            )
        )
        if not team:
            team = Team(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                name=name,
                description=f"{name} for Engineering Workspace",
                created_by=admin.id,
            )
            db.add(team)
            db.flush()
            logger.info("Created team: %s", name)
        teams[name] = team
    return teams


def _ensure_project(db: Session, tenant: Tenant, workspace: Workspace, admin: User) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.tenant_id == tenant.id,
            Project.workspace_id == workspace.id,
            Project.name == "Enterprise Flow SaaS Development",
        )
    )
    if not project:
        project = Project(
            tenant_id=tenant.id,
            workspace_id=workspace.id,
            name="Enterprise Flow SaaS Development",
            description="Enterprise workflow SaaS platform development project",
            status=ProjectStatus.ACTIVE,
            start_date=datetime.utcnow(),
            created_by=admin.id,
        )
        db.add(project)
        db.flush()
        logger.info("Created project: Enterprise Flow SaaS Development")
    return project


def _assign_teams_to_project(db: Session, project: Project, teams: dict):
    for name, team in teams.items():
        existing = db.scalar(
            select(ProjectTeam).where(
                ProjectTeam.project_id == project.id,
                ProjectTeam.team_id == team.id,
            )
        )
        if not existing:
            pt = ProjectTeam(
                tenant_id=project.tenant_id,
                project_id=project.id,
                team_id=team.id,
            )
            db.add(pt)
            db.flush()
            logger.info("Assigned team %s to project", name)


def _ensure_channels(
    db: Session, tenant: Tenant, workspace: Workspace, project: Project, admin: User
):
    channel_defs = [
        {"name": "backend", "type": ChannelType.PROJECT},
        {"name": "frontend", "type": ChannelType.PROJECT},
        {"name": "testing", "type": ChannelType.PROJECT},
        {"name": "deployment", "type": ChannelType.PROJECT},
    ]
    channels = {}
    for cd in channel_defs:
        ch = db.scalar(
            select(Channel).where(
                Channel.tenant_id == tenant.id,
                Channel.workspace_id == workspace.id,
                Channel.name == cd["name"],
            )
        )
        if not ch:
            ch = Channel(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                name=cd["name"],
                description=f"#{cd['name']} channel for Enterprise Flow SaaS",
                channel_type=cd["type"],
                project_id=project.id,
                created_by=admin.id,
            )
            db.add(ch)
            db.flush()
            logger.info("Created channel: #%s", cd["name"])
        channels[cd["name"]] = ch
    return channels


def _ensure_tasks(
    db: Session,
    project: Project,
    workspace: Workspace,
    teams: dict,
    admin: User,
    org: Organization,
):
    task_defs = [
        {"title": "Implement Login API", "team": "Backend Team", "priority": "high"},
        {"title": "Create Dashboard UI", "team": "Frontend Team", "priority": "high"},
        {"title": "Test Approval Workflow", "team": "QA Team", "priority": "medium"},
        {"title": "Deploy Release Build", "team": "DevOps Team", "priority": "high"},
    ]
    for td in task_defs:
        existing = db.scalar(
            select(Task).where(
                Task.project_id == project.id,
                Task.title == td["title"],
            )
        )
        if not existing:
            task = Task(
                tenant_id=org.id,
                workspace_id=workspace.id,
                project_id=project.id,
                team_id=teams[td["team"]].id,
                title=td["title"],
                status="todo",
                priority=td["priority"],
                created_by_id=admin.id,
            )
            db.add(task)
            db.flush()
            logger.info("Created task: %s", td["title"])


def _ensure_meetings(db: Session, project: Project, admin: User):
    meeting_defs = [
        {"title": "Sprint Planning", "date": date.today()},
        {"title": "Daily Standup", "date": date.today()},
        {"title": "Sprint Review", "date": date.today()},
        {"title": "Client Demo", "date": date.today()},
    ]
    for md in meeting_defs:
        existing = db.scalar(
            select(Meeting).where(
                Meeting.project_id == project.id,
                Meeting.title == md["title"],
            )
        )
        if not existing:
            meeting = Meeting(
                tenant_id=project.tenant_id,
                project_id=project.id,
                title=md["title"],
                meeting_date=md["date"],
                status=MeetingStatus.SCHEDULED,
                created_by=admin.id,
            )
            db.add(meeting)
            db.flush()
            logger.info("Created meeting: %s", md["title"])


def _ensure_documents(db: Session, project: Project, admin: User):
    doc_defs = [
        {"name": "Requirement Specification.pdf", "type": DocumentType.REQUIREMENT},
        {"name": "API Contract.docx", "type": DocumentType.DESIGN},
        {"name": "Deployment Guide.pdf", "type": DocumentType.RELEASE},
        {"name": "Test Plan.xlsx", "type": DocumentType.TEST},
    ]
    for dd in doc_defs:
        existing = db.scalar(
            select(ProjectDocument).where(
                ProjectDocument.project_id == project.id,
                ProjectDocument.file_name == dd["name"],
            )
        )
        if not existing:
            doc = ProjectDocument(
                tenant_id=project.tenant_id,
                project_id=project.id,
                file_name=dd["name"],
                file_path=f"uploads/projects/{project.id}/{dd['name']}",
                file_size=0,
                mime_type="application/octet-stream",
                document_type=dd["type"],
                uploaded_by=admin.id,
            )
            db.add(doc)
            db.flush()
            logger.info("Created document record: %s", dd["name"])
