"""Local audio transcription via faster-whisper (optional dependency)."""

from functools import lru_cache
from pathlib import Path
import tempfile

from app.config import get_settings


class TranscriptionUnavailableError(Exception):
    pass


@lru_cache
def _get_whisper_model():
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise TranscriptionUnavailableError(
            "Server-side faster-whisper is not installed. "
            "Local dev only: pip install -r requirements-local.txt. "
            "On the hosted app use Record (browser Whisper) in the UI — "
            "do not call /api/v1/transcribe."
        ) from exc

    settings = get_settings()
    return WhisperModel(
        settings.whisper_model_size,
        device=settings.whisper_device,
        compute_type="int8" if settings.whisper_device == "cpu" else "float16",
    )


def transcribe_audio(file_bytes: bytes, filename: str = "audio.webm") -> str:
    settings = get_settings()
    if not settings.enable_local_whisper:
        raise TranscriptionUnavailableError(
            "Server-side Whisper is disabled on this host (Render free tier). "
            "In the app choose Record (browser Whisper), Live captions, or Type answer."
        )

    suffix = Path(filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        model = _get_whisper_model()
        segments, _info = model.transcribe(tmp_path, beam_size=5)
        parts = [segment.text.strip() for segment in segments if segment.text.strip()]
        transcript = " ".join(parts).strip()
        if not transcript:
            raise ValueError("No speech detected in audio")
        return transcript
    finally:
        Path(tmp_path).unlink(missing_ok=True)
