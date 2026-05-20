from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    cv_text: str = ""
    jd_text: str = Field(..., min_length=10)
    company_name: str | None = None


class SessionSummary(BaseModel):
    id: str
    company_name: str | None
    jd_preview: str
    created_at: datetime
    question_count: int = 0
    avg_score: float | None = None

    model_config = {"from_attributes": True}


class SessionDetail(BaseModel):
    id: str
    cv_text: str
    jd_text: str
    company_name: str | None
    created_at: datetime
    has_questions: bool

    model_config = {"from_attributes": True}
