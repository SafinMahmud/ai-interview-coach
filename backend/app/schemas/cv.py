from pydantic import BaseModel, Field


class CVParseResponse(BaseModel):
    text: str = Field(..., description="Extracted plain text from the PDF")
