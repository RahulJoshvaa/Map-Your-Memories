"""
Pydantic schemas for AI natural-language search.
"""
import uuid
from typing import List, Literal
from pydantic import BaseModel, field_validator
from app.ai.search.filters import SearchFilters
from app.schemas.pin import PinResponse


class AISearchRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_length(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Search query is required")
        if len(v) > 300:
            raise ValueError("Search query must be 300 characters or fewer")
        return v


class ContentMatch(BaseModel):
    """A file whose content matched the query (from the vector DB)."""
    pin_id: uuid.UUID
    media_id: uuid.UUID
    file_name: str
    file_type: str
    snippet: str
    score: float


class AISearchResponse(BaseModel):
    query: str
    filters: SearchFilters
    source: Literal["groq", "fallback"]  # which parser produced the filters
    pins: List[PinResponse]
    total: int
    content_matches: List[ContentMatch] = []
