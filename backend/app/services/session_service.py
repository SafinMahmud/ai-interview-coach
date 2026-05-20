from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.answer import Answer
from app.models.question import Question
from app.models.score import Score
from app.models.session import InterviewSession
from app.schemas.evaluation import EvaluationFeedback, ScoreResponse
from app.schemas.history import (
    AnswerWithScore,
    QuestionWithAnswers,
    SessionHistoryResponse,
)
from app.schemas.questions import QuestionResponse
from app.schemas.session import SessionSummary


class SessionService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self,
        *,
        jd_text: str,
        cv_text: str = "",
        company_name: str | None = None,
    ) -> InterviewSession:
        session = InterviewSession(
            jd_text=jd_text,
            cv_text=cv_text,
            company_name=company_name,
        )
        self._db.add(session)
        self._db.commit()
        self._db.refresh(session)
        return session

    def get(self, session_id: str) -> InterviewSession | None:
        return self._db.get(InterviewSession, session_id)

    def list_sessions(self, limit: int = 50) -> list[SessionSummary]:
        sessions = (
            self._db.query(InterviewSession)
            .order_by(InterviewSession.created_at.desc())
            .limit(limit)
            .all()
        )
        summaries: list[SessionSummary] = []
        for s in sessions:
            q_count = (
                self._db.query(func.count(Question.id))
                .filter(Question.session_id == s.id)
                .scalar()
                or 0
            )
            avg = self._average_score_for_session(s.id)
            summaries.append(
                SessionSummary(
                    id=s.id,
                    company_name=s.company_name,
                    jd_preview=s.jd_text[:120] + ("..." if len(s.jd_text) > 120 else ""),
                    created_at=s.created_at,
                    question_count=q_count,
                    avg_score=avg,
                )
            )
        return summaries

    def get_history(self, session_id: str) -> SessionHistoryResponse | None:
        session = (
            self._db.query(InterviewSession)
            .options(
                joinedload(InterviewSession.questions)
                .joinedload(Question.answers)
                .joinedload(Answer.score)
            )
            .filter(InterviewSession.id == session_id)
            .first()
        )
        if session is None:
            return None

        questions_data: list[QuestionWithAnswers] = []
        all_scores: list[Score] = []

        for q in sorted(session.questions, key=lambda x: x.sort_order):
            answers_data: list[AnswerWithScore] = []
            for a in sorted(q.answers, key=lambda x: x.created_at):
                score_resp = None
                if a.score:
                    all_scores.append(a.score)
                    score_resp = ScoreResponse(
                        id=a.score.id,
                        answer_id=a.score.answer_id,
                        relevance=a.score.relevance,
                        clarity=a.score.clarity,
                        star_method=a.score.star_method,
                        confidence=a.score.confidence,
                        filler_word_count=a.score.filler_word_count,
                        feedback=EvaluationFeedback.model_validate_json(
                            a.score.feedback_json
                        ),
                        created_at=a.score.created_at,
                    )
                answers_data.append(
                    AnswerWithScore(
                        id=a.id,
                        transcript=a.transcript,
                        transcript_source=a.transcript_source,
                        created_at=a.created_at,
                        score=score_resp,
                    )
                )
            questions_data.append(
                QuestionWithAnswers(
                    question=QuestionResponse.model_validate(q),
                    answers=answers_data,
                )
            )

        def avg_field(getter):
            if not all_scores:
                return None
            return round(sum(getter(s) for s in all_scores) / len(all_scores), 2)

        return SessionHistoryResponse(
            session_id=session.id,
            company_name=session.company_name,
            created_at=session.created_at,
            questions=questions_data,
            average_scores={
                "relevance": avg_field(lambda s: s.relevance),
                "clarity": avg_field(lambda s: s.clarity),
                "star_method": avg_field(lambda s: s.star_method),
                "confidence": avg_field(lambda s: s.confidence),
            },
        )

    def _average_score_for_session(self, session_id: str) -> float | None:
        scores = (
            self._db.query(Score)
            .join(Answer, Score.answer_id == Answer.id)
            .join(Question, Answer.question_id == Question.id)
            .filter(Question.session_id == session_id)
            .all()
        )
        if not scores:
            return None
        totals = [s.relevance + s.clarity + s.star_method + s.confidence for s in scores]
        return round(sum(totals) / (len(totals) * 4), 2)
