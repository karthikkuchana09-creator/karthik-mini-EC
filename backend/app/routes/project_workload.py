from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.deps import get_db, get_current_user
from app.schemas.workload import WorkloadResponse
from app.models.user import User
from app.services.workload_service import get_project_workload

router = APIRouter(tags=["Project Workload"])


@router.get("/projects/{project_id}/workload", response_model=WorkloadResponse)
def project_workload_endpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_project_workload(db, project_id, user)
