from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.ai import AIRequest, AIResponse, AIOut, AISummaryOut
from app.api.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.ai import AIService
from app.core.log import get_logger

logger = get_logger("ai_api")
router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/suggest", response_model=AIResponse)
def suggest_endpoint(
    request: AIRequest,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).generate_suggestion(request, user)


@router.get("/summary", response_model=AISummaryOut)
def summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).generate_summary(user)


@router.get("/history", response_model=list[AIOut])
def history_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.ai_use)),
):
    return AIService(db).get_history(user, skip, limit)
