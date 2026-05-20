from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.answer import TranscribeResponse
from app.services.transcription.service import (
    TranscriptionUnavailableError,
    transcribe_audio,
)

router = APIRouter(prefix="/transcribe")


@router.post("", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        transcript = transcribe_audio(content, file.filename or "audio.webm")
    except TranscriptionUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return TranscribeResponse(transcript=transcript)
