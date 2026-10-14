"""
Storage abstraction layer.

Architecture:
  StorageService (abstract interface)
    ├── LocalStorageService  ← implemented now
    └── S3StorageService     ← future (swap without changing pin/media business logic)

To switch to S3 later:
  1. Implement S3StorageService with the same public interface.
  2. Change get_storage_service() to return S3StorageService.
  3. No changes needed in media_service, routers, or business logic.
"""
import os
import uuid
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from fastapi import UploadFile
from app.config import settings


class StorageService(ABC):
    """Abstract storage interface."""

    @abstractmethod
    def save_file(self, upload_file: UploadFile, subfolder: str) -> tuple[str, str]:
        """
        Persist the uploaded file.
        Returns (uuid_filename, relative_file_path).
        """
        ...

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Delete the file at the given path. Returns True on success."""
        ...

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """Return the accessible URL or path for serving the file."""
        ...


class LocalStorageService(StorageService):
    """
    Stores files in the local filesystem under settings.UPLOAD_DIR.

    File naming: UUID-based to prevent collisions and enumeration.
    Original filename is preserved only in the database metadata.
    """

    def __init__(self):
        self.base_dir = Path(settings.UPLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_file(self, upload_file: UploadFile, subfolder: str) -> tuple[str, str]:
        """
        Save file to base_dir/subfolder/<uuid>.<ext>
        Returns (uuid_filename, relative_path_from_UPLOAD_DIR).
        """
        target_dir = self.base_dir / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        original_name = upload_file.filename or "upload"
        extension = Path(original_name).suffix.lower() or ""
        uuid_filename = f"{uuid.uuid4()}{extension}"

        target_path = target_dir / uuid_filename
        with open(target_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)

        # Return relative path from base uploads dir for DB storage
        relative_path = str(Path(subfolder) / uuid_filename)
        return uuid_filename, relative_path

    def delete_file(self, file_path: str) -> bool:
        """Delete by relative path stored in DB."""
        full_path = self.base_dir / file_path
        try:
            if full_path.exists():
                full_path.unlink()
                return True
        except OSError:
            pass
        return False

    def get_file_url(self, file_path: str) -> str:
        """Return path relative to the static mount for serving."""
        return f"/uploads/{file_path}"


def get_storage_service() -> StorageService:
    """
    Factory function — swap this to return S3StorageService when ready.
    Used via FastAPI dependency injection.
    """
    return LocalStorageService()
