"""
SQLAlchemy User model.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    profile_image = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("now()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=text("now()"))
    last_login_at = Column(DateTime, nullable=True)

    # Relationships (for future collaboration features)
    pins = relationship("MemoryPin", back_populates="owner", cascade="all, delete-orphan")
    media = relationship("Media", back_populates="uploaded_by_user", foreign_keys="Media.uploaded_by")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
