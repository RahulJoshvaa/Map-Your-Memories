"""
One-off: copy media saved on local disk (UPLOAD_DIR) into the configured cloud
storage (STORAGE_BACKEND=cloudinary or r2) and update media.file_path.

Run from backend/ after filling in the storage keys in .env and setting STORAGE_BACKEND:
    venv\\Scripts\\python -m scripts.migrate_uploads
Then restart the API. Local files are not deleted.
"""
from pathlib import Path

from fastapi import UploadFile
from starlette.datastructures import Headers

from app.config import settings
from app.database.database import SessionLocal
from app.database import models  # noqa: F401
from app.database.models.media import Media
from app.services.storage_service import LocalStorageService, get_storage_service


def main():
    storage = get_storage_service()
    if isinstance(storage, LocalStorageService):
        raise SystemExit("Set STORAGE_BACKEND=cloudinary or r2 in .env first.")

    base_dir = Path(settings.UPLOAD_DIR).resolve()
    db = SessionLocal()
    moved = skipped = 0
    try:
        for media in db.query(Media).all():
            relative = Path(media.file_path.replace("\\", "/"))
            local = base_dir / relative
            if not local.is_file():
                skipped += 1  # already migrated, or file missing
                continue
            with open(local, "rb") as f:
                upload = UploadFile(
                    file=f, filename=media.file_name,
                    headers=Headers({"content-type": media.mime_type}),
                )
                _, media.file_path = storage.save_file(upload, relative.parts[0])
            db.commit()  # per file, so a failure halfway keeps what was done
            moved += 1
            print(f"uploaded {relative}")
    finally:
        db.close()
    print(f"done: {moved} uploaded, {skipped} skipped")


if __name__ == "__main__":
    main()
