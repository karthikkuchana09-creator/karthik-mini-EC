from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.ai import AIRequest, AIResponse, AIOut, AISummaryOut
from app.api.deps import get_db, get_current_user
from app.services.ai_service import generate_suggestion, generate_ai_summary, get_ai_history
from app.core.log import get_logger

logger = get_logger("ai_api")
router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/suggest", response_model=AIResponse)
def suggest_endpoint(
    request: AIRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return generate_suggestion(db, request, user)


@router.get("/summary", response_model=AISummaryOut)
def summary_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return generate_ai_summary(db, user)


@router.get("/history", response_model=list[AIOut])
def history_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_ai_history(db, user, skip, limit)
