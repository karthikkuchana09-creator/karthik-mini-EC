from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.calendar import CalendarEvent
from app.models.user import User
from app.services.calendar_service import get_calendar

router = APIRouter(tags=["Project Calendar"])


@router.get(
    "/projects/{project_id}/calendar",
    response_model=list[CalendarEvent],
)
def get_calendar_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_calendar(db, project_id, user)
