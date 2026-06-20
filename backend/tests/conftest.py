import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.user import User, UserRole
from app.models.task import Task
from app.models.approval import Approval
from app.models.approval_history import ApprovalHistory
from app.models.comment import Comment
from app.models.sla_tracking import SLATracking
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.tenant import Tenant
from app.models.organization import Organization
from app.models.document import Document
from app.models.task_document import TaskDocument
from app.core.security import hash_password
from datetime import datetime


TEST_DATABASE_URL = "mysql+pymysql://root:12345@localhost:3306/test_mini_ec_db"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        Base.metadata.drop_all(bind=conn)
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_user(db):
    user = User(
        name="Admin User",
        email="admin@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def manager_user(db):
    user = User(
        name="Manager User",
        email="manager@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.manager,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def employee_user(db):
    user = User(
        name="Employee User",
        email="employee@test.com",
        hashed_password=hash_password("password123"),
        role=UserRole.employee,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def sample_task(db, admin_user, employee_user):
    task = Task(
        title="Test Task",
        description="Test Description",
        status="todo",
        priority="medium",
        due_date=datetime(2030, 12, 31),
        created_by_id=admin_user.id,
        assigned_to_id=employee_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@pytest.fixture
def sample_approval(db, employee_user):
    approval = Approval(
        title="Test Approval",
        description="Test Approval Description",
        requested_by=employee_user.id,
        status="pending",
        current_level="manager",
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval
