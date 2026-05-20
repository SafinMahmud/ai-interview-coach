from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.cv import CVParseResponse
from app.services.pdf.parser import PDFParseError, extract_text_from_pdf

router = APIRouter(prefix="/cv")


@router.post("/parse", response_model=CVParseResponse)
async def parse_cv(file: UploadFile = File(...)) -> CVParseResponse:
    if file.content_type not in (
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    ):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        text = extract_text_from_pdf(content)
    except PDFParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return CVParseResponse(text=text)
