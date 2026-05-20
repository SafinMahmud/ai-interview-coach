import json

from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.session import InterviewSession
from app.schemas.questions import QuestionCategory, QuestionSet
from app.services.llm import get_llm_client
from app.services.questions.prompts import (
    QUESTION_GENERATION_SYSTEM,
    build_question_user_prompt,
)

CATEGORY_ORDER = [
    (QuestionCategory.TECHNICAL, "technical"),
    (QuestionCategory.BEHAVIORAL, "behavioral"),
    (QuestionCategory.CV_SPECIFIC, "cv_specific"),
    (QuestionCategory.WHY_COMPANY, "why_company"),
]


class QuestionService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_session(self, session_id: str) -> InterviewSession | None:
        return self._db.get(InterviewSession, session_id)

    def list_questions(self, session_id: str) -> list[Question]:
        return (
            self._db.query(Question)
            .filter(Question.session_id == session_id)
            .order_by(Question.sort_order)
            .all()
        )

    def has_cached_questions(self, session: InterviewSession) -> bool:
        return bool(session.questions_cache) or len(session.questions) > 0

    async def generate_or_get_cached(
        self, session_id: str, *, force: bool = False
    ) -> tuple[list[Question], bool]:
        session = self.get_session(session_id)
        if session is None:
            raise ValueError("Session not found")

        existing = self.list_questions(session_id)
        if existing and not force:
            return existing, True

        if session.questions_cache and not force:
            self._hydrate_from_cache(session)
            return self.list_questions(session_id), True

        question_set = await self._generate_with_llm(session)
        session.questions_cache = question_set.model_dump_json()
        self._db.query(Question).filter(Question.session_id == session_id).delete()

        questions: list[Question] = []
        order = 0
        for category, key in CATEGORY_ORDER:
            for text in getattr(question_set, key):
                q = Question(
                    session_id=session_id,
                    category=category.value,
                    text=text,
                    sort_order=order,
                )
                self._db.add(q)
                questions.append(q)
                order += 1

        self._db.commit()
        for q in questions:
            self._db.refresh(q)
        return questions, False

    def _hydrate_from_cache(self, session: InterviewSession) -> None:
        if not session.questions_cache:
            return
        data = json.loads(session.questions_cache)
        question_set = QuestionSet.model_validate(data)
        self._db.query(Question).filter(Question.session_id == session.id).delete()
        order = 0
        for category, key in CATEGORY_ORDER:
            for text in getattr(question_set, key):
                self._db.add(
                    Question(
                        session_id=session.id,
                        category=category.value,
                        text=text,
                        sort_order=order,
                    )
                )
                order += 1
        self._db.commit()

    async def _generate_with_llm(self, session: InterviewSession) -> QuestionSet:
        llm = get_llm_client()
        raw = await llm.complete_json(
            QUESTION_GENERATION_SYSTEM,
            build_question_user_prompt(
                session.cv_text, session.jd_text, session.company_name
            ),
        )
        return QuestionSet.model_validate(json.loads(raw))
