"""
Media router: upload, list, and delete media attached to pins.
"""
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.media import MediaResponse, MediaListResponse
from app.services.media_service import upload_media, get_pin_media, delete_media
from app.services.storage_service import get_storage_service, StorageService
from app.dependencies.auth import get_current_user
from app.database.models.user import User

router = APIRouter(tags=["media"])


@router.post(
    "/api/pins/{pin_id}/media",
    response_model=MediaResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_pin_media(
    pin_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """Upload a file to a pin. Only the pin owner can upload."""
    return upload_media(pin_id, file, current_user, db, storage)


@router.get("/api/pins/{pin_id}/media", response_model=MediaListResponse)
def list_pin_media(
    pin_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all media for a pin. Only the pin owner can view."""
    media = get_pin_media(pin_id, current_user, db)
    return MediaListResponse(media=media, total=len(media))


@router.delete(
    "/api/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_pin_media(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """Delete a media file (DB record + physical file). Only pin owner can delete."""
    delete_media(media_id, current_user, db, storage)
