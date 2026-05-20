"""LLM provider protocol — implement for each vendor."""

from typing import Protocol


class LLMClient(Protocol):
    async def complete_json(self, system_prompt: str, user_prompt: str) -> str:
        """Return raw JSON string from the model."""
        ...
