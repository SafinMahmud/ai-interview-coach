from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.answer import Answer
from app.models.question import Question
from app.schemas.answer import AnswerCreate, AnswerResponse

router = APIRouter()


@router.post(
    "/sessions/{session_id}/questions/{question_id}/answers",
    response_model=AnswerResponse,
    status_code=201,
)
def submit_answer(
    session_id: str,
    question_id: str,
    body: AnswerCreate,
    db: Session = Depends(get_db),
) -> AnswerResponse:
    question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.session_id == session_id)
        .first()
    )
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found for this session")

    answer = Answer(
        question_id=question_id,
        transcript=body.transcript.strip(),
        transcript_source=body.transcript_source.value,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    return AnswerResponse(
        id=answer.id,
        question_id=answer.question_id,
        transcript=answer.transcript,
        transcript_source=answer.transcript_source,
        created_at=answer.created_at,
        has_score=False,
    )
