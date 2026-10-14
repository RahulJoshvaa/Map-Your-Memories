"""
Pin service: CRUD for memory pins.
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from fastapi import HTTPException, status
from app.database.models.memory_pin import MemoryPin
from app.database.models.user import User
from app.schemas.pin import PinCreateRequest, PinUpdateRequest, PinResponse
import uuid



from app.database.models.collaborator import PinCollaborator
from app.services.storage_service import StorageService
from app.services import notification_service


def _has_access(user: User):
    """Filter clause: user owns the pin or is an accepted collaborator on it."""
    return or_(
        MemoryPin.owner_id == user.id,
        and_(PinCollaborator.user_id == user.id, PinCollaborator.status == "accepted"),
    )


def _normalize_pin_response(pin: MemoryPin, current_user: User) -> MemoryPin:
    """Attach dynamic permission property for current user."""
    if pin.owner_id == current_user.id:
        setattr(pin, "permission", "OWNER")
    else:
        # Check collaborator role
        collab = next(
            (c for c in pin.collaborators if c.user_id == current_user.id and c.status == "accepted"),
            None,
        )
        setattr(pin, "permission", collab.role.upper() if collab else "VIEWER")
    return pin


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
    return _normalize_pin_response(pin, owner)


def get_user_pins(
    user: User,
    db: Session,
    search: Optional[str] = None,
) -> List[MemoryPin]:
    """
    Return all pins accessible to the user (pins owned by user + pins shared via collaboration).
    """
    # Pins owned OR pins where user is in collaborators
    query = (
        db.query(MemoryPin)
        .options(
            joinedload(MemoryPin.media),
            joinedload(MemoryPin.owner),
            joinedload(MemoryPin.collaborators).joinedload(PinCollaborator.user),
        )
        .outerjoin(PinCollaborator, MemoryPin.id == PinCollaborator.pin_id)
        .filter(_has_access(user))
        .distinct()
    )
    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(MemoryPin.title.ilike(q))

    pins = query.order_by(MemoryPin.created_at.desc()).all()
    for p in pins:
        _normalize_pin_response(p, user)
    return pins


def get_pin_by_id(pin_id: uuid.UUID, user: User, db: Session) -> MemoryPin:
    """
    Return a single pin by ID, accessible if owner or collaborator.
    """
    pin = (
        db.query(MemoryPin)
        .options(
            joinedload(MemoryPin.media),
            joinedload(MemoryPin.owner),
            joinedload(MemoryPin.collaborators).joinedload(PinCollaborator.user),
        )
        .outerjoin(PinCollaborator, MemoryPin.id == PinCollaborator.pin_id)
        .filter(
            MemoryPin.id == pin_id,
            _has_access(user),
        )
        .first()
    )
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin not found")
    return _normalize_pin_response(pin, user)


def update_pin(
    pin_id: uuid.UUID,
    data: PinUpdateRequest,
    owner: User,
    db: Session,
) -> MemoryPin:
    """Update a pin. Only the owner can update."""
    pin = get_pin_by_id(pin_id, owner, db)
    if pin.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can edit pin settings")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pin, field, value)
    db.commit()
    db.refresh(pin)
    return _normalize_pin_response(pin, owner)


def delete_pin(pin_id: uuid.UUID, owner: User, db: Session, storage: Optional[StorageService] = None) -> None:
    """Delete a pin and its associated media files. Only the owner can delete."""
    pin = get_pin_by_id(pin_id, owner, db)
    if pin.owner_id != owner.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete pin")
    
    # Clean up physical files if storage service is provided
    if storage and pin.media:
        for media_item in pin.media:
            if media_item.file_path:
                storage.delete_file(media_item.file_path)

    db.delete(pin)
    db.commit()


def add_pin_collaborator(pin_id: uuid.UUID, email: str, role: str, owner: User, db: Session) -> PinCollaborator:
    """
    Add a collaborator to a pin.
    - Pin must exist and current user must be the owner.
    - The collaborator email must exist as a registered user in the system.
    - Owner cannot add themselves as collaborator.
    """
    pin = (
        db.query(MemoryPin)
        .filter(MemoryPin.id == pin_id, MemoryPin.owner_id == owner.id)
        .first()
    )
    if not pin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pin not found or you are not the owner",
        )

    clean_email = email.strip().lower()
    if clean_email == owner.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already the owner of this pin",
        )

    target_user = db.query(User).filter(User.email == clean_email).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{email}' does not exist. They must register first.",
        )

    # Check if already added
    existing = (
        db.query(PinCollaborator)
        .filter(PinCollaborator.pin_id == pin_id, PinCollaborator.user_id == target_user.id)
        .first()
    )
    if existing and existing.status == "accepted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{email}' is already a collaborator on this pin",
        )
    if existing and existing.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{email}' already has a pending invitation to this pin",
        )

    if existing:
        # Previously declined: send a fresh invitation
        collab = existing
        collab.role = role or "Editor"
        collab.status = "pending"
    else:
        collab = PinCollaborator(
            pin_id=pin_id,
            user_id=target_user.id,
            role=role or "Editor",
            status="pending",
        )
        db.add(collab)
    db.commit()
    db.refresh(collab)

    # Ask the invited user to accept or decline
    try:
        notification_service.create_notification(
            db=db,
            user_id=target_user.id,
            type="collaboration_invite",
            title="Collaboration Invite",
            body=f'{owner.name} invited you to "{pin.title}" ({role} access).',
            pin_id=pin_id,
        )
    except Exception:
        pass  # Notifications are best-effort; never fail the core operation

    return collab


def remove_pin_collaborator(pin_id: uuid.UUID, collaborator_user_id: uuid.UUID, owner: User, db: Session) -> None:
    """Remove a collaborator from a pin."""
    pin = (
        db.query(MemoryPin)
        .filter(MemoryPin.id == pin_id, MemoryPin.owner_id == owner.id)
        .first()
    )
    if not pin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pin not found or you are not the owner",
        )

    collab = (
        db.query(PinCollaborator)
        .filter(PinCollaborator.pin_id == pin_id, PinCollaborator.user_id == collaborator_user_id)
        .first()
    )
    if not collab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found on this pin",
        )

    was_accepted = collab.status == "accepted"
    db.delete(collab)
    db.commit()

    # Notify the removed collaborator (a cancelled pending/declined invite needs no notice)
    if not was_accepted:
        return
    try:
        notification_service.create_notification(
            db=db,
            user_id=collaborator_user_id,
            type="collaborator_removed",
            title="Access Removed",
            body=f'{owner.name} removed your access to "{pin.title}".',
            pin_id=pin_id,
        )
    except Exception:
        pass


def respond_to_invitation(pin_id: uuid.UUID, accept: bool, user: User, db: Session) -> PinCollaborator:
    """Accept or decline a pending collaboration invitation for the current user."""
    collab = (
        db.query(PinCollaborator)
        .filter(PinCollaborator.pin_id == pin_id, PinCollaborator.user_id == user.id)
        .first()
    )
    if not collab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found. It may have been cancelled by the owner.",
        )
    if collab.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invitation was already {collab.status}",
        )

    collab.status = "accepted" if accept else "rejected"
    db.commit()
    db.refresh(collab)

    notification_service.mark_invite_notifications_read(db, user.id, pin_id)

    pin = db.query(MemoryPin).filter(MemoryPin.id == pin_id).first()
    if pin:
        try:
            notification_service.create_notification(
                db=db,
                user_id=pin.owner_id,
                type="invite_accepted" if accept else "invite_rejected",
                title="Invite Accepted" if accept else "Invite Declined",
                body=f'{user.name} {"accepted" if accept else "declined"} your invitation to "{pin.title}".',
                pin_id=pin_id,
            )
        except Exception:
            pass

    return collab
