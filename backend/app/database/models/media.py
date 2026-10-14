"""
SQLAlchemy Media model for file attachments on pins.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base


class Media(Base):
    __tablename__ = "media"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    pin_id = Column(
        UUID(as_uuid=True),
        ForeignKey("memory_pins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    file_name = Column(String(255), nullable=False)    # original filename
    file_path = Column(String(1000), nullable=False)   # path on local FS
    file_type = Column(String(50), nullable=False)     # "image" | "video" | "audio" | "document"
    mime_type = Column(String(200), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    thumbnail_path = Column(String(1000), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("now()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=text("now()"))

    # Relationships
    pin = relationship("MemoryPin", back_populates="media")
    uploaded_by_user = relationship("User", back_populates="media", foreign_keys=[uploaded_by])

    __table_args__ = (
        Index("ix_media_pin_id", "pin_id"),
    )

    def __repr__(self):
        return f"<Media id={self.id} file_name={self.file_name}>"
