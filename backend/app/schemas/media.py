"""
Pydantic schemas for media.
"""
from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime
from app.schemas.types import UTCDateTime
import uuid


class MediaResponse(BaseModel):
    id: uuid.UUID
    pin_id: uuid.UUID
    uploaded_by: Optional[uuid.UUID] = None
    file_name: str
    file_path: str
    file_type: str
    mime_type: str
    file_size: int
    thumbnail_path: Optional[str] = None
    created_at: UTCDateTime
    updated_at: UTCDateTime

    @computed_field
    @property
    def url(self) -> str:
        return f"/uploads/{self.file_path}"

    model_config = {"from_attributes": True}


class MediaListResponse(BaseModel):
    media: list[MediaResponse]
    total: int
