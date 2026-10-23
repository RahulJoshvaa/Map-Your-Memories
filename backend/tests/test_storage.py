"""
Tests for the storage backends. R2 runs against a fake S3 client, so no
Cloudflare account or network is needed.
"""
import io
from urllib.parse import urlparse, parse_qs

import boto3
import pytest
from fastapi import UploadFile

from app.config import settings
from app.services import storage_service
from app.services.storage_service import LocalStorageService, R2StorageService


class FakeS3:
    def __init__(self):
        self.objects = {}

    def upload_fileobj(self, fileobj, bucket, key, ExtraArgs=None):
        self.objects[(bucket, key)] = (fileobj.read(), ExtraArgs["ContentType"])

    def delete_object(self, Bucket, Key):
        self.objects.pop((Bucket, Key), None)


def _upload(name="beach.JPG", content_type="image/jpeg", data=b"pixels"):
    return UploadFile(file=io.BytesIO(data), filename=name, headers={"content-type": content_type})


@pytest.fixture
def r2(monkeypatch):
    monkeypatch.setattr(settings, "R2_BUCKET", "memories")
    monkeypatch.setattr(settings, "R2_PUBLIC_URL", "")
    return R2StorageService(client=FakeS3())


def test_r2_save_uses_subfolder_key_and_content_type(r2):
    name, key = r2.save_file(_upload(), "images")
    assert key == f"images/{name}" and name.endswith(".jpg")
    assert r2.client.objects[("memories", key)] == (b"pixels", "image/jpeg")


def test_r2_delete(r2):
    _, key = r2.save_file(_upload(), "images")
    assert r2.delete_file(key) is True
    assert r2.client.objects == {}


def test_r2_public_url(r2, monkeypatch):
    r2.public_url = "https://media.example.com"
    assert r2.get_file_url("images/a.jpg") == "https://media.example.com/images/a.jpg"


def test_r2_private_bucket_gives_presigned_url(monkeypatch):
    monkeypatch.setattr(settings, "R2_BUCKET", "memories")
    monkeypatch.setattr(settings, "R2_PUBLIC_URL", "")
    client = boto3.client(
        "s3", endpoint_url="https://acct.r2.cloudflarestorage.com", region_name="auto",
        aws_access_key_id="id", aws_secret_access_key="secret",
    )
    url = R2StorageService(client=client).get_file_url("images/a.jpg")
    parsed = urlparse(url)
    assert parsed.netloc.endswith("r2.cloudflarestorage.com")
    assert parsed.path.endswith("/images/a.jpg")
    assert parse_qs(parsed.query)["X-Amz-Expires"] == [str(settings.R2_URL_EXPIRE_SECONDS)]


def test_r2_missing_credentials_fail_clearly(monkeypatch):
    for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"):
        monkeypatch.setattr(settings, name, "")
    with pytest.raises(RuntimeError, match="R2_ACCOUNT_ID"):
        R2StorageService()


def test_factory_picks_backend(monkeypatch):
    storage_service.get_storage_service.cache_clear()
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "local")
    try:
        assert isinstance(storage_service.get_storage_service(), LocalStorageService)
    finally:
        storage_service.get_storage_service.cache_clear()


def test_local_url_uses_forward_slashes(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    assert LocalStorageService().get_file_url("images\\a.jpg") == "/uploads/images/a.jpg"


# ─── Cloudinary ──────────────────────────────────────────────────────────────

from app.services.storage_service import CloudinaryStorageService
import cloudinary.uploader


@pytest.fixture
def cld(monkeypatch):
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "123")
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "secret")
    monkeypatch.setattr(settings, "CLOUDINARY_FOLDER", "mym")
    calls = {}

    def upload(file, **kw):
        calls["upload"] = kw
        fmt = None if kw["resource_type"] == "raw" else "jpg"
        return {"public_id": kw["public_id"], "format": fmt}

    def destroy(public_id, **kw):
        calls["destroy"] = (public_id, kw)
        return {"result": "ok"}

    monkeypatch.setattr(cloudinary.uploader, "upload", upload)
    monkeypatch.setattr(cloudinary.uploader, "destroy", destroy)
    return CloudinaryStorageService(), calls


def test_cloudinary_image_upload_is_authenticated(cld):
    storage, calls = cld
    name, path = storage.save_file(_upload(), "images")
    stem = name.rsplit(".", 1)[0]
    assert path == f"image/mym/images/{stem}.jpg"
    assert calls["upload"]["type"] == "authenticated"
    assert calls["upload"]["resource_type"] == "image"


def test_cloudinary_audio_is_video_and_documents_are_raw(cld):
    storage, calls = cld
    storage.save_file(_upload("song.mp3", "audio/mpeg"), "audio")
    assert calls["upload"]["resource_type"] == "video"
    name, path = storage.save_file(_upload("notes.pdf", "application/pdf"), "documents")
    assert path == f"raw/mym/documents/{name}"  # raw keeps the extension in the public_id


def test_cloudinary_signed_url(cld):
    storage, _ = cld
    url = storage.get_file_url("image/mym/images/abc.jpg")
    assert url.startswith("https://res.cloudinary.com/demo/image/authenticated/s--")
    assert url.endswith("/mym/images/abc.jpg")


def test_cloudinary_delete(cld):
    storage, calls = cld
    assert storage.delete_file("raw/mym/documents/a.pdf") is True
    assert calls["destroy"] == ("mym/documents/a.pdf",
                                {"resource_type": "raw", "type": "authenticated", "invalidate": True})


def test_cloudinary_missing_secret_fails_clearly(monkeypatch):
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "demo")
    monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "123")
    monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "")
    with pytest.raises(RuntimeError, match="CLOUDINARY_API_SECRET"):
        CloudinaryStorageService()
