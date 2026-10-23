"""
One-off: add media uploaded before content search existed to the vector DB.
Files are read from local disk or downloaded from cloud storage (signed URL).

Run from backend/ while the API is stopped (local Qdrant allows one process):
    venv\\Scripts\\python -m scripts.index_media
Re-running is safe: each file's chunks are replaced, not duplicated.
"""
from pathlib import Path

import httpx

from app.ai import content as content_index
from app.config import settings
from app.database.database import SessionLocal
from app.database import models  # noqa: F401
from app.database.models.media import Media
from app.services.storage_service import get_storage_service


def read_bytes(file_path: str) -> bytes:
    url = get_storage_service().get_file_url(file_path)
    if url.startswith("http"):
        response = httpx.get(url, timeout=60, follow_redirects=True)
        response.raise_for_status()
        return response.content
    return (Path(settings.UPLOAD_DIR).resolve() / file_path.replace("\\", "/")).read_bytes()


def main():
    db = SessionLocal()
    indexed = skipped = 0
    try:
        for media in db.query(Media).all():
            if not content_index.should_index(media.mime_type):
                skipped += 1
                continue
            chunks = content_index.index_media(
                media.id, media.pin_id, media.file_name, media.file_type, media.mime_type,
                read_bytes(media.file_path),
            )
            indexed += 1
            print(f"{media.file_name}: {chunks} chunk(s)")
    finally:
        db.close()
    print(f"done: {indexed} indexed, {skipped} skipped (images/videos have no text to index)")


if __name__ == "__main__":
    main()
