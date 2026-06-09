import asyncio
import json
import re

from anthropic import AsyncAnthropic
from openai import APIConnectionError, AsyncOpenAI

from app.config import Settings

_LLM_CONNECT_RETRIES = 3
_LLM_CONNECT_RETRY_DELAY_SEC = 0.75


def _extract_json(text: str) -> str:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        return text[start : end + 1]
    return text


async def _with_connection_retries(coro_factory):
    last_exc: Exception | None = None
    for attempt in range(_LLM_CONNECT_RETRIES):
        try:
            return await coro_factory()
        except APIConnectionError as exc:
            last_exc = exc
            if attempt + 1 >= _LLM_CONNECT_RETRIES:
                break
            await asyncio.sleep(_LLM_CONNECT_RETRY_DELAY_SEC * (attempt + 1))
    raise last_exc  # type: ignore[misc]


class GroqProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )

    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        async def _call():
            return await self._client.chat.completions.create(
                model=self._settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
            )

        response = await _with_connection_retries(_call)
        return _extract_json(response.choices[0].message.content or "{}")


class OpenAIProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model=self._settings.llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        return _extract_json(response.choices[0].message.content or "{}")


class AnthropicProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.messages.create(
            model=self._settings.llm_model,
            max_tokens=4096,
            system=system_prompt + "\nRespond with valid JSON only.",
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.4,
        )
        block = response.content[0]
        text = block.text if hasattr(block, "text") else str(block)
        return _extract_json(text)
