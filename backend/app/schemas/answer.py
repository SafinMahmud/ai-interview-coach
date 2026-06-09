from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TranscriptSource(str, Enum):
    LOCAL_WHISPER = "local_whisper"
    GROQ_STT = "groq_stt"
    BROWSER_WHISPER = "browser_whisper"
    WEB_SPEECH = "web_speech"
    TEXT = "text"


class AnswerCreate(BaseModel):
    transcript: str = Field(..., min_length=1)
    transcript_source: TranscriptSource


class AnswerResponse(BaseModel):
    id: str
    question_id: str
    transcript: str
    transcript_source: str
    created_at: datetime
    has_score: bool = False

    model_config = {"from_attributes": True}


class TranscribeResponse(BaseModel):
    transcript: str
    source: TranscriptSource
