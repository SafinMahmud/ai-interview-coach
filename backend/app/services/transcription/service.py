"""Audio transcription: Groq API (hosted) or optional local faster-whisper."""

from functools import lru_cache
from pathlib import Path
import tempfile

from openai import AsyncOpenAI

from app.config import get_settings


class TranscriptionUnavailableError(Exception):
    pass


def _groq_client() -> AsyncOpenAI:
    settings = get_settings()
    if not settings.groq_api_key.strip():
        raise TranscriptionUnavailableError(
            "GROQ_API_KEY is not set. Add it in Render environment variables."
        )
    return AsyncOpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
    )


async def transcribe_with_groq(file_bytes: bytes, filename: str = "audio.webm") -> str:
    """Hosted Whisper on Groq — works on Render free tier (no local model RAM)."""
    settings = get_settings()
    suffix = Path(filename).suffix or ".webm"
    client = _groq_client()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model=settings.groq_whisper_model,
                file=audio_file,
                language="en",
                response_format="json",
            )
        text = (response.text if hasattr(response, "text") else str(response)).strip()
        if not text:
            raise ValueError("No speech detected in audio")
        return text
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@lru_cache
def _get_local_whisper_model():
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise TranscriptionUnavailableError(
            "Local faster-whisper is not installed. "
            "Use Groq API transcription (default on Render) or: pip install -r requirements-local.txt"
        ) from exc

    settings = get_settings()
    return WhisperModel(
        settings.whisper_model_size,
        device=settings.whisper_device,
        compute_type="int8" if settings.whisper_device == "cpu" else "float16",
    )


def transcribe_with_local_whisper(file_bytes: bytes, filename: str = "audio.webm") -> str:
    suffix = Path(filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        model = _get_local_whisper_model()
        segments, _info = model.transcribe(tmp_path, beam_size=5)
        parts = [segment.text.strip() for segment in segments if segment.text.strip()]
        transcript = " ".join(parts).strip()
        if not transcript:
            raise ValueError("No speech detected in audio")
        return transcript
    finally:
        Path(tmp_path).unlink(missing_ok=True)


async def transcribe_audio(file_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Hosted: Groq Whisper API (ENABLE_LOCAL_WHISPER=false, default on Render).
    Local dev: faster-whisper when ENABLE_LOCAL_WHISPER=true.
    """
    settings = get_settings()

    if settings.enable_local_whisper:
        return transcribe_with_local_whisper(file_bytes, filename)

    return await transcribe_with_groq(file_bytes, filename)
