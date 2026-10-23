"""
Media service: file upload, retrieval, and deletion.
"""
import uuid as uuid_mod
from pathlib import Path
from typing import List, Optional
from fastapi import BackgroundTasks, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.database.models.media import Media
from app.database.models.memory_pin import MemoryPin
from app.database.models.user import User
from app.services.storage_service import StorageService
from app.ai import content as content_index

# Allowed MIME types and their corresponding subfolders
ALLOWED_TYPES = {
    # Images
    "image/jpeg": "images",
    "image/png": "images",
    "image/gif": "images",
    "image/webp": "images",
    "image/heic": "images",
    "image/heif": "images",
    # Videos
    "video/mp4": "videos",
    "video/quicktime": "videos",
    "video/x-msvideo": "videos",
    "video/webm": "videos",
    "video/x-matroska": "videos",
    # Audio
    "audio/mpeg": "audio",
    "audio/mp4": "audio",
    "audio/ogg": "audio",
    "audio/wav": "audio",
    "audio/webm": "audio",
    "audio/x-m4a": "audio",
    # Documents
    "application/pdf": "documents",
    "application/msword": "documents",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documents",
    "text/plain": "documents",
}

FILE_TYPE_MAP = {
    "images": "image",
    "videos": "video",
    "audio": "audio",
    "documents": "document",
}

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


from sqlalchemy import or_, and_
from app.database.models.collaborator import PinCollaborator

def _assert_pin_access(pin_id: uuid_mod.UUID, user: User, db: Session) -> MemoryPin:
    """Ensure the pin exists and user is owner or collaborator."""
    pin = (
        db.query(MemoryPin)
        .outerjoin(PinCollaborator, MemoryPin.id == PinCollaborator.pin_id)
        .filter(
            MemoryPin.id == pin_id,
            or_(
                MemoryPin.owner_id == user.id,
                and_(PinCollaborator.user_id == user.id, PinCollaborator.status == "accepted"),
            ),
        )
        .first()
    )
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin not found")
    return pin


def _pin_role(pin: MemoryPin, user: User, db: Session) -> str:
    """
    The user's role on the pin: OWNER, ADMIN, EDITOR or VIEWER.
    Media rules:  OWNER/ADMIN upload anything and delete any media;
                  EDITOR uploads photos only and deletes only what they uploaded;
                  VIEWER can't upload or delete.
    """
    if pin.owner_id == user.id:
        return "OWNER"
    collab = (
        db.query(PinCollaborator)
        .filter(
            PinCollaborator.pin_id == pin.id,
            PinCollaborator.user_id == user.id,
            PinCollaborator.status == "accepted",
        )
        .first()
    )
    return (collab.role or "Viewer").upper() if collab else "VIEWER"


def upload_media(
    pin_id: uuid_mod.UUID,
    upload_file: UploadFile,
    owner: User,
    db: Session,
    storage: StorageService,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Media:
    """
    Upload a file to a pin accessible to the current user.
    Documents and audio are then indexed for content search in the background.
    """
    pin = _assert_pin_access(pin_id, owner, db)
    role = _pin_role(pin, owner, db)
    if role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers can't upload media to this pin",
        )

    # Validate MIME type
    mime = upload_file.content_type or ""
    if mime not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{mime}' is not allowed. Supported: images, videos, audio, documents.",
        )

    subfolder = ALLOWED_TYPES[mime]
    file_type = FILE_TYPE_MAP[subfolder]
    if role == "EDITOR" and file_type != "image":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editors can only upload photos",
        )

    # Check file size by reading into memory (small enough for our use case)
    content = upload_file.file.read()
    file_size = len(content)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size {file_size // (1024*1024)} MB exceeds maximum 100 MB.",
        )

    # Reset file pointer after reading
    import io
    upload_file.file = io.BytesIO(content)

    uuid_filename, relative_path = storage.save_file(upload_file, subfolder)

    media = Media(
        pin_id=pin_id,
        uploaded_by=owner.id,
        file_name=upload_file.filename or uuid_filename,
        file_path=relative_path,
        file_type=file_type,
        mime_type=mime,
        file_size=file_size,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    if background_tasks is not None and content_index.should_index(mime):
        background_tasks.add_task(
            content_index.index_media,
            media.id, pin_id, media.file_name, file_type, mime, content,
        )
    return media


def get_pin_media(
    pin_id: uuid_mod.UUID,
    owner: User,
    db: Session,
) -> List[Media]:
    """Return all media for a pin accessible to the current user."""
    _assert_pin_access(pin_id, owner, db)
    return db.query(Media).filter(Media.pin_id == pin_id).all()


def delete_media(
    media_id: uuid_mod.UUID,
    owner: User,
    db: Session,
    storage: StorageService,
) -> None:
    """
    Delete a media record and its physical file.
    Owner and admins can delete any media; editors only media they uploaded.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    # 404 (not 403) when the user can't see the pin at all, so media ids don't leak.
    pin = _assert_pin_access(media.pin_id, owner, db)
    role = _pin_role(pin, owner, db)
    allowed = role in ("OWNER", "ADMIN") or (role == "EDITOR" and media.uploaded_by == owner.id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete media you uploaded"
            if role == "EDITOR" else "You do not have permission to delete this media",
        )

    # Delete physical file first; proceed even if it fails (log only)
    storage.delete_file(media.file_path)
    content_index.remove_media(media.id)

    # Delete DB record
    db.delete(media)
    db.commit()
