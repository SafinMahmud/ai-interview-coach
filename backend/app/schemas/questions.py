from enum import Enum

from pydantic import BaseModel, Field


class QuestionCategory(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    CV_SPECIFIC = "cv_specific"
    WHY_COMPANY = "why_company"


class GeneratedQuestion(BaseModel):
    category: QuestionCategory
    text: str


class QuestionSet(BaseModel):
    technical: list[str] = Field(default_factory=list)
    behavioral: list[str] = Field(default_factory=list)
    cv_specific: list[str] = Field(default_factory=list)
    why_company: list[str] = Field(default_factory=list)


class QuestionResponse(BaseModel):
    id: str
    category: str
    text: str
    sort_order: int

    model_config = {"from_attributes": True}


class QuestionsGenerateResponse(BaseModel):
    session_id: str
    cached: bool
    questions: list[QuestionResponse]
