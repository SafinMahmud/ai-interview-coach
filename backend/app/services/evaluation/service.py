import json

from sqlalchemy.orm import Session, joinedload

from app.models.answer import Answer
from app.models.score import Score
from app.schemas.evaluation import EvaluationFeedback, LLMEvaluationResult, ScoreResponse
from app.services.evaluation.prompts import (
    EVALUATION_SYSTEM,
    build_evaluation_user_prompt,
)
from app.services.llm import get_llm_client
from app.utils.filler_words import count_filler_words


class EvaluationService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_answer(self, answer_id: str) -> Answer | None:
        return (
            self._db.query(Answer)
            .options(joinedload(Answer.question))
            .filter(Answer.id == answer_id)
            .first()
        )

    async def evaluate(self, answer_id: str) -> ScoreResponse:
        answer = self.get_answer(answer_id)
        if answer is None:
            raise ValueError("Answer not found")

        if answer.score:
            return self._to_response(answer.score)

        question = answer.question
        filler_count = count_filler_words(answer.transcript)

        llm = get_llm_client()
        raw = await llm.complete_json(
            EVALUATION_SYSTEM,
            build_evaluation_user_prompt(
                question.text,
                question.category,
                answer.transcript,
                filler_count,
            ),
        )
        result = LLMEvaluationResult.model_validate(json.loads(raw))

        score = Score(
            answer_id=answer_id,
            relevance=result.relevance,
            clarity=result.clarity,
            star_method=result.star_method,
            confidence=result.confidence,
            filler_word_count=filler_count,
            feedback_json=result.feedback.model_dump_json(),
        )
        self._db.add(score)
        self._db.commit()
        self._db.refresh(score)
        return self._to_response(score)

    @staticmethod
    def _to_response(score: Score) -> ScoreResponse:
        return ScoreResponse(
            id=score.id,
            answer_id=score.answer_id,
            relevance=score.relevance,
            clarity=score.clarity,
            star_method=score.star_method,
            confidence=score.confidence,
            filler_word_count=score.filler_word_count,
            feedback=EvaluationFeedback.model_validate_json(score.feedback_json),
            created_at=score.created_at,
        )
