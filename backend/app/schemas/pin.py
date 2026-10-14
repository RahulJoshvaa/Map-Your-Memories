"""
Pydantic schemas for memory pins.
"""
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import uuid


class PinCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    event_date: Optional[str] = None
    visibility: Optional[str] = "private"
    tags: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title is required")
        return v

    @field_validator("latitude")
    @classmethod
    def valid_latitude(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def valid_longitude(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class PinUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location_name: Optional[str] = None
    event_date: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[str] = None


class MediaSummary(BaseModel):
    id: uuid.UUID
    file_name: str
    file_type: str
    mime_type: str
    file_size: int
    file_path: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PinResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    event_date: Optional[str] = None
    visibility: str
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    media: List[MediaSummary] = []

    model_config = {"from_attributes": True}


class PinListResponse(BaseModel):
    pins: List[PinResponse]
    total: int
