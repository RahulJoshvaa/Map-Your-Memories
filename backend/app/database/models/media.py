"""
SQLAlchemy Media model for file attachments on pins.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.database.models.guid import GUID


class Media(Base):
    __tablename__ = "media"

    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    pin_id = Column(
        GUID,
        ForeignKey("memory_pins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by = Column(
        GUID,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    file_name = Column(String(255), nullable=False)    # original filename
    file_path = Column(String(1000), nullable=False)   # path on local FS
    file_type = Column(String(50), nullable=False)     # "image" | "video" | "audio" | "document"
    mime_type = Column(String(200), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    thumbnail_path = Column(String(1000), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pin = relationship("MemoryPin", back_populates="media")
    uploaded_by_user = relationship("User", back_populates="media", foreign_keys=[uploaded_by])



    def __repr__(self):
        return f"<Media id={self.id} file_name={self.file_name}>"
