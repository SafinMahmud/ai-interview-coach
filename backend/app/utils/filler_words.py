"""Count filler words in a transcript using regex (deterministic, pre-LLM)."""

import re

# Common English filler words and phrases (case-insensitive, word boundaries)
FILLER_PATTERNS = [
    r"\bum+\b",
    r"\buh+\b",
    r"\ber+\b",
    r"\bah+\b",
    r"\blike\b",
    r"\byou know\b",
    r"\bi mean\b",
    r"\bkind of\b",
    r"\bsort of\b",
    r"\bbasically\b",
    r"\bactually\b",
    r"\bliterally\b",
    r"\bso+\b",  # standalone "so" as filler (may have minor false positives)
    r"\bwell\b",
    r"\bright\b",
    r"\bokay\b",
    r"\bok\b",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in FILLER_PATTERNS]


def count_filler_words(transcript: str) -> int:
    if not transcript.strip():
        return 0
    total = 0
    for pattern in _COMPILED:
        total += len(pattern.findall(transcript))
    return total
