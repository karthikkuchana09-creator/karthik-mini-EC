from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.tenant import Tenant, TenantStatus
from app.models.workspace import Workspace, WorkspaceVisibility
from app.models.channel import Channel, ChannelType
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.models.user import User, UserRole, SubscriptionRole
from app.models.workspace_member import WorkspaceMember, WorkspaceMemberRole
from app.models.workspace_message import WorkspaceMessage
from app.core.security import hash_password
from app.core.log import get_logger

logger = get_logger("seed_tenants")

EXAMPLE_TENANTS = [
    {"slug": "abc-bank",           "name": "ABC Bank",           "contact_email": "admin@abcbank.com",     "industry": "Banking"},
    {"slug": "xyz-hospital",       "name": "XYZ Hospital",       "contact_email": "admin@xyzhospital.com", "industry": "Healthcare"},
    {"slug": "global-manufacturing","name": "Global Manufacturing","contact_email": "admin@globalmfg.com",  "industry": "Manufacturing"},
    {"slug": "smart-education",    "name": "Smart Education",    "contact_email": "admin@smartedu.com",    "industry": "Education"},
]

WORKSPACE_NAMES = ["Finance", "HR", "IT", "Operations", "Compliance"]

CHANNELS_BY_WORKSPACE = {
    "Finance": [
        {"name": "budget-planning",   "description": "Budget forecasts, allocations, and planning discussions"},
        {"name": "vendor-payments",   "description": "Vendor payment processing and invoice approvals"},
        {"name": "expense-review",    "description": "Employee expense report reviews and approvals"},
        {"name": "audit-discussion",  "description": "Internal and external audit coordination"},
        {"name": "announcements",     "description": "Official finance team announcements", "type": "ANNOUNCEMENT"},
    ],
    "HR": [
        {"name": "recruitment",       "description": "Job postings, interviews, and hiring discussions"},
        {"name": "payroll-discussion", "description": "Payroll processing, tax, and compensation topics"},
        {"name": "performance-reviews","description": "Performance evaluation and feedback discussions"},
        {"name": "employee-relations", "description": "Employee concerns, engagement, and culture"},
        {"name": "announcements",     "description": "Official HR team announcements", "type": "ANNOUNCEMENT"},
    ],
    "IT": [
        {"name": "infrastructure",    "description": "Servers, networks, and cloud infrastructure discussions"},
        {"name": "software-dev",      "description": "Software development, code reviews, and technical design"},
        {"name": "support-tickets",   "description": "IT support ticket triage and resolution"},
        {"name": "security-alerts",   "description": "Security incidents, vulnerabilities, and threat updates"},
        {"name": "announcements",     "description": "Official IT team announcements", "type": "ANNOUNCEMENT"},
    ],
    "Operations": [
        {"name": "project-tracking",  "description": "Project milestones, timelines, and status updates"},
        {"name": "resource-planning", "description": "Resource allocation, capacity planning, and scheduling"},
        {"name": "process-improvement","description": "Process optimization, automation, and workflow improvements"},
        {"name": "incident-reports",  "description": "Operational incidents, root cause analysis, and resolutions"},
        {"name": "announcements",     "description": "Official operations team announcements", "type": "ANNOUNCEMENT"},
    ],
    "Compliance": [
        {"name": "policy-updates",    "description": "Policy changes, new regulations, and compliance requirements"},
        {"name": "audit-reports",     "description": "Audit findings, remediation plans, and compliance status"},
        {"name": "regulatory-changes","description": "Regulatory developments and impact assessments"},
        {"name": "risk-assessment",  "description": "Risk identification, analysis, and mitigation strategies"},
        {"name": "announcements",     "description": "Official compliance team announcements", "type": "ANNOUNCEMENT"},
    ],
}


def _ensure_organization(db: Session, tenant: Tenant) -> Organization:
    org = db.scalar(select(Organization).where(Organization.slug == tenant.slug))
    if org:
        return org
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
    logger.info("Created org %s for tenant %s", org.slug, tenant.slug)
    return org


def _get_or_create_admin(db: Session, tenant: Tenant, org: Organization) -> tuple[User, bool]:
    admin = db.scalar(
        select(User).where(User.tenant_id == org.id, User.role == UserRole.admin)
    )
    if admin:
        return admin, False
    admin = User(
        tenant_id=org.id,
        name=f"{tenant.name} Admin",
        email=tenant.contact_email,
        hashed_password=hash_password("Password@123"),
        role=UserRole.admin,
        subscription_role=SubscriptionRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    logger.info("Created admin %s for %s", admin.email, tenant.slug)
    return admin, True


def _seed_channels_for_workspace(db: Session, workspace: Workspace, admin: User):
    ws_name = workspace.name.replace(" Workspace", "")
    channels_def = CHANNELS_BY_WORKSPACE.get(ws_name, CHANNELS_BY_WORKSPACE["Finance"])
    created = 0
    for ch_def in channels_def:
        ch_slug = f"{workspace.slug}-{ch_def['name']}"
        existing = db.scalar(
            select(Channel).where(Channel.workspace_id == workspace.id, Channel.name == ch_def["name"])
        )
        if existing:
            continue
        channel = Channel(
            tenant_id=workspace.tenant_id,
            workspace_id=workspace.id,
            name=ch_def["name"],
            description=ch_def["description"],
            channel_type=ChannelType(ch_def.get("type", "PUBLIC")),
            created_by=admin.id,
        )
        db.add(channel)
        created += 1
    if created:
        db.flush()
        logger.info("Seeded %d channels for workspace %s", created, workspace.slug)


def seed_example_tenants(db: Session):
    created_tenants = 0
    created_workspaces = 0
    created_admins = 0
    created_channels = 0

    for data in EXAMPLE_TENANTS:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == data["slug"]))
        if not tenant:
            tenant = Tenant(
                name=data["name"],
                slug=data["slug"],
                contact_email=data["contact_email"],
                industry=data["industry"],
                status=TenantStatus.ACTIVE,
            )
            db.add(tenant)
            db.flush()
            created_tenants += 1
            logger.info("Created tenant %s", data["slug"])

        org = _ensure_organization(db, tenant)
        admin, is_new = _get_or_create_admin(db, tenant, org)
        if is_new:
            created_admins += 1

        for ws_name in WORKSPACE_NAMES:
            ws_slug = f"{data['slug']}-{ws_name.lower()}"
            workspace = db.scalar(
                select(Workspace).where(Workspace.tenant_id == tenant.id, Workspace.slug == ws_slug)
            )
            if not workspace:
                workspace = Workspace(
                    tenant_id=tenant.id,
                    name=f"{ws_name} Workspace",
                    slug=ws_slug,
                    description=f"{ws_name} department workspace for {data['name']}",
                    visibility=WorkspaceVisibility.PUBLIC,
                    created_by=admin.id,
                )
                db.add(workspace)
                db.flush()
                created_workspaces += 1
                logger.info("Created workspace %s for %s", ws_slug, data["slug"])

            before_count = db.scalar(
                select(Channel.id).where(Channel.workspace_id == workspace.id).limit(1)
            )
            if before_count is None:
                _seed_channels_for_workspace(db, workspace, admin)

    db.commit()
    _seed_example_users(db)
    _seed_workspace_members(db)
    _seed_example_messages(db)

    if created_tenants:
        logger.info("Seeded %d example tenants", created_tenants)
    if created_admins:
        logger.info("Ensured admin users for all tenants")
    if created_workspaces:
        logger.info("Seeded %d example workspaces", created_workspaces)
    if any([created_tenants, created_admins, created_workspaces]):
        logger.info("Example channels seeded along with workspaces")
    if not any([created_tenants, created_admins, created_workspaces]):
        logger.info("Example data already exists, skipping")


