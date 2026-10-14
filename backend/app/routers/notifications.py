"""
Notifications router: list, mark-read, mark-all-read endpoints.
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.schemas.types import UTCDateTime

from app.database.database import get_db
from app.dependencies.auth import get_current_user
from app.database.models.user import User
from app.services.notification_service import (
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    pin_id: Optional[uuid.UUID] = None
    is_read: bool
    # Only set for "collaboration_invite": pending | accepted | rejected | cancelled
    invite_status: Optional[str] = None
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=NotificationListResponse)
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all notifications for the authenticated user."""
    notifications = get_user_notifications(current_user, db)
    unread_count = sum(1 for n in notifications if not n.is_read)
    return NotificationListResponse(
        notifications=notifications,
        unread_count=unread_count,
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    return mark_notification_read(notification_id, current_user, db)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def read_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for the current user."""
    mark_all_notifications_read(current_user, db)
