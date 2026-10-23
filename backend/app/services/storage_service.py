"""
Storage abstraction layer.

Architecture:
  StorageService (abstract interface)
    ├── LocalStorageService  ← files on disk, served from /uploads (development)
    ├── CloudinaryStorageService ← Cloudinary media cloud
    └── R2StorageService     ← Cloudflare R2 object storage (S3-compatible)

STORAGE_BACKEND in .env picks the implementation ("local", "cloudinary" or "r2").
media_service, routers and business logic only see the StorageService interface.
"""
import time
import uuid
import shutil
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from fastapi import UploadFile
from app.config import settings


def _new_filename(upload_file: UploadFile) -> str:
    """UUID-based name to prevent collisions and enumeration; keeps the extension."""
    extension = Path(upload_file.filename or "upload").suffix.lower()
    return f"{uuid.uuid4()}{extension}"


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

        uuid_filename = _new_filename(upload_file)
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
        url_path = file_path.replace("\\", "/")  # paths saved on Windows use backslashes
        return f"/uploads/{url_path}"


class R2StorageService(StorageService):
    """
    Stores files in a Cloudflare R2 bucket through its S3-compatible API.

    The object key is "<subfolder>/<uuid>.<ext>" and is what the DB stores in
    media.file_path. The bucket stays private by default: get_file_url returns a
    short-lived presigned URL, so only users who can see the pin get a link.
    If R2_PUBLIC_URL is set (r2.dev or custom domain), plain public URLs are used.
    """

    def __init__(self, client=None):
        self.bucket = settings.R2_BUCKET
        self.public_url = settings.R2_PUBLIC_URL.rstrip("/")
        self.client = client or self._make_client()

    @staticmethod
    def _make_client():
        import boto3
        from botocore.config import Config

        missing = [
            name for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")
            if not getattr(settings, name)
        ]
        if missing:
            raise RuntimeError(f"STORAGE_BACKEND=r2 but {', '.join(missing)} not set in .env")

        return boto3.client(
            "s3",
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def save_file(self, upload_file: UploadFile, subfolder: str) -> tuple[str, str]:
        uuid_filename = _new_filename(upload_file)
        key = f"{subfolder}/{uuid_filename}"
        self.client.upload_fileobj(
            upload_file.file,
            self.bucket,
            key,
            ExtraArgs={"ContentType": upload_file.content_type or "application/octet-stream"},
        )
        return uuid_filename, key

    def delete_file(self, file_path: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=file_path)
            return True
        except Exception:
            return False

    def get_file_url(self, file_path: str) -> str:
        if self.public_url:
            return f"{self.public_url}/{file_path}"
        # Presigning is computed locally (no network call).
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": file_path},
            ExpiresIn=settings.R2_URL_EXPIRE_SECONDS,
        )


class CloudinaryStorageService(StorageService):
    """
    Stores files in Cloudinary.

    Uploads use delivery type "authenticated", so a file cannot be opened by
    guessing its public URL; get_file_url returns a signed URL that the API only
    hands to users who can see the pin.

    media.file_path holds "<resource_type>/<public_id>.<ext>", for example
    "image/map-your-memories/images/<uuid>.jpg". Cloudinary needs the resource
    type to build URLs and to delete, so it is kept in the path.
    """

    # Cloudinary groups files as image, video (also audio) or raw (anything else).
    RESOURCE_TYPES = {"images": "image", "videos": "video", "audio": "video", "documents": "raw"}
    DELIVERY_TYPE = "authenticated"

    def __init__(self):
        import cloudinary

        missing = [
            name for name in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
            if not getattr(settings, name)
        ]
        if missing:
            raise RuntimeError(f"STORAGE_BACKEND=cloudinary but {', '.join(missing)} not set in .env")

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        self.folder = settings.CLOUDINARY_FOLDER.strip("/")

    @staticmethod
    def _split(file_path: str) -> tuple[str, str, str | None]:
        """
        file_path -> (resource_type, public_id, format).
        Raw files keep the extension inside the public_id; images and videos don't.
        """
        resource_type, public_id = file_path.split("/", 1)
        if resource_type == "raw":
            return resource_type, public_id, None
        stem, _, extension = public_id.rpartition(".")
        return resource_type, stem or public_id, extension or None

    @staticmethod
    def _with_retry(call, attempts: int = 3):
        """Run a Cloudinary API call, retrying when the connection is reset (WinError 10054)."""
        for attempt in range(attempts):
            try:
                return call()
            except Exception as exc:
                if attempt == attempts - 1 or "Connection" not in str(exc):
                    raise
                time.sleep(0.5 * (attempt + 1))

    def save_file(self, upload_file: UploadFile, subfolder: str) -> tuple[str, str]:
        import cloudinary.uploader

        uuid_filename = _new_filename(upload_file)
        resource_type = self.RESOURCE_TYPES.get(subfolder, "raw")
        name = uuid_filename if resource_type == "raw" else Path(uuid_filename).stem
        public_id = "/".join(p for p in (self.folder, subfolder, name) if p)

        def upload():
            upload_file.file.seek(0)
            return cloudinary.uploader.upload(
                upload_file.file,
                public_id=public_id,
                resource_type=resource_type,
                type=self.DELIVERY_TYPE,
                overwrite=False,
            )

        result = self._with_retry(upload)
        stored_id = result["public_id"]
        if resource_type != "raw" and result.get("format"):
            stored_id = f"{stored_id}.{result['format']}"
        return uuid_filename, f"{resource_type}/{stored_id}"

    def delete_file(self, file_path: str) -> bool:
        import cloudinary.uploader

        resource_type, public_id, _ = self._split(file_path)
        try:
            result = self._with_retry(lambda: cloudinary.uploader.destroy(
                public_id, resource_type=resource_type, type=self.DELIVERY_TYPE, invalidate=True,
            ))
            return result.get("result") == "ok"
        except Exception:
            return False

    def get_file_url(self, file_path: str) -> str:
        from cloudinary.utils import cloudinary_url

        resource_type, public_id, extension = self._split(file_path)
        # Signing is computed locally (no network call).
        url, _ = cloudinary_url(
            public_id,
            resource_type=resource_type,
            type=self.DELIVERY_TYPE,
            format=extension,
            sign_url=True,
            secure=True,
        )
        return url


@lru_cache
def get_storage_service() -> StorageService:
    """
    Factory chosen by STORAGE_BACKEND; one shared instance per process.
    Used via FastAPI dependency injection and by the media schemas for URLs.
    """
    backend = settings.STORAGE_BACKEND.lower()
    if backend == "cloudinary":
        return CloudinaryStorageService()
    if backend == "r2":
        return R2StorageService()
    return LocalStorageService()
