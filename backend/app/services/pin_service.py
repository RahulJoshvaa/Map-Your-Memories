"""
Pin service: CRUD for memory pins.
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.database.models.memory_pin import MemoryPin
from app.database.models.user import User
from app.schemas.pin import PinCreateRequest, PinUpdateRequest, PinResponse
import uuid


def create_pin(data: PinCreateRequest, owner: User, db: Session) -> MemoryPin:
    """Create a new memory pin owned by the authenticated user."""
    pin = MemoryPin(
        owner_id=owner.id,
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        latitude=data.latitude,
        longitude=data.longitude,
        location_name=data.location_name,
        event_date=data.event_date,
        visibility=data.visibility or "private",
        tags=data.tags,
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)
    return pin


def get_user_pins(
    owner: User,
    db: Session,
    search: Optional[str] = None,
) -> List[MemoryPin]:
    """
    Return all pins owned by the authenticated user.
    Optionally filter by title search (case-insensitive).
    Prepared for future collaboration (collaborators can be joined here later).
    """
    query = (
        db.query(MemoryPin)
        .options(joinedload(MemoryPin.media))
        .filter(MemoryPin.owner_id == owner.id)
    )
    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(MemoryPin.title.ilike(q))

    return query.order_by(MemoryPin.created_at.desc()).all()


def get_pin_by_id(pin_id: uuid.UUID, owner: User, db: Session) -> MemoryPin:
    """
    Return a single pin by ID, enforcing ownership.
    Returns 404 (not 403) to avoid revealing existence of other users' pins.
    """
    pin = (
        db.query(MemoryPin)
        .options(joinedload(MemoryPin.media))
        .filter(MemoryPin.id == pin_id, MemoryPin.owner_id == owner.id)
        .first()
    )
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin not found")
    return pin


def update_pin(
    pin_id: uuid.UUID,
    data: PinUpdateRequest,
    owner: User,
    db: Session,
) -> MemoryPin:
    """Update a pin. Only the owner can update."""
    pin = get_pin_by_id(pin_id, owner, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pin, field, value)
    db.commit()
    db.refresh(pin)
    return pin


def delete_pin(pin_id: uuid.UUID, owner: User, db: Session) -> None:
    """Delete a pin. Only the owner can delete."""
    pin = get_pin_by_id(pin_id, owner, db)
    db.delete(pin)
    db.commit()
