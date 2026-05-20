from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.evaluation import ScoreResponse
from app.services.evaluation.service import EvaluationService

router = APIRouter(prefix="/answers")


@router.post("/{answer_id}/evaluate", response_model=ScoreResponse)
async def evaluate_answer(
    answer_id: str,
    db: Session = Depends(get_db),
) -> ScoreResponse:
    service = EvaluationService(db)
    try:
        return await service.evaluate(answer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
