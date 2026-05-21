import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.organization import Organization, SubscriptionPlan
from app.models.organization_settings import OrganizationSettings
from app.models.invitation import OrganizationInvitation, InvitationStatus
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationSettingsUpdate

def get_organization(db: Session, org_id: int) -> Organization | None:
    return db.query(Organization).filter(Organization.id == org_id).first()

def get_organization_by_slug(db: Session, slug: str) -> Organization | None:
    return db.query(Organization).filter(Organization.slug == slug).first()

def create_organization(db: Session, data: OrganizationCreate) -> Organization:
    existing = db.query(Organization).filter(Organization.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization slug already exists")
    org = Organization(name=data.name, slug=data.slug, logo=data.logo)
    db.add(org)
    db.flush()
    settings = OrganizationSettings(organization_id=org.id)
    db.add(settings)
    db.commit()
    db.refresh(org)
    return org

def update_organization(db: Session, org_id: int, data: dict) -> Organization:
    org = get_organization(db, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    for key, value in data.items():
        if value is not None and hasattr(org, key):
            setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org

def get_org_settings(db: Session, org_id: int) -> OrganizationSettings | None:
    return db.query(OrganizationSettings).filter(OrganizationSettings.organization_id == org_id).first()

def update_org_settings(db: Session, org_id: int, data: OrganizationSettingsUpdate) -> OrganizationSettings:
    settings = get_org_settings(db, org_id)
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization settings not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings

def create_invitation(db: Session, org_id: int, email: str, role: str, invited_by: int) -> OrganizationInvitation:
    org = get_organization(db, org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    existing = db.query(User).filter(User.email == email).first()
    if existing and existing.tenant_id == org_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in this organization")
    token = secrets.token_urlsafe(32)
    invitation = OrganizationInvitation(
        organization_id=org_id,
        email=email,
        role=role,
        token=token,
        invited_by=invited_by,
        expires_at=datetime.utcnow() + timedelta(days=7),
        status=InvitationStatus.pending,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation

def list_organizations(db: Session, skip: int = 0, limit: int = 100) -> list[Organization]:
    return db.query(Organization).offset(skip).limit(limit).all()