def _seed_workspace_members(db: Session):
    created = 0
    for data in EXAMPLE_TENANTS:
        org = db.scalar(select(Organization).where(Organization.slug == data["slug"]))
        if not org:
            continue
        tenant = db.scalar(select(Tenant).where(Tenant.slug == data["slug"]))
        if not tenant:
            continue

        admin_user = db.scalar(select(User).where(User.tenant_id == org.id, User.role == UserRole.admin))

        for ws_name in WORKSPACE_NAMES:
            ws = db.scalar(
                select(Workspace).where(Workspace.tenant_id == tenant.id, Workspace.name == f"{ws_name} Workspace")
            )
            if not ws:
                continue

            # Determine which users to add to this workspace
            member_emails = []
            if ws_name == "Finance":
                member_emails = [
                    f"finance.manager@{data['slug']}.com",
                    f"accountant@{data['slug']}.com",
                    f"auditor@{data['slug']}.com",
                ]
            elif ws_name == "HR":
                member_emails = [f"hr.manager@{data['slug']}.com"]
            elif ws_name == "IT":
                member_emails = [f"employee@{data['slug']}.com"]

            # Add admin as WORKSPACE_ADMIN
            if admin_user:
                existing = db.scalar(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == ws.id,
                        WorkspaceMember.user_id == admin_user.id,
                    )
                )
                if not existing:
                    db.add(WorkspaceMember(
                        tenant_id=tenant.id,
                        workspace_id=ws.id,
                        user_id=admin_user.id,
                        role=WorkspaceMemberRole.WORKSPACE_ADMIN,
                    ))
                    created += 1

            # Add role-based members
            for email in member_emails:
                user = db.scalar(select(User).where(User.email == email))
                if not user:
                    continue
                existing = db.scalar(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == ws.id,
                        WorkspaceMember.user_id == user.id,
                    )
                )
                if not existing:
                    db.add(WorkspaceMember(
                        tenant_id=tenant.id,
                        workspace_id=ws.id,
                        user_id=user.id,
                        role=WorkspaceMemberRole.MEMBER,
                    ))
                    created += 1

    if created:
        db.commit()
        logger.info("Seeded %d workspace memberships", created)


EXAMPLE_ROLE_USERS = [
    {"name": "Finance Manager", "email_suffix": "finance.manager", "role": UserRole.manager},
    {"name": "Accountant",      "email_suffix": "accountant",      "role": UserRole.employee},
    {"name": "Auditor",         "email_suffix": "auditor",         "role": UserRole.employee},
    {"name": "HR Manager",      "email_suffix": "hr.manager",      "role": UserRole.manager},
    {"name": "Employee",        "email_suffix": "employee",        "role": UserRole.employee},
]


EXAMPLE_MESSAGES = {
    "ABC Bank": {
        "Finance": [
            {"sender_email": "admin@abcbank.com",     "content": "Welcome to the Finance workspace! Let's align on our Q4 closing schedule."},
            {"sender_email": "finance.manager@abc-bank.com", "content": "Quarter closing starts tomorrow. Please complete all pending reports by Friday."},
            {"sender_email": "accountant@abc-bank.com",      "content": "I've reviewed all outstanding invoices. There are 3 vendor payments pending approval."},
            {"sender_email": "auditor@abc-bank.com",          "content": "The Q3 audit findings have been published. Please review the audit-discussion channel."},
        ],
    },
}


def _seed_example_messages(db: Session):
    created = 0
    for tenant_name, ws_data in EXAMPLE_MESSAGES.items():
        tenant = db.scalar(select(Tenant).where(Tenant.name == tenant_name))
        if not tenant:
            continue
        for ws_name, msgs in ws_data.items():
            ws = db.scalar(
                select(Workspace).where(Workspace.tenant_id == tenant.id, Workspace.name == f"{ws_name} Workspace")
            )
            if not ws:
                continue
            for msg_data in msgs:
                sender = db.scalar(select(User).where(User.email == msg_data["sender_email"]))
                if not sender:
                    continue
                existing = db.scalar(
                    select(WorkspaceMessage).where(
                        WorkspaceMessage.workspace_id == ws.id,
                        WorkspaceMessage.sender_id == sender.id,
                        WorkspaceMessage.content == msg_data["content"],
                    )
                )
                if existing:
                    continue
                db.add(WorkspaceMessage(
                    tenant_id=tenant.id,
                    workspace_id=ws.id,
                    sender_id=sender.id,
                    content=msg_data["content"],
                ))
                created += 1
    if created:
        db.commit()
        logger.info("Seeded %d example workspace messages", created)


def _seed_example_users(db: Session):
    created = 0
    for data in EXAMPLE_TENANTS:
        org = db.scalar(select(Organization).where(Organization.slug == data["slug"]))
        if not org:
            continue
        for u_def in EXAMPLE_ROLE_USERS:
            email = f"{u_def['email_suffix']}@{data['slug']}.com"
            existing = db.scalar(select(User).where(User.email == email))
            if existing:
                continue
            user = User(
                tenant_id=org.id,
                name=u_def["name"],
                email=email,
                hashed_password=hash_password("Password@123"),
                role=u_def["role"],
                subscription_role=SubscriptionRole.member,
                is_active=True,
            )
            db.add(user)
            created += 1
    if created:
        db.commit()
        logger.info("Seeded %d example role-based users", created)
