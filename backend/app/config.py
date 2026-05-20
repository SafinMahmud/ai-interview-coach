"""Application settings loaded from environment variables."""

from enum import Enum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMProvider(str, Enum):
    GROQ = "groq"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Interview Coach"
    debug: bool = False
    database_url: str = "sqlite:///./interview_coach.db"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    llm_provider: LLMProvider = LLMProvider.GROQ
    llm_model: str = "llama-3.3-70b-versatile"

    groq_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    whisper_model_size: str = "base"
    whisper_device: str = "cpu"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
