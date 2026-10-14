"""
Notification service: create, list, mark-read operations.
"""
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.database.models.notification import Notification
from app.database.models.user import User
from app.database.models.collaborator import PinCollaborator
import uuid


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str,
    pin_id: uuid.UUID = None,
) -> Notification:
    """Insert a single notification for a user."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        pin_id=pin_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_user_notifications(user: User, db: Session) -> List[Notification]:
    """
    Return all notifications for the current user, newest first.
    Invitation notifications get an `invite_status` attribute reflecting the current
    state of the invitation: pending | accepted | rejected | cancelled.
    """
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    invite_pin_ids = {n.pin_id for n in notifications if n.type == "collaboration_invite" and n.pin_id}
    statuses = {}
    if invite_pin_ids:
        rows = (
            db.query(PinCollaborator.pin_id, PinCollaborator.status)
            .filter(PinCollaborator.user_id == user.id, PinCollaborator.pin_id.in_(invite_pin_ids))
            .all()
        )
        statuses = {pin_id: s for pin_id, s in rows}
    for n in notifications:
        if n.type == "collaboration_invite":
            setattr(n, "invite_status", statuses.get(n.pin_id, "cancelled"))
    return notifications


def mark_invite_notifications_read(db: Session, user_id: uuid.UUID, pin_id: uuid.UUID) -> None:
    """Mark the user's invitation notifications for a pin as read once they've responded."""
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.pin_id == pin_id,
            Notification.type == "collaboration_invite",
        )
        .update({"is_read": True})
    )
    db.commit()


def mark_notification_read(notif_id: uuid.UUID, user: User, db: Session) -> Notification:
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notif_id, Notification.user_id == user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_notifications_read(user: User, db: Session) -> int:
    """Mark all notifications for the user as read. Returns count updated."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return count
