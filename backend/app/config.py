"""Application settings loaded from environment variables."""

from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of shell cwd (e.g. repo root vs backend/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class LLMProvider(str, Enum):
    GROQ = "groq"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
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
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if self.debug:
            # Local Vite may use 5173, 5174, etc.
            defaults = (
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
            )
            for origin in defaults:
                if origin not in origins:
                    origins.append(origin)
        return origins

    def validate_llm_api_key(self) -> None:
        """Raise if the active provider has no API key configured."""
        key_by_provider = {
            LLMProvider.GROQ: self.groq_api_key,
            LLMProvider.OPENAI: self.openai_api_key,
            LLMProvider.ANTHROPIC: self.anthropic_api_key,
        }
        key = key_by_provider.get(self.llm_provider, "")
        if not key or not key.strip():
            raise ValueError(
                f"Missing API key for LLM_PROVIDER={self.llm_provider.value}. "
                f"Set {self.llm_provider.value.upper()}_API_KEY in backend/.env "
                f"(copy from backend/.env.example)."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
