"""
SQLAlchemy PinCollaborator model for memory sharing and co-authoring.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.database.models.guid import GUID


class PinCollaborator(Base):
    __tablename__ = "pin_collaborators"

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
    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(50), nullable=False, default="Editor")
    # Invitation state: "pending" until the invited user responds, then "accepted" | "rejected".
    # Only accepted collaborators get access to the pin.
    status = Column(String(20), nullable=False, default="pending", server_default="accepted")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    pin = relationship("MemoryPin", back_populates="collaborators")
    user = relationship("User", back_populates="collaborations")

    __table_args__ = (
        UniqueConstraint("pin_id", "user_id", name="uq_pin_collaborator_pin_user"),
        Index("ix_pin_collaborators_user_pin", "user_id", "pin_id"),
    )
