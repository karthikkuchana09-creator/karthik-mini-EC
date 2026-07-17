"""
Phase 10D Enterprise Seed Script
Populates all Phase 10D platform tables with realistic enterprise data for TechNova Solutions.
Run from backend directory: python -m sql.seed_phase10d
"""
import sys
import os
import json
from datetime import datetime, timedelta, date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.base import Base
from app.models.tenant import Tenant
from app.models.organization import Organization
from app.models.user import User, UserRole, SubscriptionRole
from app.models.workspace import Workspace
from app.models.team import Team
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.project import Project
from app.models.meeting import Meeting
from app.models.task import Task
from app.models.platform.workflow_definition import WorkflowDefinition
from app.models.platform.workflow_rule import WorkflowRule
from app.models.platform.workflow_execution import WorkflowExecution
from app.models.platform.notification_rule import NotificationRule
from app.models.platform.saved_search import SavedSearch
from app.models.platform.knowledge_category import KnowledgeCategory
from app.models.platform.knowledge_article import KnowledgeArticle
from app.models.platform.custom_form import CustomForm
from app.models.platform.custom_form_field import CustomFormField
from app.core.security import hash_password

SEED_TIMESTAMP = datetime(2026, 7, 15, 9, 0, 0)


def run_seed():
    db = SessionLocal()
    result = {
        "tenant": None,
        "users": [],
        "workflows": [],
        "workflow_rules": [],
        "workflow_executions": [],
        "notification_rules": [],
        "saved_searches": [],
        "knowledge_categories": [],
        "knowledge_articles": [],
        "custom_forms": [],
        "custom_form_fields": [],
    }

    try:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == "technova-solutions"))
        if not tenant:
            print("ERROR: TechNova tenant not found. Run seed_technova.py first.")
            return
        org = db.scalar(select(Organization).where(Organization.slug == "technova-solutions"))
        workspace = db.scalar(select(Workspace).where(Workspace.slug == "technova-engineering"))
        admin = db.scalar(select(User).where(User.tenant_id == org.id, User.role == UserRole.admin))

        teams = {}
        for name in ["Backend Team", "Frontend Team", "QA Team", "DevOps Team"]:
            team = db.scalar(select(Team).where(Team.tenant_id == tenant.id, Team.name == name))
            if team:
                teams[name] = team

        project = db.scalar(select(Project).where(
            Project.tenant_id == tenant.id,
            Project.name == "Enterprise Flow SaaS Development"
        ))

        meetings = {}
        for m in db.scalars(select(Meeting).where(Meeting.project_id == project.id)).all():
            meetings[m.title] = m

        existing_users = {}
        for u in db.scalars(select(User).where(User.tenant_id == org.id)).all():
            existing_users[u.email] = u

        result["tenant"] = {"id": tenant.id, "name": tenant.name, "slug": tenant.slug}

        users_data = [
            {"name": "Project Manager", "email": "pm@technova.com", "role": UserRole.manager, "sub_role": SubscriptionRole.member},
            {"name": "Backend Lead", "email": "backend.lead@technova.com", "role": UserRole.manager, "sub_role": SubscriptionRole.member},
            {"name": "Backend Developer", "email": "backend.dev@technova.com", "role": UserRole.employee, "sub_role": SubscriptionRole.member},
            {"name": "Frontend Lead", "email": "frontend.lead@technova.com", "role": UserRole.manager, "sub_role": SubscriptionRole.member},
            {"name": "Frontend Developer", "email": "frontend.dev@technova.com", "role": UserRole.employee, "sub_role": SubscriptionRole.member},
            {"name": "QA Lead", "email": "qa.lead@technova.com", "role": UserRole.manager, "sub_role": SubscriptionRole.member},
            {"name": "QA Engineer", "email": "qa.engineer@technova.com", "role": UserRole.employee, "sub_role": SubscriptionRole.member},
            {"name": "DevOps Engineer", "email": "devops@technova.com", "role": UserRole.employee, "sub_role": SubscriptionRole.member},
        ]

        users = {}
        for ud in users_data:
            if ud["email"] in existing_users:
                users[ud["email"]] = existing_users[ud["email"]]
                print(f"  User already exists: {ud['email']}")
                continue
            u = User(
                tenant_id=org.id,
                name=ud["name"],
                email=ud["email"],
                hashed_password=hash_password("Password@123"),
                role=ud["role"],
                subscription_role=ud["sub_role"],
                is_active=True,
            )
            db.add(u)
            db.flush()
            users[ud["email"]] = u
            print(f"  Created user: {ud['name']} <{ud['email']}>")
            result["users"].append({"id": u.id, "name": u.name, "email": u.email, "role": u.role.value})

        users[admin.email] = admin

        team_memberships = {
            "Backend Team": [
                ("backend.lead@technova.com", TeamMemberRole.LEAD),
                ("backend.dev@technova.com", TeamMemberRole.MEMBER),
            ],
            "Frontend Team": [
                ("frontend.lead@technova.com", TeamMemberRole.LEAD),
                ("frontend.dev@technova.com", TeamMemberRole.MEMBER),
            ],
            "QA Team": [
                ("qa.lead@technova.com", TeamMemberRole.LEAD),
                ("qa.engineer@technova.com", TeamMemberRole.MEMBER),
            ],
            "DevOps Team": [
                ("devops@technova.com", TeamMemberRole.LEAD),
            ],
        }

        for team_name, members in team_memberships.items():
            team = teams.get(team_name)
            if not team:
                continue
            for email, role in members:
                user = users.get(email)
                if not user:
                    continue
                existing = db.scalar(
                    select(TeamMember).where(
                        TeamMember.team_id == team.id,
                        TeamMember.user_id == user.id,
                    )
                )
                if not existing:
                    tm = TeamMember(
                        tenant_id=tenant.id,
                        team_id=team.id,
                        user_id=user.id,
                        role=role,
                    )
                    db.add(tm)
                    db.flush()

        existing_tasks = {}
        for t in db.scalars(select(Task).where(Task.project_id == project.id)).all():
            existing_tasks[t.title] = t

        tasks_to_assign = {
            "Implement Login API": "backend.dev@technova.com",
            "Create Dashboard UI": "frontend.dev@technova.com",
            "Test Approval Workflow": "qa.engineer@technova.com",
            "Deploy Release Build": "devops@technova.com",
        }
        for title, email in tasks_to_assign.items():
            task = existing_tasks.get(title)
            if task and not task.assigned_to_id:
                task.assigned_to_id = users[email].id
                db.flush()

        admin_user = users.get("admin@technova.com") or admin
        pm_user = users.get("pm@technova.com")
        backend_lead = users.get("backend.lead@technova.com")
        frontend_lead = users.get("frontend.lead@technova.com")
        qa_lead = users.get("qa.lead@technova.com")

        # ──────────────────────────────────────────────
        # 1. WORKFLOW DEFINITIONS
        # ──────────────────────────────────────────────
        existing_wfs = {}
        for w in db.scalars(select(WorkflowDefinition).where(WorkflowDefinition.tenant_id == tenant.id)).all():
            existing_wfs[w.name] = w

        wf_data = [
            {
                "name": "Approval Escalation Workflow",
                "description": "Escalate pending approvals to higher management after 3 business days without action",
                "entity_type": "APPROVAL",
                "trigger_event": "on_approval_pending",
            },
            {
                "name": "Meeting Reminder Workflow",
                "description": "Send automated reminders 30 minutes and 5 minutes before scheduled meetings",
                "entity_type": "MEETING",
                "trigger_event": "on_meeting_upcoming",
            },
            {
                "name": "Project Delay Notification",
                "description": "Notify stakeholders when project milestones are delayed beyond the grace period",
                "entity_type": "PROJECT",
                "trigger_event": "on_milestone_delayed",
            },
            {
                "name": "Document Approval Workflow",
                "description": "Route uploaded documents through review and approval before marking as published",
                "entity_type": "DOCUMENT",
                "trigger_event": "on_document_upload",
            },
            {
                "name": "Task Status Change Workflow",
                "description": "Automatically update project progress and notify stakeholders on task status changes",
                "entity_type": "TASK",
                "trigger_event": "on_status_change",
            },
        ]

        workflows = {}
        for wd in wf_data:
            if wd["name"] in existing_wfs:
                workflows[wd["name"]] = existing_wfs[wd["name"]]
                continue
            wf_result = db.execute(
                text("""
                    INSERT INTO workflow_definitions (name, description, entity_type, trigger_event, status, is_deleted, created_by_id, created_by, created_at, updated_at, tenant_id)
                    VALUES (:name, :desc, :entity_type, :trigger_event, 'active', 0, :created_by_id, :created_by, :created_at, :updated_at, :tenant_id)
                """),
                {
                    "name": wd["name"],
                    "desc": wd["description"],
                    "entity_type": wd["entity_type"],
                    "trigger_event": wd["trigger_event"],
                    "created_by_id": admin_user.id,
                    "created_by": admin_user.id,
                    "created_at": SEED_TIMESTAMP,
                    "updated_at": SEED_TIMESTAMP,
                    "tenant_id": tenant.id,
                },
            )
            db.flush()
            wf_id = wf_result.lastrowid
            wf = db.get(WorkflowDefinition, wf_id)
            workflows[wd["name"]] = wf
            result["workflows"].append({"id": wf.id, "name": wf.name, "entity_type": wf.entity_type, "trigger_event": wf.trigger_event})

        # Also include the 3 pre-existing workflows from seed_technova
        for name in ["Task Overdue Notification", "Approval Reminder", "New Project Onboarding"]:
            if name in existing_wfs:
                workflows[name] = existing_wfs[name]

        print(f"  Workflows: {len(workflows)} total")

        # ──────────────────────────────────────────────
        # 2. WORKFLOW RULES
        # ──────────────────────────────────────────────
        existing_rules = set()
        for r in db.scalars(select(WorkflowRule)).all():
            existing_rules.add((r.workflow_id, r.name))

        rules_data = [
            {
                "wf_name": "Task Overdue Notification",
                "rules": [
                    {
                        "name": "Notify Project Manager on Overdue Task",
                        "description": "Send immediate notification to project manager when any task exceeds its due date",
                        "condition_config": {"field": "status", "operator": "eq", "value": "overdue", "time_delay_hours": 0},
                        "action_config": {"type": "notify", "params": {"recipients": ["project_manager"], "message": "Task {entity_name} is now overdue. Please review and take action.", "channels": ["email", "in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Escalate to Admin on 5-Day Overdue",
                        "description": "Escalate to tenant admin if task remains overdue for more than 5 days",
                        "condition_config": {"field": "status", "operator": "eq", "value": "overdue", "time_delay_hours": 120},
                        "action_config": {"type": "escalate", "params": {"recipients": ["admin"], "message": "Task {entity_name} has been overdue for 5+ days. Escalation required.", "channels": ["email", "in_app"]}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "Approval Reminder",
                "rules": [
                    {
                        "name": "First Reminder at 48 Hours",
                        "description": "Send first reminder to approver after 48 hours of pending approval",
                        "condition_config": {"field": "status", "operator": "eq", "value": "pending", "time_delay_hours": 48},
                        "action_config": {"type": "notify", "params": {"recipients": ["approver"], "message": "You have a pending approval {entity_name} for 48 hours. Please review.", "channels": ["in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Second Reminder at 72 Hours",
                        "description": "Escalate to team lead if approval remains pending for 72 hours",
                        "condition_config": {"field": "status", "operator": "eq", "value": "pending", "time_delay_hours": 72},
                        "action_config": {"type": "escalate", "params": {"recipients": ["team_lead"], "message": "Approval {entity_name} pending for 72 hours. Escalating for review.", "channels": ["email", "in_app"]}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "Approval Escalation Workflow",
                "rules": [
                    {
                        "name": "Auto-Escalate After 3 Days",
                        "description": "Automatically escalate pending approvals to department head after 3 business days",
                        "condition_config": {"field": "days_pending", "operator": "gte", "value": 3, "business_days_only": True},
                        "action_config": {"type": "escalate", "params": {"recipients": ["department_head"], "message": "Approval {entity_name} has exceeded the 3-day SLA. Auto-escalating.", "channels": ["email", "in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Notify Creator of Escalation",
                        "description": "Inform the approval creator that their request has been escalated",
                        "condition_config": {"field": "action", "operator": "eq", "value": "escalated"},
                        "action_config": {"type": "notify", "params": {"recipients": ["creator"], "message": "Your approval request {entity_name} has been escalated to management.", "channels": ["in_app"]}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "Meeting Reminder Workflow",
                "rules": [
                    {
                        "name": "30-Minute Pre-Meeting Reminder",
                        "description": "Send reminder notification to all attendees 30 minutes before meeting start",
                        "condition_config": {"field": "minutes_before", "operator": "eq", "value": 30},
                        "action_config": {"type": "notify", "params": {"recipients": ["all_attendees"], "message": "Reminder: {entity_name} starts in 30 minutes.", "channels": ["in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "5-Minute Final Reminder",
                        "description": "Send final reminder 5 minutes before meeting start",
                        "condition_config": {"field": "minutes_before", "operator": "eq", "value": 5},
                        "action_config": {"type": "notify", "params": {"recipients": ["all_attendees"], "message": "{entity_name} starts in 5 minutes. Please join now.", "channels": ["in_app"]}},
                        "priority": 2,
                    },
                    {
                        "name": "Notify Absent Attendees",
                        "description": "Send follow-up notification to attendees who haven't joined within 10 minutes",
                        "condition_config": {"field": "minutes_after_start", "operator": "gte", "value": 10, "condition": "not_joined"},
                        "action_config": {"type": "notify", "params": {"recipients": ["absent_attendees"], "message": "You missed the start of {entity_name}. Meeting notes will be shared.", "channels": ["in_app"]}},
                        "priority": 3,
                    },
                ],
            },
            {
                "wf_name": "Project Delay Notification",
                "rules": [
                    {
                        "name": "Notify Project Owner on Milestone Delay",
                        "description": "Alert project owner when a milestone exceeds its deadline",
                        "condition_config": {"field": "milestone_status", "operator": "eq", "value": "delayed"},
                        "action_config": {"type": "notify", "params": {"recipients": ["project_owner"], "message": "Project milestone in {entity_name} has been delayed. Review required.", "channels": ["email", "in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Weekly Delay Summary Report",
                        "description": "Generate and send weekly summary of all project delays to management",
                        "condition_config": {"field": "report_type", "operator": "eq", "value": "weekly_summary", "schedule": "every_monday_9am"},
                        "action_config": {"type": "generate_report", "params": {"recipients": ["management"], "report": "delay_summary", "format": "pdf", "channels": ["email"]}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "Document Approval Workflow",
                "rules": [
                    {
                        "name": "Route to Reviewer on Upload",
                        "description": "Automatically assign document for review when uploaded by team member",
                        "condition_config": {"field": "uploader_role", "operator": "in", "value": ["employee", "manager"]},
                        "action_config": {"type": "assign_review", "params": {"recipients": ["team_lead", "designated_reviewer"], "message": "New document '{entity_name}' requires your review.", "channels": ["in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Notify Admin on Approval Completion",
                        "description": "Notify admin when document review is completed and ready for final approval",
                        "condition_config": {"field": "review_status", "operator": "eq", "value": "reviewed"},
                        "action_config": {"type": "notify", "params": {"recipients": ["admin"], "message": "Document '{entity_name}' review completed. Pending your final approval.", "channels": ["in_app"]}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "Task Status Change Workflow",
                "rules": [
                    {
                        "name": "Notify Assignee on Status Change",
                        "description": "Send notification to task assignee when status is changed by another user",
                        "condition_config": {"field": "changed_by", "operator": "ne", "value": "assignee"},
                        "action_config": {"type": "notify", "params": {"recipients": ["assignee"], "message": "Task '{entity_name}' status changed to {new_status} by {changed_by_name}.", "channels": ["in_app"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Auto-Update Project Progress",
                        "description": "Recalculate project completion percentage when any task status changes to done",
                        "condition_config": {"field": "new_status", "operator": "eq", "value": "done"},
                        "action_config": {"type": "update_project", "params": {"operation": "recalculate_progress", "notify": True}},
                        "priority": 2,
                    },
                ],
            },
            {
                "wf_name": "New Project Onboarding",
                "rules": [
                    {
                        "name": "Create Default Channels",
                        "description": "Create a set of default collaboration channels when a new project is created",
                        "condition_config": {"field": "status", "operator": "eq", "value": "active"},
                        "action_config": {"type": "create_channels", "params": {"channels": ["general", "announcements", "development", "design"]}},
                        "priority": 1,
                    },
                    {
                        "name": "Add Welcome Document",
                        "description": "Add a welcome document with project guidelines and onboarding steps",
                        "condition_config": {"field": "status", "operator": "eq", "value": "active"},
                        "action_config": {"type": "create_document", "params": {"title": "Welcome to the Project", "content": "## Welcome\n\nThis document outlines the project guidelines, team contacts, and onboarding steps.", "template": "project_welcome"}},
                        "priority": 2,
                    },
                ],
            },
        ]

        all_rules = []
        for wd in rules_data:
            wf = workflows.get(wd["wf_name"])
            if not wf:
                continue
            for rd in wd["rules"]:
                key = (wf.id, rd["name"])
                if key in existing_rules:
                    continue
                rule = WorkflowRule(
                    workflow_id=wf.id,
                    name=rd["name"],
                    description=rd["description"],
                    condition_config=rd["condition_config"],
                    action_config=rd["action_config"],
                    priority=rd["priority"],
                    is_active=True,
                    created_at=SEED_TIMESTAMP,
                    updated_at=SEED_TIMESTAMP,
                )
                db.add(rule)
                db.flush()
                all_rules.append(rule)
                result["workflow_rules"].append({
                    "id": rule.id, "name": rule.name, "workflow_id": rule.workflow_id,
                    "priority": rule.priority, "is_active": rule.is_active,
                })

        print(f"  Workflow Rules: {len(all_rules)} created")

        # ──────────────────────────────────────────────
        # 3. WORKFLOW EXECUTIONS
        # ──────────────────────────────────────────────
        existing_exec = db.execute(
            text("SELECT COUNT(*) FROM workflow_executions WHERE tenant_id = :tid"),
            {"tid": tenant.id},
        ).scalar()
        exec_count = existing_exec or 0

        if exec_count == 0:
            task_ids = [t.id for t in db.scalars(select(Task).where(Task.project_id == project.id)).all()]
            approval_ids = list(range(1, 6))
            meeting_ids = [m.id for m in db.scalars(select(Meeting).where(Meeting.project_id == project.id)).all()]

            executions_data = [
                {"wf_name": "Task Overdue Notification", "entity_type": "TASK", "entity_id": task_ids[0] if task_ids else 1, "trigger_event": "on_overdue", "status": "success", "started_by": admin_user.id, "offset_hours": 0},
                {"wf_name": "Task Overdue Notification", "entity_type": "TASK", "entity_id": task_ids[1] if len(task_ids) > 1 else 2, "trigger_event": "on_overdue", "status": "success", "started_by": admin_user.id, "offset_hours": -2},
                {"wf_name": "Task Overdue Notification", "entity_type": "TASK", "entity_id": task_ids[2] if len(task_ids) > 2 else 3, "trigger_event": "on_overdue", "status": "failed", "started_by": admin_user.id, "offset_hours": -5, "error": "Notification delivery failed: user offline"},
                {"wf_name": "Task Overdue Notification", "entity_type": "TASK", "entity_id": task_ids[0] if task_ids else 1, "trigger_event": "on_overdue", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -10},
                {"wf_name": "Approval Reminder", "entity_type": "APPROVAL", "entity_id": 1, "trigger_event": "on_approval_pending", "status": "success", "started_by": admin_user.id, "offset_hours": -1},
                {"wf_name": "Approval Reminder", "entity_type": "APPROVAL", "entity_id": 2, "trigger_event": "on_approval_pending", "status": "success", "started_by": admin_user.id, "offset_hours": -3},
                {"wf_name": "Approval Reminder", "entity_type": "APPROVAL", "entity_id": 3, "trigger_event": "on_approval_pending", "status": "failed", "started_by": admin_user.id, "offset_hours": -6, "error": "Email service timeout"},
                {"wf_name": "Approval Escalation Workflow", "entity_type": "APPROVAL", "entity_id": 1, "trigger_event": "on_approval_pending", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -8},
                {"wf_name": "Approval Escalation Workflow", "entity_type": "APPROVAL", "entity_id": 4, "trigger_event": "on_approval_pending", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -12},
                {"wf_name": "Meeting Reminder Workflow", "entity_type": "MEETING", "entity_id": meeting_ids[0] if meeting_ids else 1, "trigger_event": "on_meeting_upcoming", "status": "success", "started_by": admin_user.id, "offset_hours": -4},
                {"wf_name": "Meeting Reminder Workflow", "entity_type": "MEETING", "entity_id": meeting_ids[1] if len(meeting_ids) > 1 else 2, "trigger_event": "on_meeting_upcoming", "status": "success", "started_by": admin_user.id, "offset_hours": -7},
                {"wf_name": "Meeting Reminder Workflow", "entity_type": "MEETING", "entity_id": meeting_ids[2] if len(meeting_ids) > 2 else 3, "trigger_event": "on_meeting_upcoming", "status": "failed", "started_by": admin_user.id, "offset_hours": -11, "error": "No attendees found for reminder"},
                {"wf_name": "Project Delay Notification", "entity_type": "PROJECT", "entity_id": project.id, "trigger_event": "on_milestone_delayed", "status": "success", "started_by": admin_user.id, "offset_hours": -14},
                {"wf_name": "Project Delay Notification", "entity_type": "PROJECT", "entity_id": project.id, "trigger_event": "on_milestone_delayed", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -20},
                {"wf_name": "Document Approval Workflow", "entity_type": "DOCUMENT", "entity_id": 1, "trigger_event": "on_document_upload", "status": "success", "started_by": backend_lead.id if backend_lead else admin_user.id, "offset_hours": -16},
                {"wf_name": "Document Approval Workflow", "entity_type": "DOCUMENT", "entity_id": 2, "trigger_event": "on_document_upload", "status": "success", "started_by": frontend_lead.id if frontend_lead else admin_user.id, "offset_hours": -22},
                {"wf_name": "Document Approval Workflow", "entity_type": "DOCUMENT", "entity_id": 3, "trigger_event": "on_document_upload", "status": "failed", "started_by": admin_user.id, "offset_hours": -26, "error": "File type not supported for auto-review"},
                {"wf_name": "Task Status Change Workflow", "entity_type": "TASK", "entity_id": task_ids[0] if task_ids else 1, "trigger_event": "on_status_change", "status": "success", "started_by": backend_lead.id if backend_lead else admin_user.id, "offset_hours": -18},
                {"wf_name": "Task Status Change Workflow", "entity_type": "TASK", "entity_id": task_ids[1] if len(task_ids) > 1 else 2, "trigger_event": "on_status_change", "status": "success", "started_by": frontend_lead.id if frontend_lead else admin_user.id, "offset_hours": -24},
                {"wf_name": "Task Status Change Workflow", "entity_type": "TASK", "entity_id": task_ids[0] if task_ids else 1, "trigger_event": "on_status_change", "status": "pending", "started_by": admin_user.id, "offset_hours": -0.5},
                {"wf_name": "Task Status Change Workflow", "entity_type": "TASK", "entity_id": task_ids[2] if len(task_ids) > 2 else 3, "trigger_event": "on_status_change", "status": "success", "started_by": qa_lead.id if qa_lead else admin_user.id, "offset_hours": -28},
                {"wf_name": "Approval Escalation Workflow", "entity_type": "APPROVAL", "entity_id": 2, "trigger_event": "on_approval_pending", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -36},
                {"wf_name": "Meeting Reminder Workflow", "entity_type": "MEETING", "entity_id": meeting_ids[3] if len(meeting_ids) > 3 else 4, "trigger_event": "on_meeting_upcoming", "status": "success", "started_by": admin_user.id, "offset_hours": -15},
                {"wf_name": "Document Approval Workflow", "entity_type": "DOCUMENT", "entity_id": 4, "trigger_event": "on_document_upload", "status": "success", "started_by": qa_lead.id if qa_lead else admin_user.id, "offset_hours": -32},
                {"wf_name": "Project Delay Notification", "entity_type": "PROJECT", "entity_id": project.id, "trigger_event": "on_milestone_delayed", "status": "failed", "started_by": admin_user.id, "offset_hours": -40, "error": "Notification channel not configured"},
                {"wf_name": "Task Status Change Workflow", "entity_type": "TASK", "entity_id": task_ids[3] if len(task_ids) > 3 else 4, "trigger_event": "on_status_change", "status": "success", "started_by": admin_user.id, "offset_hours": -35},
                {"wf_name": "Approval Escalation Workflow", "entity_type": "APPROVAL", "entity_id": 3, "trigger_event": "on_approval_pending", "status": "failed", "started_by": admin_user.id, "offset_hours": -44, "error": "Escalation target not found"},
                {"wf_name": "Meeting Reminder Workflow", "entity_type": "MEETING", "entity_id": meeting_ids[0] if meeting_ids else 1, "trigger_event": "on_meeting_upcoming", "status": "success", "started_by": pm_user.id if pm_user else admin_user.id, "offset_hours": -48},
                {"wf_name": "Task Overdue Notification", "entity_type": "TASK", "entity_id": task_ids[0] if task_ids else 1, "trigger_event": "on_overdue", "status": "success", "started_by": admin_user.id, "offset_hours": -50},
                {"wf_name": "Approval Reminder", "entity_type": "APPROVAL", "entity_id": 1, "trigger_event": "on_approval_pending", "status": "success", "started_by": admin_user.id, "offset_hours": -52},
            ]

            for ed in executions_data:
                wf = workflows.get(ed["wf_name"])
                if not wf:
                    continue
                started = SEED_TIMESTAMP + timedelta(hours=ed["offset_hours"])
                completed = started + timedelta(minutes=2) if ed["status"] != "pending" else None
                result_log = []
                if ed["status"] == "success":
                    result_log = [{"step": "trigger", "result": "ok"}, {"step": "action", "result": "ok", "recipients_notified": 2}]
                elif ed["status"] == "failed":
                    result_log = [{"step": "trigger", "result": "ok"}, {"step": "action", "result": "error"}]

                exec_log = result_log.copy()
                if ed.get("error"):
                    exec_log.append({"error": ed["error"]})

                we_result = db.execute(
                    text("""
                        INSERT INTO workflow_executions (tenant_id, workflow_id, entity_type, entity_id, status, execution_log, started_by_id, created_by, started_at, completed_at, is_deleted)
                        VALUES (:tenant_id, :workflow_id, :entity_type, :entity_id, :status, :execution_log, :started_by_id, :created_by, :started_at, :completed_at, 0)
                    """),
                    {
                        "tenant_id": tenant.id,
                        "workflow_id": wf.id,
                        "entity_type": ed["entity_type"],
                        "entity_id": ed["entity_id"],
                        "status": ed["status"],
                        "execution_log": json.dumps(exec_log),
                        "started_by_id": ed["started_by"],
                        "created_by": ed["started_by"],
                        "started_at": started,
                        "completed_at": completed,
                    },
                )
                db.flush()
                we_id = we_result.lastrowid
                result["workflow_executions"].append({
                    "id": we_id, "workflow_id": wf.id, "entity_type": ed["entity_type"],
                    "entity_id": ed["entity_id"], "status": ed["status"], "started_at": str(started),
                })

            print(f"  Workflow Executions: {len(executions_data)} created")
        else:
            print(f"  Workflow Executions: already exist ({exec_count})")

        # ──────────────────────────────────────────────
        # 4. NOTIFICATION RULES
        # ──────────────────────────────────────────────
        existing_nr = set()
        for nr in db.scalars(select(NotificationRule).where(NotificationRule.tenant_id == tenant.id)).all():
            existing_nr.add(nr.name)

        notification_rules_data = [
            {
                "name": "Task Assigned Notification",
                "description": "Notify user when a new task is assigned to them",
                "event_type": "task_assignment",
                "channel": "in_app",
                "condition_config": {"event": "task.assigned"},
                "template_config": {"title": "New Task Assigned", "body": "You have been assigned to task: {task_title}", "icon": "clipboard"},
                "recipient_config": {"type": "assignee"},
            },
            {
                "name": "Task Completed Notification",
                "description": "Notify project manager and team lead when a task is marked as done",
                "event_type": "task_completed",
                "channel": "in_app",
                "condition_config": {"event": "task.status_changed", "new_status": "done"},
                "template_config": {"title": "Task Completed", "body": "{task_title} has been completed by {assignee_name}", "icon": "check-circle"},
                "recipient_config": {"type": "roles", "roles": ["manager", "admin"]},
            },
            {
                "name": "Approval Pending Alert",
                "description": "Send in-app and email notification when a new approval request is created",
                "event_type": "approval_request",
                "channel": "email",
                "condition_config": {"event": "approval.created", "priority_in": ["high", "critical"]},
                "template_config": {"title": "New Approval Required", "body": "{requester_name} submitted an approval request: {approval_title}", "icon": "alert-triangle"},
                "recipient_config": {"type": "roles", "roles": ["manager", "admin"]},
            },
            {
                "name": "Approval Approved Confirmation",
                "description": "Notify requester when their approval request is approved",
                "event_type": "approval_approved",
                "channel": "in_app",
                "condition_config": {"event": "approval.action", "action": "approved"},
                "template_config": {"title": "Approval Granted", "body": "Your request '{approval_title}' has been approved by {approver_name}", "icon": "check"},
                "recipient_config": {"type": "creator"},
            },
            {
                "name": "Approval Rejected Alert",
                "description": "Notify requester when their approval request is rejected, with rejection reason",
                "event_type": "approval_rejected",
                "channel": "email",
                "condition_config": {"event": "approval.action", "action": "rejected"},
                "template_config": {"title": "Approval Rejected", "body": "Your request '{approval_title}' was rejected. Reason: {rejection_reason}", "icon": "x-circle"},
                "recipient_config": {"type": "creator"},
            },
            {
                "name": "Meeting Reminder Notification",
                "description": "Send reminder 30 minutes before scheduled meetings",
                "event_type": "meeting_reminder",
                "channel": "in_app",
                "condition_config": {"event": "meeting.upcoming", "minutes_before": 30},
                "template_config": {"title": "Meeting Starting Soon", "body": "{meeting_title} starts in {minutes} minutes at {meeting_location}", "icon": "clock"},
                "recipient_config": {"type": "attendees"},
            },
            {
                "name": "Document Uploaded Notification",
                "description": "Notify team members when a new document is uploaded to the project",
                "event_type": "document_update",
                "channel": "in_app",
                "condition_config": {"event": "document.uploaded"},
                "template_config": {"title": "New Document Uploaded", "body": "{uploader_name} uploaded '{document_name}' to {project_name}", "icon": "file-text"},
                "recipient_config": {"type": "project_members"},
            },
            {
                "name": "Mention Notification",
                "description": "Notify user when they are mentioned in a task, comment, or message",
                "event_type": "mention_alert",
                "channel": "in_app",
                "condition_config": {"event": "mention.created"},
                "template_config": {"title": "You Were Mentioned", "body": "{sender_name} mentioned you: {mention_context}", "icon": "at-sign"},
                "recipient_config": {"type": "mentioned_users"},
            },
            {
                "name": "Escalation Alert Notification",
                "description": "Send urgent notification when a task or approval is escalated",
                "event_type": "escalation_alert",
                "channel": "email",
                "condition_config": {"event": "escalation.triggered", "severity_in": ["high", "critical"]},
                "template_config": {"title": "Escalation Alert", "body": "Item '{entity_name}' has been escalated. Priority: {severity}. Immediate action required.", "icon": "alert-circle"},
                "recipient_config": {"type": "roles", "roles": ["admin", "manager"]},
            },
            {
                "name": "SLA Breach Warning",
                "description": "Notify team when an SLA is about to be breached (within 2 hours)",
                "event_type": "escalation_alert",
                "channel": "in_app",
                "condition_config": {"event": "sla.warning", "hours_remaining": 2},
                "template_config": {"title": "SLA Warning", "body": "SLA for '{entity_name}' will breach in {hours_remaining} hours. Take action now.", "icon": "alert-triangle"},
                "recipient_config": {"type": "task_assignee_and_lead"},
            },
        ]

        for nr_data in notification_rules_data:
            if nr_data["name"] in existing_nr:
                continue
            nr = NotificationRule(
                tenant_id=tenant.id,
                name=nr_data["name"],
                description=nr_data["description"],
                event_type=nr_data["event_type"],
                channel=nr_data["channel"],
                condition_config=nr_data["condition_config"],
                template_config=nr_data["template_config"],
                recipient_config=nr_data["recipient_config"],
                is_active=True,
                is_deleted=False,
                created_by=admin_user.id,
                created_at=SEED_TIMESTAMP,
                updated_at=SEED_TIMESTAMP,
            )
            db.add(nr)
            db.flush()
            result["notification_rules"].append({
                "id": nr.id, "name": nr.name, "event_type": nr.event_type, "channel": nr.channel,
            })

        print(f"  Notification Rules: {len(result['notification_rules'])} created")

        # ──────────────────────────────────────────────
        # 5. SAVED SEARCHES
        # ──────────────────────────────────────────────
        existing_ss = set()
        for ss in db.scalars(select(SavedSearch).where(SavedSearch.tenant_id == tenant.id)).all():
            existing_ss.add(ss.name)

        search_user_map = {
            "My Tasks": "backend.dev@technova.com",
            "High Priority Tasks": "pm@technova.com",
            "Backend API Tasks": "backend.lead@technova.com",
            "Pending Approvals": "admin@technova.com",
            "Sprint Meetings": "pm@technova.com",
            "Documents Uploaded Today": "admin@technova.com",
            "Frontend Bugs": "frontend.lead@technova.com",
            "Critical Issues": "pm@technova.com",
        }

        for name, email in search_user_map.items():
            if name in existing_ss:
                continue
            user = users.get(email)
            if not user:
                continue
            queries = {
                "My Tasks": {"filters": {"assigned_to": "me"}, "sort": {"field": "due_date", "order": "asc"}},
                "High Priority Tasks": {"filters": {"priority_in": ["high", "critical"]}, "sort": {"field": "priority", "order": "desc"}},
                "Backend API Tasks": {"filters": {"team": "Backend Team", "title_contains": "API"}, "sort": {"field": "created_at", "order": "desc"}},
                "Pending Approvals": {"filters": {"approval_status": "pending"}, "sort": {"field": "created_at", "order": "asc"}},
                "Sprint Meetings": {"filters": {"entity_type": "meeting", "title_contains": "Sprint"}, "sort": {"field": "meeting_date", "order": "asc"}},
                "Documents Uploaded Today": {"filters": {"entity_type": "document", "uploaded_date": "today"}, "sort": {"field": "uploaded_at", "order": "desc"}},
                "Frontend Bugs": {"filters": {"team": "Frontend Team", "priority_in": ["high", "medium"], "title_contains": "bug"}, "sort": {"field": "created_at", "order": "desc"}},
                "Critical Issues": {"filters": {"priority_in": ["critical"], "status_not_in": ["done", "cancelled"]}, "sort": {"field": "due_date", "order": "asc"}},
            }
            ss = SavedSearch(
                tenant_id=tenant.id,
                user_id=user.id,
                name=name,
                query=queries.get(name, {}),
                created_at=SEED_TIMESTAMP,
            )
            db.add(ss)
            db.flush()
            result["saved_searches"].append({"id": ss.id, "name": ss.name, "user_id": ss.user_id})

        print(f"  Saved Searches: {len(result['saved_searches'])} created")

        # ──────────────────────────────────────────────
        # 6. KNOWLEDGE CATEGORIES
        # ──────────────────────────────────────────────
        existing_kc = set()
        for kc in db.scalars(select(KnowledgeCategory).where(KnowledgeCategory.tenant_id == tenant.id)).all():
            existing_kc.add(kc.name)

        categories_data = [
            {"name": "Development", "description": "Coding standards, frameworks, and development practices", "icon": "code", "sort_order": 1},
            {"name": "Architecture", "description": "System architecture patterns, design decisions, and technical debt", "icon": "layers", "sort_order": 2},
            {"name": "Deployment", "description": "CI/CD pipelines, infrastructure, and release management", "icon": "server", "sort_order": 3},
            {"name": "Testing", "description": "Testing strategies, automation, and quality assurance", "icon": "check-square", "sort_order": 4},
            {"name": "Security", "description": "Security policies, vulnerability management, and compliance", "icon": "shield", "sort_order": 5},
            {"name": "HR Policies", "description": "Company policies, leave management, and employee guidelines", "icon": "users", "sort_order": 6},
        ]

        categories = {}
        for cd in categories_data:
            if cd["name"] in existing_kc:
                categories[cd["name"]] = db.scalar(
                    select(KnowledgeCategory).where(
                        KnowledgeCategory.tenant_id == tenant.id, KnowledgeCategory.name == cd["name"]
                    )
                )
                continue
            kc = KnowledgeCategory(
                tenant_id=tenant.id,
                name=cd["name"],
                description=cd["description"],
                icon=cd["icon"],
                parent_id=None,
                sort_order=cd["sort_order"],
            )
            db.add(kc)
            db.flush()
            categories[cd["name"]] = kc
            result["knowledge_categories"].append({"id": kc.id, "name": kc.name, "icon": kc.icon})

        print(f"  Knowledge Categories: {len(result['knowledge_categories'])} created")

        # ──────────────────────────────────────────────
        # 7. KNOWLEDGE ARTICLES
        # ──────────────────────────────────────────────
        existing_ka = set()
        for ka in db.scalars(select(KnowledgeArticle).where(KnowledgeArticle.tenant_id == tenant.id)).all():
            existing_ka.add(ka.title)

        articles_data = [
            {"title": "API Coding Standards", "category": "Development", "author": "backend.lead@technova.com", "tags": "api,standards,rest,backend", "version": 2, "status": "published", "view_count": 145, "content": "# API Coding Standards\n\n## Naming Conventions\n- Use kebab-case for URL paths: `/api/v1/user-profiles`\n- Use snake_case for JSON fields in requests/responses\n- Use camelCase for JavaScript/TypeScript client code\n\n## HTTP Methods\n- GET: Read operations (idempotent)\n- POST: Create operations\n- PUT: Full replacement update\n- PATCH: Partial update\n- DELETE: Remove operations\n\n## Response Format\n```json\n{\n  \"success\": true,\n  \"data\": {},\n  \"message\": \"Operation completed\",\n  \"meta\": { \"page\": 1, \"total\": 100 }\n}\n```\n\n## Error Handling\n- 400: Bad Request (validation errors)\n- 401: Unauthorized (missing/invalid token)\n- 403: Forbidden (insufficient permissions)\n- 404: Not Found\n- 422: Unprocessable Entity (business logic errors)\n- 500: Internal Server Error"},
            {"title": "REST API Design Guidelines", "category": "Architecture", "author": "backend.lead@technova.com", "tags": "rest,api,design,architecture", "version": 1, "status": "published", "view_count": 98, "content": "# REST API Design Guidelines\n\n## Resource Naming\n- Nouns, not verbs: `/tasks`, not `/getTasks`\n- Plural: `/users`, not `/user`\n- Nested for relationships: `/projects/{id}/tasks`\n\n## Versioning\n- URL-based: `/api/v1/`, `/api/v2/`\n- Minimum 6 months support for deprecated versions\n\n## Pagination\n- Use cursor-based for large datasets\n- Page/limit for admin dashboards\n- Default page size: 20, max: 100\n\n## Filtering & Sorting\n- Query params: `?status=active&sort=-created_at`\n- Prefix `-` for descending sort\n\n## Rate Limiting\n- 100 requests/minute per user\n- 429 Too Many Requests with Retry-After header"},
            {"title": "JWT Authentication Guide", "category": "Security", "author": "admin@technova.com", "tags": "jwt,auth,security,tokens", "version": 3, "status": "published", "view_count": 210, "content": "# JWT Authentication Guide\n\n## Token Structure\n- Access Token: 30 min TTL, contains user_id, role, tenant_id\n- Refresh Token: 7 day TTL, stored hashed in database\n\n## Authentication Flow\n1. User sends credentials to `/auth/login`\n2. Server validates and returns access + refresh tokens\n3. Client stores tokens in sessionStorage\n4. Client attaches `Authorization: Bearer <access_token>` header\n5. On 401, client calls `/auth/refresh` with refresh token\n6. New access token issued; failed requests retried\n\n## Security Best Practices\n- Never store tokens in localStorage\n- Use HTTPS only in production\n- Implement token rotation on refresh\n- Auto-logout 30 seconds before token expiry\n- CSRF protection on state-changing endpoints"},
            {"title": "Deployment Checklist", "category": "Deployment", "author": "devops@technova.com", "tags": "deployment,checklist,release,ci-cd", "version": 2, "status": "published", "view_count": 67, "content": "# Deployment Checklist\n\n## Pre-Deployment\n- [ ] All tests passing in CI\n- [ ] Code review approved (minimum 2 reviewers)\n- [ ] No merge conflicts with main branch\n- [ ] Database migrations tested locally\n- [ ] Environment variables configured\n- [ ] Secrets rotated if needed\n\n## Deployment Steps\n1. Create release branch from main\n2. Run full test suite\n3. Build frontend assets (npm run build)\n4. Run Alembic migrations against staging\n5. Deploy backend to staging\n6. Smoke test critical paths\n7. Deploy frontend to CDN\n8. Run integration tests against staging\n9. Get QA sign-off\n10. Deploy to production (blue-green)\n\n## Post-Deployment\n- [ ] Monitor error rates for 30 minutes\n- [ ] Verify health checks\n- [ ] Check key metrics (response time, error rate)\n- [ ] Notify team of successful deployment"},
            {"title": "Git Branching Strategy", "category": "Development", "author": "backend.lead@technova.com", "tags": "git,branching,workflow,development", "version": 1, "status": "published", "view_count": 178, "content": "# Git Branching Strategy\n\n## Branch Types\n- `main`: Production-ready code\n- `develop`: Integration branch for next release\n- `feature/*`: New features (branch from develop)\n- `bugfix/*`: Bug fixes (branch from develop)\n- `hotfix/*`: Critical production fixes (branch from main)\n- `release/*`: Release preparation (branch from develop)\n\n## Naming Convention\n- `feature/EF-123-add-login-api`\n- `bugfix/EF-456-fix-date-formatting`\n- `hotfix/EF-789-security-patch`\n\n## Merge Rules\n- Feature → develop: Squash merge\n- Develop → main: Merge commit (no squash)\n- Hotfix → main + develop: Merge commit\n\n## Commit Messages\n- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`\n- Reference issue: `feat: add login API (EF-123)`"},
            {"title": "Docker Setup Guide", "category": "Deployment", "author": "devops@technova.com", "tags": "docker,containers,setup,deployment", "version": 1, "status": "published", "view_count": 89, "content": "# Docker Setup Guide\n\n## Development\n```bash\ndocker-compose up -d\n# Backend: http://localhost:8000\n# Frontend: http://localhost:5173\n# MySQL: localhost:3306\n# Redis: localhost:6379\n```\n\n## Dockerfile Best Practices\n- Use multi-stage builds\n- Minimize layers\n- Use .dockerignore\n- Don't run as root\n- Use specific base image tags (not latest)\n\n## Health Checks\n- Backend: GET /health\n- Database: mysqladmin ping\n- Redis: redis-cli ping\n\n## Production Considerations\n- Use Docker Swarm or Kubernetes\n- Set resource limits (CPU, memory)\n- Use secrets management\n- Configure logging drivers"},
            {"title": "Coding Best Practices", "category": "Development", "author": "frontend.lead@technova.com", "tags": "best-practices,coding,standards,quality", "version": 2, "status": "published", "view_count": 134, "content": "# Coding Best Practices\n\n## General\n- Write self-documenting code\n- Keep functions small (max 50 lines)\n- Single Responsibility Principle\n- DRY (Don't Repeat Yourself)\n- YAGNI (You Ain't Gonna Need It)\n\n## Python/FastAPI\n- Type hints everywhere\n- Async where possible\n- Use dependency injection\n- Handle exceptions explicitly\n- Write docstrings for public functions\n\n## React/Frontend\n- Functional components only\n- Custom hooks for reusable logic\n- Memoize expensive computations\n- Lazy-load routes and heavy components\n- Keep components under 200 lines\n\n## Testing\n- Test behavior, not implementation\n- Aim for 80% coverage on business logic\n- Use descriptive test names\n- Arrange-Act-Assert pattern\n- Mock external dependencies only"},
            {"title": "Testing Checklist", "category": "Testing", "author": "qa.lead@technova.com", "tags": "testing,checklist,qa,quality", "version": 1, "status": "published", "view_count": 112, "content": "# Testing Checklist\n\n## Unit Tests\n- [ ] All service layer methods tested\n- [ ] Repository queries tested with fixtures\n- [ ] Utility functions tested\n- [ ] Edge cases covered (empty, null, boundary)\n- [ ] Error handling paths tested\n\n## Integration Tests\n- [ ] API endpoints tested end-to-end\n- [ ] Authentication flow tested\n- [ ] RBAC permissions verified\n- [ ] Tenant isolation confirmed\n- [ ] Database transactions tested\n\n## Frontend Tests\n- [ ] Component rendering tested\n- [ ] Form validation tested\n- [ ] API integration mocked and tested\n- [ ] Error states handled\n- [ ] Loading states displayed\n\n## Performance\n- [ ] API response time < 200ms (p95)\n- [ ] Frontend bundle < 500KB\n- [ ] Database queries < 50ms (p95)\n- [ ] No N+1 queries\n- [ ] Proper pagination implemented"},
            {"title": "Code Review Process", "category": "Development", "author": "pm@technova.com", "tags": "code-review,process,quality,team", "version": 1, "status": "published", "view_count": 156, "content": "# Code Review Process\n\n## Guidelines\n- Review within 24 hours of request\n- Maximum 400 lines per review\n- Focus on logic, security, and maintainability\n- Be constructive and respectful\n\n## Checklist\n- [ ] Code follows project conventions\n- [ ] No hardcoded secrets or credentials\n- [ ] Error handling is comprehensive\n- [ ] Tests included for new functionality\n- [ ] Documentation updated if needed\n- [ ] No unnecessary dependencies added\n- [ ] Performance considerations addressed\n\n## Review Comments\n- Use conventional comment prefixes:\n  - `nit:` - Minor style issue\n  - `suggestion:` - Improvement idea\n  - `question:` - Need clarification\n  - `blocker:` - Must fix before merge\n  - `praise:` - Good work!\n\n## Approval Rules\n- Minimum 2 approvals required\n- All blockers resolved\n- CI pipeline passing\n- No unresolved conversations"},
            {"title": "Release Notes Template", "category": "Deployment", "author": "pm@technova.com", "tags": "release-notes,changelog,template", "version": 1, "status": "published", "view_count": 45, "content": "# Release Notes Template\n\n## [Version] - YYYY-MM-DD\n\n### Features\n- **Feature Name**: Description of the new feature (#issue-number)\n\n### Improvements\n- **Improvement**: Description of the improvement (#issue-number)\n\n### Bug Fixes\n- **Bug**: Description of the fix (#issue-number)\n\n### Breaking Changes\n- **Change**: Description and migration steps (#issue-number)\n\n### Deprecated\n- **Feature**: Deprecation notice and timeline (#issue-number)\n\n### Security\n- **Vulnerability**: Description of security fix (CVE-XXXX)\n\n### Contributors\nThanks to all contributors: @user1, @user2, @user3"},
            {"title": "Onboarding Guide for New Developers", "category": "Development", "author": "admin@technova.com", "tags": "onboarding,new-hire,getting-started", "version": 2, "status": "published", "view_count": 234, "content": "# Onboarding Guide for New Developers\n\n## Day 1\n1. Receive laptop and credentials\n2. Set up development environment:\n   - Python 3.13+\n   - Node.js 22+\n   - MySQL 8+\n   - Docker\n3. Clone the repository\n4. Run `docker-compose up -d`\n5. Verify backend at http://localhost:8000/docs\n6. Verify frontend at http://localhost:5173\n\n## Day 2-3\n1. Review API documentation (Swagger UI)\n2. Walk through codebase architecture\n3. Complete first task (labeled 'good-first-issue')\n4. Submit first PR and go through code review\n\n## Week 1\n1. Attend daily standups\n2. Pair programming session with team lead\n3. Review coding standards document\n4. Set up IDE with project linting rules\n5. Complete security awareness training\n\n## Week 2\n1. Own a small feature end-to-end\n2. Participate in code review\n3. Attend sprint planning"},
            {"title": "Leave Policy", "category": "HR Policies", "author": "admin@technova.com", "tags": "hr,leave,policy,vacation", "version": 1, "status": "published", "view_count": 312, "content": "# Leave Policy\n\n## Annual Leave\n- Employees: 20 days/year\n- Managers: 25 days/year\n- Accrual: 1.67 days/month\n\n## Sick Leave\n- 12 days/year\n- Medical certificate required for 3+ consecutive days\n- No carryover to next year\n\n## Personal Leave\n- 5 days/year\n- Must be requested 7 days in advance\n- Manager approval required\n\n## Public Holidays\n- As per government calendar\n- Optional: religious holidays with manager approval\n\n## Requesting Leave\n1. Submit request via Leave Request form\n2. Attach supporting documents if applicable\n3. Manager reviews within 2 business days\n4. HR processes payroll adjustments\n\n## Carryover\n- Maximum 5 annual leave days can be carried over\n- Must be used within first quarter of next year"},
            {"title": "Security Incident Response", "category": "Security", "author": "devops@technova.com", "tags": "security,incident,response,playbook", "version": 1, "status": "published", "view_count": 56, "content": "# Security Incident Response\n\n## Severity Levels\n- **P0 (Critical)**: Data breach, system compromise\n- **P1 (High)**: Active exploitation, vulnerability\n- **P2 (Medium)**: Suspicious activity, policy violation\n- **P3 (Low)**: Failed attack attempts, scanning\n\n## Response Steps\n1. **Detection**: Identify the incident\n2. **Triage**: Assess severity and impact\n3. **Containment**: Isolate affected systems\n4. **Eradication**: Remove threat\n5. **Recovery**: Restore systems\n6. **Post-mortem**: Document lessons learned\n\n## Communication\n- P0: Immediate notification to CTO, legal, affected users\n- P1: Within 1 hour to security team and management\n- P2: Within 24 hours in daily standup\n- P3: Weekly security report\n\n## Contacts\n- Security Lead: security@technova.com\n- CTO: cto@technova.com\n- External: security-audit@partner.com"},
            {"title": "Database Design Principles", "category": "Architecture", "author": "backend.lead@technova.com", "tags": "database,design,sql,architecture", "version": 1, "status": "published", "view_count": 87, "content": "# Database Design Principles\n\n## Normalization\n- Target 3NF for most tables\n- Denormalize selectively for read performance\n- Document denormalization decisions\n\n## Naming Conventions\n- Tables: plural, snake_case (`users`, `task_documents`)\n- Columns: singular, snake_case (`created_at`, `is_active`)\n- Indexes: `ix_{table}_{column}` or `ix_{table}_{col1}_{col2}`\n- Foreign keys: `fk_{table}_{referenced_table}`\n\n## Indexing Strategy\n- Index foreign keys\n- Index frequently queried columns\n- Composite indexes for multi-column queries\n- Avoid over-indexing (write performance)\n\n## Multi-Tenancy\n- Every tenant-scoped table has `tenant_id`\n- Use TenantMixin for automatic column addition\n- Always filter by tenant_id in queries\n- CASCADE delete for tenant isolation"},
            {"title": "Frontend Architecture Overview", "category": "Architecture", "author": "frontend.lead@technova.com", "tags": "frontend,architecture,react,overview", "version": 1, "status": "published", "view_count": 102, "content": "# Frontend Architecture Overview\n\n## Tech Stack\n- React 19 + Vite 8\n- TanStack React Query 5 (server state)\n- React Router 7 (routing)\n- Tailwind CSS 3.4 (styling)\n- Recharts (charts)\n\n## State Management\n- **Server State**: React Query (staleTime: 2min, gcTime: 10min)\n- **Auth State**: Context API (AuthContext)\n- **UI State**: useReducer (StoreProvider)\n- **Notifications**: Context API (NotificationContext)\n\n## Component Architecture\n```\nsrc/\n  api/          -- Raw Axios calls (37 modules)\n  services/     -- React Query hooks (29 modules)\n  hooks/        -- Custom hooks (24 hooks)\n  components/   -- Shared UI (80+ components)\n  pages/        -- Route pages (48 pages)\n  context/      -- Global state (3 providers)\n  config/       -- Roles, permissions, UI constants\n```\n\n## Key Patterns\n- Lazy loading for all routes\n- Generic useApiQuery/useApiMutation hooks\n- Centralized error handling\n- Role-based component rendering"},
            {"title": "CI/CD Pipeline Configuration", "category": "Deployment", "author": "devops@technova.com", "tags": "ci-cd,pipeline,automation,github-actions", "version": 1, "status": "draft", "view_count": 23, "content": "# CI/CD Pipeline Configuration\n\n## Pipeline Stages\n1. **Lint**: Code style checks (ruff, eslint)\n2. **Test**: Unit + integration tests\n3. **Build**: Frontend build, backend packaging\n4. **Deploy**: Staging → Production\n\n## Triggers\n- `develop` branch: Lint + Test\n- `main` branch: Full pipeline\n- PR to `develop`: Lint + Test + Preview\n- Manual: Production deployment\n\n## Quality Gates\n- Test coverage > 80%\n- No critical vulnerabilities\n- All linter rules passing\n- Build size < 500KB\n\n## Environments\n- **Development**: Auto-deploy on push to develop\n- **Staging**: Auto-deploy on push to main\n- **Production**: Manual approval required"},
            {"title": "API Rate Limiting Strategy", "category": "Security", "author": "backend.lead@technova.com", "tags": "rate-limiting,security,api,performance", "version": 1, "status": "published", "view_count": 67, "content": "# API Rate Limiting Strategy\n\n## Default Limits\n- Global: 200 requests/60s per IP\n- Auth endpoints: 5 requests/60s\n- Comments: 30 requests/60s\n- AI endpoints: 10 requests/60s\n\n## Implementation\n- Sliding window algorithm\n- Redis-backed (with in-memory fallback)\n- Per-endpoint granularity\n\n## Response Headers\n- `X-RateLimit-Limit`: Maximum requests\n- `X-RateLimit-Remaining`: Remaining requests\n- `X-RateLimit-Reset`: Reset timestamp\n\n## Handling 429\n- Client should respect `Retry-After` header\n- Implement exponential backoff\n- Cache responses where possible\n\n## Exemptions\n- Health check endpoints\n- Internal service-to-service calls\n- Webhook endpoints (with signature verification)"},
            {"title": "WebSocket Integration Guide", "category": "Development", "author": "backend.lead@technova.com", "tags": "websocket,real-time,integration,guide", "version": 1, "status": "published", "view_count": 78, "content": "# WebSocket Integration Guide\n\n## Connection\n```\nws://localhost:8000/ws?token=<jwt_access_token>\n```\n\n## Protocol\n- JSON messages\n- Heartbeat: `__ping__` / `__pong__` every 30s\n- Auto-reconnect with exponential backoff\n\n## Event Types\n- `task.updated`: Task state changed\n- `kanban.moved`: Task moved on board\n- `notification.new`: New notification\n- `approval.updated`: Approval status changed\n- `user.online`: User came online\n- `user.offline`: User went offline\n\n## Client Usage\n```javascript\nimport { useWebSocket } from 'hooks';\n\nconst { subscribe, sendMessage } = useWebSocket();\nsubscribe('task.updated', (data) => {\n  // Handle task update\n});\n```\n\n## Server Publishing\n```python\nfrom app.websocket.pubsub import publish_event\nawait publish_event(tenant_id, 'task.updated', task_data)\n```\n\n## Scaling\n- Redis Pub/Sub for multi-process\n- Channel per tenant for isolation\n- Connection pooling in manager"},
            {"title": "Performance Optimization Guide", "category": "Architecture", "author": "pm@technova.com", "tags": "performance,optimization,monitoring", "version": 1, "status": "draft", "view_count": 34, "content": "# Performance Optimization Guide\n\n## Backend\n- Use async endpoints where possible\n- Implement proper pagination (max 100 items)\n- Cache frequently accessed data (Redis)\n- Use connection pooling (pool_size=10)\n- Profile slow queries with SQLAlchemy\n\n## Frontend\n- Lazy-load all routes (React.lazy)\n- Code-split vendor bundles\n- Memoize expensive computations\n- Virtual lists for large datasets\n- Optimize images (WebP, lazy loading)\n\n## Database\n- Add indexes for frequent queries\n- Avoid N+1 queries (use joinedload)\n- Use bulk operations for inserts\n- Regular VACUUM/ANALYZE\n- Monitor slow query log\n\n## Monitoring\n- API response time (p50, p95, p99)\n- Error rate per endpoint\n- Database connection pool usage\n- Memory and CPU utilization\n- Frontend Core Web Vitals"},
            {"title": "Compliance and Data Privacy", "category": "Security", "author": "admin@technova.com", "tags": "compliance,privacy,gdpr,data-protection", "version": 1, "status": "published", "view_count": 45, "content": "# Compliance and Data Privacy\n\n## Data Classification\n- **Public**: Marketing content, public docs\n- **Internal**: Process docs, team structures\n- **Confidential**: User PII, financial data\n- **Restricted**: Auth tokens, encryption keys\n\n## GDPR Compliance\n- Data minimization: collect only what's needed\n- Right to access: export user data on request\n- Right to erasure: delete user data within 30 days\n- Consent tracking: log all user consents\n\n## Data Retention\n- Audit logs: 7 years\n- User data: Account lifetime + 1 year\n- Session data: 30 days\n- Cache: 24 hours\n\n## Encryption\n- At rest: AES-256 for sensitive columns\n- In transit: TLS 1.3\n- Passwords: bcrypt with cost factor 12\n\n## Access Control\n- Principle of least privilege\n- Regular access reviews (quarterly)\n- Separate admin and user accounts\n- MFA for admin access"},
        ]

        for ad in articles_data:
            if ad["title"] in existing_ka:
                continue
            cat = categories.get(ad["category"])
            author = users.get(ad["author"])
            if not author:
                continue
            ka = KnowledgeArticle(
                tenant_id=tenant.id,
                title=ad["title"],
                content=ad["content"],
                category_id=cat.id if cat else None,
                tags=ad["tags"],
                status=ad["status"],
                view_count=ad["view_count"],
                author_id=author.id,
                created_at=SEED_TIMESTAMP - timedelta(days=30),
                updated_at=SEED_TIMESTAMP - timedelta(days=5),
            )
            db.add(ka)
            db.flush()
            result["knowledge_articles"].append({
                "id": ka.id, "title": ka.title, "category_id": ka.category_id,
                "status": ka.status, "view_count": ka.view_count,
            })

        print(f"  Knowledge Articles: {len(result['knowledge_articles'])} created")

        # ──────────────────────────────────────────────
        # 8. CUSTOM FORMS
        # ──────────────────────────────────────────────
        existing_cf = set()
        for cf in db.scalars(select(CustomForm).where(CustomForm.tenant_id == tenant.id)).all():
            existing_cf.add(cf.title)

        forms_data = [
            {
                "title": "Leave Request",
                "description": "Submit a request for planned or unplanned leave",
                "status": "active",
                "fields": [
                    {"label": "Employee Name", "field_type": "TEXT", "required": True, "placeholder": "Enter your full name", "sort_order": 1, "validation_rules": {"min_length": 2, "max_length": 100}},
                    {"label": "Department", "field_type": "SELECT", "required": True, "options": ["Engineering", "Product", "Design", "Marketing", "HR", "Finance"], "sort_order": 2},
                    {"label": "Leave Type", "field_type": "SELECT", "required": True, "options": ["Annual Leave", "Sick Leave", "Personal Leave", "Unpaid Leave", "Maternity/Paternity"], "sort_order": 3},
                    {"label": "Start Date", "field_type": "DATE", "required": True, "sort_order": 4},
                    {"label": "End Date", "field_type": "DATE", "required": True, "sort_order": 5},
                    {"label": "Reason", "field_type": "TEXT", "required": True, "placeholder": "Briefly describe the reason for leave", "sort_order": 6, "validation_rules": {"min_length": 10, "max_length": 500}},
                    {"label": "Manager Approval", "field_type": "SELECT", "required": True, "options": ["Pending", "Approved", "Rejected"], "sort_order": 7},
                ],
            },
            {
                "title": "Purchase Request",
                "description": "Request procurement of software, hardware, or services",
                "status": "active",
                "fields": [
                    {"label": "Requester Name", "field_type": "TEXT", "required": True, "placeholder": "Your full name", "sort_order": 1},
                    {"label": "Department", "field_type": "SELECT", "required": True, "options": ["Engineering", "Product", "Design", "Marketing", "HR", "Finance", "Operations"], "sort_order": 2},
                    {"label": "Item Category", "field_type": "SELECT", "required": True, "options": ["Software License", "Hardware", "Cloud Service", "Office Supplies", "Training", "Other"], "sort_order": 3},
                    {"label": "Item Description", "field_type": "TEXT", "required": True, "placeholder": "Detailed description of the item/service", "sort_order": 4, "validation_rules": {"min_length": 20, "max_length": 1000}},
                    {"label": "Estimated Budget (USD)", "field_type": "NUMBER", "required": True, "placeholder": "0.00", "sort_order": 5, "validation_rules": {"min": 0, "max": 100000}},
                    {"label": "Justification", "field_type": "TEXT", "required": True, "placeholder": "Business justification for this purchase", "sort_order": 6, "validation_rules": {"min_length": 30, "max_length": 1000}},
                    {"label": "Urgency", "field_type": "SELECT", "required": True, "options": ["Low (within 30 days)", "Medium (within 2 weeks)", "High (within 1 week)", "Critical (ASAP)"], "sort_order": 7},
                    {"label": "Attachment", "field_type": "FILE", "required": False, "placeholder": "Upload quotation or specification document", "sort_order": 8},
                ],
            },
            {
                "title": "Access Request",
                "description": "Request access to systems, tools, or restricted resources",
                "status": "active",
                "fields": [
                    {"label": "Employee Name", "field_type": "TEXT", "required": True, "placeholder": "Your full name", "sort_order": 1},
                    {"label": "Employee ID", "field_type": "TEXT", "required": True, "placeholder": "EMP-XXXX", "sort_order": 2, "validation_rules": {"pattern": "EMP-\\d{4}"}},
                    {"label": "Department", "field_type": "SELECT", "required": True, "options": ["Engineering", "Product", "Design", "Marketing", "HR", "Finance", "Operations", "Security"], "sort_order": 3},
                    {"label": "System/Tool", "field_type": "SELECT", "required": True, "options": ["AWS Console", "GitHub Organization", "Jira", "Slack Admin", "Database (Production)", "Database (Staging)", "CI/CD Pipeline", "Kubernetes Dashboard", "Monitoring Dashboard", "Other"], "sort_order": 4},
                    {"label": "Access Level", "field_type": "SELECT", "required": True, "options": ["Read-Only", "Read-Write", "Admin", "Super Admin"], "sort_order": 5},
                    {"label": "Business Justification", "field_type": "TEXT", "required": True, "placeholder": "Explain why you need this access", "sort_order": 6, "validation_rules": {"min_length": 30, "max_length": 1000}},
                    {"label": "Duration", "field_type": "SELECT", "required": True, "options": ["Permanent", "30 days", "90 days", "1 year", "Until project completion"], "sort_order": 7},
                    {"label": "Manager Approval", "field_type": "SELECT", "required": True, "options": ["Pending", "Approved", "Rejected"], "sort_order": 8},
                ],
            },
            {
                "title": "Software License Request",
                "description": "Request new software licenses or license renewals",
                "status": "active",
                "fields": [
                    {"label": "Requester Name", "field_type": "TEXT", "required": True, "placeholder": "Your full name", "sort_order": 1},
                    {"label": "Software Name", "field_type": "TEXT", "required": True, "placeholder": "e.g., JetBrains IntelliJ IDEA", "sort_order": 2, "validation_rules": {"min_length": 2, "max_length": 200}},
                    {"label": "License Type", "field_type": "SELECT", "required": True, "options": ["Individual", "Team (2-10)", "Enterprise (10+)", "Academic", "Trial"], "sort_order": 3},
                    {"label": "License Duration", "field_type": "SELECT", "required": True, "options": ["Monthly", "Annual", "3 Years", "Perpetual"], "sort_order": 4},
                    {"label": "Number of Licenses", "field_type": "NUMBER", "required": True, "placeholder": "1", "sort_order": 5, "validation_rules": {"min": 1, "max": 500}},
                    {"label": "Annual Cost Per License (USD)", "field_type": "NUMBER", "required": True, "placeholder": "0.00", "sort_order": 6, "validation_rules": {"min": 0, "max": 50000}},
                    {"label": "Purpose", "field_type": "TEXT", "required": True, "placeholder": "How will this software be used?", "sort_order": 7, "validation_rules": {"min_length": 20, "max_length": 500}},
                    {"label": "Alternative Considered", "field_type": "TEXT", "required": False, "placeholder": "Other solutions evaluated", "sort_order": 8},
                ],
            },
            {
                "title": "Hardware Request",
                "description": "Request new hardware equipment (laptops, monitors, peripherals)",
                "status": "active",
                "fields": [
                    {"label": "Employee Name", "field_type": "TEXT", "required": True, "placeholder": "Your full name", "sort_order": 1},
                    {"label": "Department", "field_type": "SELECT", "required": True, "options": ["Engineering", "Product", "Design", "Marketing", "HR", "Finance", "Operations"], "sort_order": 2},
                    {"label": "Hardware Type", "field_type": "SELECT", "required": True, "options": ["Laptop", "Desktop", "Monitor", "Keyboard", "Mouse", "Headset", "Webcam", "Docking Station", "RAM Upgrade", "SSD Upgrade", "Other"], "sort_order": 3},
                    {"label": "Specifications", "field_type": "TEXT", "required": True, "placeholder": "Detailed specs: CPU, RAM, storage, screen size, etc.", "sort_order": 4, "validation_rules": {"min_length": 20, "max_length": 1000}},
                    {"label": "Estimated Cost (USD)", "field_type": "NUMBER", "required": True, "placeholder": "0.00", "sort_order": 5, "validation_rules": {"min": 0, "max": 10000}},
                    {"label": "Justification", "field_type": "TEXT", "required": True, "placeholder": "Why is this hardware needed?", "sort_order": 6, "validation_rules": {"min_length": 20, "max_length": 500}},
                    {"label": "Urgency", "field_type": "SELECT", "required": True, "options": ["Normal (within 30 days)", "Urgent (within 2 weeks)", "Critical (within 1 week)"], "sort_order": 7},
                    {"label": "Current Equipment Condition", "field_type": "SELECT", "required": True, "options": ["Working fine", "Occasional issues", "Frequently crashing", "Broken/Non-functional", "N/A (new employee)"], "sort_order": 8},
                ],
            },
            {
                "title": "Travel Request",
                "description": "Request approval for business travel and related expenses",
                "status": "active",
                "fields": [
                    {"label": "Employee Name", "field_type": "TEXT", "required": True, "placeholder": "Your full name", "sort_order": 1},
                    {"label": "Department", "field_type": "SELECT", "required": True, "options": ["Engineering", "Product", "Design", "Marketing", "HR", "Finance", "Sales", "Operations"], "sort_order": 2},
                    {"label": "Destination", "field_type": "TEXT", "required": True, "placeholder": "City, Country", "sort_order": 3, "validation_rules": {"min_length": 3, "max_length": 200}},
                    {"label": "Travel Purpose", "field_type": "SELECT", "required": True, "options": ["Client Meeting", "Conference", "Training", "Team Offsite", "Interview", "Vendor Meeting", "Other"], "sort_order": 4},
                    {"label": "Start Date", "field_type": "DATE", "required": True, "sort_order": 5},
                    {"label": "End Date", "field_type": "DATE", "required": True, "sort_order": 6},
                    {"label": "Estimated Total Cost (USD)", "field_type": "NUMBER", "required": True, "placeholder": "0.00", "sort_order": 7, "validation_rules": {"min": 0, "max": 50000}},
                    {"label": "Cost Breakdown", "field_type": "TEXT", "required": True, "placeholder": "Flights: $X, Hotel: $X/night, Meals: $X/day, Transport: $X", "sort_order": 8, "validation_rules": {"min_length": 30, "max_length": 1000}},
                    {"label": "Manager Approval", "field_type": "SELECT", "required": True, "options": ["Pending", "Approved", "Rejected"], "sort_order": 9},
                ],
            },
        ]

        for fd in forms_data:
            if fd["title"] in existing_cf:
                continue
            cf = CustomForm(
                tenant_id=tenant.id,
                title=fd["title"],
                description=fd["description"],
                status=fd["status"],
                fields_config=[],
                created_by=admin_user.id,
                created_at=SEED_TIMESTAMP - timedelta(days=20),
                updated_at=SEED_TIMESTAMP - timedelta(days=3),
            )
            db.add(cf)
            db.flush()

            for field_data in fd["fields"]:
                cff = CustomFormField(
                    form_id=cf.id,
                    field_type=field_data["field_type"],
                    label=field_data["label"],
                    required=field_data["required"],
                    placeholder=field_data.get("placeholder"),
                    options=field_data.get("options"),
                    validation_rules=field_data.get("validation_rules"),
                    sort_order=field_data["sort_order"],
                    created_at=SEED_TIMESTAMP - timedelta(days=20),
                )
                db.add(cff)
                db.flush()
                result["custom_form_fields"].append({
                    "id": cff.id, "form_id": cff.form_id, "label": cff.label,
                    "field_type": cff.field_type, "required": cff.required,
                })

            result["custom_forms"].append({
                "id": cf.id, "title": cf.title, "status": cf.status,
                "field_count": len(fd["fields"]),
            })

        print(f"  Custom Forms: {len(result['custom_forms'])} created")
        print(f"  Custom Form Fields: {len(result['custom_form_fields'])} created")

        # ──────────────────────────────────────────────
        # COMMIT
        # ──────────────────────────────────────────────
        db.commit()
        print("\n=== SEED COMPLETE ===")
        print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
