"""
SQLAlchemy Notification model.
Stores per-user notifications triggered by system events.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.database.models.guid import GUID


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)

    # The user who receives this notification
    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Notification type: "share" | "collaborator_removed" | "pin_updated" | "pin_deleted"
    type = Column(String(64), nullable=False)

    # Human-readable title and body
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)

    # Optional reference to the relevant pin
    pin_id = Column(
        GUID,
        ForeignKey("memory_pins.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
    pin = relationship("MemoryPin", back_populates="notifications")
