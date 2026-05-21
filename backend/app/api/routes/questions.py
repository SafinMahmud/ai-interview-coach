from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.questions import QuestionResponse, QuestionsGenerateResponse
from app.services.questions.service import QuestionService

router = APIRouter(prefix="/sessions/{session_id}/questions")


@router.post("/generate", response_model=QuestionsGenerateResponse)
async def generate_questions(
    session_id: str,
    force: bool = Query(False, description="Regenerate even if cached"),
    db: Session = Depends(get_db),
) -> QuestionsGenerateResponse:
    service = QuestionService(db)
    try:
        questions, cached = await service.generate_or_get_cached(
            session_id, force=force
        )
    except ValueError as exc:
        message = str(exc)
        if "Missing API key" in message:
            raise HTTPException(status_code=503, detail=message) from exc
        raise HTTPException(status_code=404, detail=message) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Question generation failed: {exc}",
        ) from exc

    return QuestionsGenerateResponse(
        session_id=session_id,
        cached=cached,
        questions=[QuestionResponse.model_validate(q) for q in questions],
    )


@router.get("", response_model=list[QuestionResponse])
def list_questions(
    session_id: str,
    db: Session = Depends(get_db),
) -> list[QuestionResponse]:
    service = QuestionService(db)
    if service.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    questions = service.list_questions(session_id)
    return [QuestionResponse.model_validate(q) for q in questions]
