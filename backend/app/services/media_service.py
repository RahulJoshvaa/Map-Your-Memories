"""
Media service: file upload, retrieval, and deletion.
"""
import uuid as uuid_mod
from pathlib import Path
from typing import List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.database.models.media import Media
from app.database.models.memory_pin import MemoryPin
from app.database.models.user import User
from app.services.storage_service import StorageService

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


def _assert_pin_owner(pin_id: uuid_mod.UUID, owner: User, db: Session) -> MemoryPin:
    """Ensure the pin exists and belongs to owner."""
    pin = (
        db.query(MemoryPin)
        .filter(MemoryPin.id == pin_id, MemoryPin.owner_id == owner.id)
        .first()
    )
    if not pin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin not found")
    return pin


def upload_media(
    pin_id: uuid_mod.UUID,
    upload_file: UploadFile,
    owner: User,
    db: Session,
    storage: StorageService,
) -> Media:
    """Upload a file to a pin owned by the current user."""
    _assert_pin_owner(pin_id, owner, db)

    # Validate MIME type
    mime = upload_file.content_type or ""
    if mime not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{mime}' is not allowed. Supported: images, videos, audio, documents.",
        )

    subfolder = ALLOWED_TYPES[mime]
    file_type = FILE_TYPE_MAP[subfolder]

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
    return media


def get_pin_media(
    pin_id: uuid_mod.UUID,
    owner: User,
    db: Session,
) -> List[Media]:
    """Return all media for a pin owned by the current user."""
    _assert_pin_owner(pin_id, owner, db)
    return db.query(Media).filter(Media.pin_id == pin_id).all()


def delete_media(
    media_id: uuid_mod.UUID,
    owner: User,
    db: Session,
    storage: StorageService,
) -> None:
    """
    Delete a media record and its physical file.
    Only the pin owner can delete media.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")

    # Ensure current user owns the pin
    pin = (
        db.query(MemoryPin)
        .filter(MemoryPin.id == media.pin_id, MemoryPin.owner_id == owner.id)
        .first()
    )
    if not pin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this media",
        )

    # Delete physical file first; proceed even if it fails (log only)
    storage.delete_file(media.file_path)

    # Delete DB record
    db.delete(media)
    db.commit()
