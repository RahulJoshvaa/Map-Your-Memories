"""
SQLAlchemy User model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database.database import Base
from app.database.models.guid import GUID


class User(Base):
    __tablename__ = "users"

    id = Column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    profile_image = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships (for collaboration features)
    pins = relationship("MemoryPin", back_populates="owner", cascade="all, delete-orphan")
    media = relationship("Media", back_populates="uploaded_by_user", foreign_keys="Media.uploaded_by")
    collaborations = relationship("PinCollaborator", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
