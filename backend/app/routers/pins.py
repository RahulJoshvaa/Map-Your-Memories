"""
Pins router: CRUD for memory pins.
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.pin import PinCreateRequest, PinUpdateRequest, PinResponse, PinListResponse
from app.services.pin_service import create_pin, get_user_pins, get_pin_by_id, update_pin, delete_pin
from app.dependencies.auth import get_current_user
from app.database.models.user import User

router = APIRouter(prefix="/api/pins", tags=["pins"])


@router.get("", response_model=PinListResponse)
def list_pins(
    search: Optional[str] = Query(None, description="Case-insensitive title search"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all pins owned by the authenticated user.
    Optional: filter by title via ?search=query
    """
    pins = get_user_pins(current_user, db, search=search)
    return PinListResponse(pins=pins, total=len(pins))


@router.post("", response_model=PinResponse, status_code=status.HTTP_201_CREATED)
def create_new_pin(
    data: PinCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new memory pin. owner_id is always set from the JWT, never from the request."""
    pin = create_pin(data, current_user, db)
    return pin


@router.get("/{pin_id}", response_model=PinResponse)
def get_pin(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single pin by ID. Returns 404 if not found or not owned by current user."""
    return get_pin_by_id(pin_id, current_user, db)


@router.patch("/{pin_id}", response_model=PinResponse)
def update_existing_pin(
    pin_id: uuid.UUID,
    data: PinUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing pin (partial update). Only the owner can update."""
    return update_pin(pin_id, data, current_user, db)


@router.delete("/{pin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_pin(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a pin. Only the owner can delete."""
    delete_pin(pin_id, current_user, db)
