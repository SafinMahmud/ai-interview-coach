from functools import lru_cache

from app.config import LLMProvider, get_settings
from app.services.llm.base import LLMClient
from app.services.llm.providers import AnthropicProvider, GroqProvider, OpenAIProvider


@lru_cache
def get_llm_client() -> LLMClient:
    settings = get_settings()
    settings.validate_llm_api_key()
    providers: dict[LLMProvider, type[LLMClient]] = {
        LLMProvider.GROQ: GroqProvider,
        LLMProvider.OPENAI: OpenAIProvider,
        LLMProvider.ANTHROPIC: AnthropicProvider,
    }
    provider_cls = providers.get(settings.llm_provider)
    if provider_cls is None:
        raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
    return provider_cls(settings)
