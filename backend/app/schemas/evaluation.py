from datetime import datetime

from pydantic import BaseModel, Field


class EvaluationFeedback(BaseModel):
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class ScoreResponse(BaseModel):
    id: str
    answer_id: str
    relevance: float
    clarity: float
    star_method: float
    confidence: float
    filler_word_count: int
    feedback: EvaluationFeedback
    created_at: datetime

    model_config = {"from_attributes": True}


class LLMEvaluationResult(BaseModel):
    relevance: float = Field(ge=0, le=10)
    clarity: float = Field(ge=0, le=10)
    star_method: float = Field(ge=0, le=10)
    confidence: float = Field(ge=0, le=10)
    feedback: EvaluationFeedback
