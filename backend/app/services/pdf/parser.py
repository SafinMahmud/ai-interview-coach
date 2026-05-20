"""Extract plain text from CV PDF uploads."""

from io import BytesIO

from pypdf import PdfReader


class PDFParseError(Exception):
    pass


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        raise PDFParseError("Invalid or corrupted PDF file") from exc

    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text.strip())

    combined = "\n\n".join(parts).strip()
    if not combined:
        raise PDFParseError("No text could be extracted from the PDF")
    return combined
