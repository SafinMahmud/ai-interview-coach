from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.session import SessionCreate, SessionDetail, SessionSummary
from app.services.pdf.parser import PDFParseError, extract_text_from_pdf
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions")


@router.post("", response_model=SessionDetail, status_code=201)
async def create_session(
    jd_text: str = Form(...),
    company_name: str | None = Form(None),
    cv_text: str | None = Form(None),
    cv_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> SessionDetail:
    resolved_cv = cv_text or ""

    if cv_file and cv_file.filename:
        content = await cv_file.read()
        try:
            resolved_cv = extract_text_from_pdf(content)
        except PDFParseError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    if len(jd_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="jd_text must be at least 10 characters")

    service = SessionService(db)
    session = service.create(
        jd_text=jd_text.strip(),
        cv_text=resolved_cv.strip(),
        company_name=company_name.strip() if company_name else None,
    )
    return SessionDetail(
        id=session.id,
        cv_text=session.cv_text,
        jd_text=session.jd_text,
        company_name=session.company_name,
        created_at=session.created_at,
        has_questions=False,
    )


@router.post("/json", response_model=SessionDetail, status_code=201)
def create_session_json(
    body: SessionCreate,
    db: Session = Depends(get_db),
) -> SessionDetail:
    service = SessionService(db)
    session = service.create(
        jd_text=body.jd_text,
        cv_text=body.cv_text,
        company_name=body.company_name,
    )
    return SessionDetail(
        id=session.id,
        cv_text=session.cv_text,
        jd_text=session.jd_text,
        company_name=session.company_name,
        created_at=session.created_at,
        has_questions=False,
    )


@router.get("", response_model=list[SessionSummary])
def list_sessions(db: Session = Depends(get_db)) -> list[SessionSummary]:
    return SessionService(db).list_sessions()


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionDetail:
    session = SessionService(db).get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetail(
        id=session.id,
        cv_text=session.cv_text,
        jd_text=session.jd_text,
        company_name=session.company_name,
        created_at=session.created_at,
        has_questions=bool(session.questions_cache or session.questions),
    )


@router.get("/{session_id}/history")
def get_session_history(session_id: str, db: Session = Depends(get_db)):
    history = SessionService(db).get_history(session_id)
    if history is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return history
