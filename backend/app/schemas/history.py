from datetime import datetime

from pydantic import BaseModel

from app.schemas.evaluation import ScoreResponse
from app.schemas.questions import QuestionResponse


class AnswerWithScore(BaseModel):
    id: str
    transcript: str
    transcript_source: str
    created_at: datetime
    score: ScoreResponse | None = None


class QuestionWithAnswers(BaseModel):
    question: QuestionResponse
    answers: list[AnswerWithScore]


class SessionHistoryResponse(BaseModel):
    session_id: str
    company_name: str | None
    created_at: datetime
    questions: list[QuestionWithAnswers]
    average_scores: dict[str, float | None]
