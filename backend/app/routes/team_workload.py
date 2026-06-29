from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.workload import WorkloadResponse
from app.models.user import User
from app.services.workload_service import get_team_workload

router = APIRouter(tags=["Team Workload"])


@router.get("/teams/{team_id}/workload", response_model=WorkloadResponse)
def team_workload_endpoint(
    team_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_team_workload(db, team_id, user)
