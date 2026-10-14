"""
SQLAlchemy MemoryPin model.
Uses PostGIS geometry for geographic storage.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, DateTime, ForeignKey, 
    text, Index, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
try:
    from geoalchemy2 import Geometry
    HAS_POSTGIS = True
except Exception:
    HAS_POSTGIS = False

from app.database.database import Base
import enum


class VisibilityEnum(str, enum.Enum):
    private = "private"
    public = "public"
    shared = "shared"


class MemoryPin(Base):
    __tablename__ = "memory_pins"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    # PostGIS point (SRID 4326 = WGS84)
    # Stored as float columns for broad compatibility;
    # spatial queries can use a computed column or be added later.
    location_name = Column(String(500), nullable=True)
    event_date = Column(String(50), nullable=True)
    visibility = Column(
        SAEnum(VisibilityEnum, name="visibility_enum", create_type=True),
        nullable=False,
        default=VisibilityEnum.private,
        server_default="private",
    )
    tags = Column(Text, nullable=True)  # comma-separated; keep ML-ready

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("now()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=text("now()"))

    # Relationships
    owner = relationship("User", back_populates="pins")
    media = relationship("Media", back_populates="pin", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_memory_pins_owner_title", "owner_id", "title"),
        Index("ix_memory_pins_owner_created", "owner_id", "created_at"),
    )

    def __repr__(self):
        return f"<MemoryPin id={self.id} title={self.title}>"
