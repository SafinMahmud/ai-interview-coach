from fastapi import APIRouter

from app.api.routes import answers, cv, evaluation, questions, sessions, transcribe

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(cv.router, tags=["cv"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(questions.router, tags=["questions"])
api_router.include_router(answers.router, tags=["answers"])
api_router.include_router(evaluation.router, tags=["evaluation"])
api_router.include_router(transcribe.router, tags=["transcription"])
