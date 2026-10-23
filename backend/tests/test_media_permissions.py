"""
Media permissions by role:
  OWNER / ADMIN  upload anything, delete any media
  EDITOR         upload photos only, delete only media they uploaded
  VIEWER         no upload, no delete
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.config import settings
from app.database.database import Base, get_db
from app.database import models  # noqa: F401
from app.services.storage_service import LocalStorageService, get_storage_service

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

PNG = ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png")
VIDEO = ("clip.mp4", b"\x00\x00\x00\x18ftyp", "video/mp4")
DOC = ("notes.txt", b"hello", "text/plain")


def _override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    mp = pytest.MonkeyPatch()
    mp.setattr(settings, "UPLOAD_DIR", str(tmp_path_factory.mktemp("uploads")))
    overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = LocalStorageService
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    app.dependency_overrides.update(overrides)
    mp.undo()


def _register(client, name):
    res = client.post("/api/auth/register", json={
        "name": name, "email": f"{name.lower()}@example.com",
        "password": "Password123!", "confirm_password": "Password123!",
    })
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _invite(client, owner, invitee, pin_id, name, role):
    res = client.post(f"/api/pins/{pin_id}/collaborators", headers=owner,
                      json={"email": f"{name.lower()}@example.com", "role": role})
    assert res.status_code == 201
    assert client.post(f"/api/pins/{pin_id}/invitation/accept", headers=invitee).status_code == 200


def _upload(client, headers, pin_id, file):
    return client.post(f"/api/pins/{pin_id}/media", headers=headers, files={"file": file})


@pytest.fixture(scope="module")
def team(client):
    users = {name: _register(client, name) for name in ("Olivia", "Adam", "Ella", "Eddie", "Vera", "Stranger")}
    pin_id = client.post("/api/pins", headers=users["Olivia"],
                         json={"title": "Team trip", "latitude": 1, "longitude": 1}).json()["id"]
    _invite(client, users["Olivia"], users["Adam"], pin_id, "Adam", "Admin")
    _invite(client, users["Olivia"], users["Ella"], pin_id, "Ella", "Editor")
    _invite(client, users["Olivia"], users["Eddie"], pin_id, "Eddie", "Editor")
    _invite(client, users["Olivia"], users["Vera"], pin_id, "Vera", "Viewer")
    return users, pin_id


def test_editor_can_upload_photos(client, team):
    users, pin_id = team
    assert _upload(client, users["Ella"], pin_id, PNG).status_code == 201


@pytest.mark.parametrize("file", [VIDEO, DOC], ids=["video", "document"])
def test_editor_cannot_upload_other_types(client, team, file):
    users, pin_id = team
    res = _upload(client, users["Ella"], pin_id, file)
    assert res.status_code == 403
    assert res.json()["detail"] == "Editors can only upload photos"


def test_viewer_cannot_upload(client, team):
    users, pin_id = team
    assert _upload(client, users["Vera"], pin_id, PNG).status_code == 403


def test_owner_and_admin_can_upload_any_type(client, team):
    users, pin_id = team
    assert _upload(client, users["Olivia"], pin_id, VIDEO).status_code == 201
    assert _upload(client, users["Adam"], pin_id, DOC).status_code == 201


def test_editor_deletes_own_photo_only(client, team):
    users, pin_id = team
    mine = _upload(client, users["Ella"], pin_id, PNG).json()["id"]
    theirs = _upload(client, users["Eddie"], pin_id, PNG).json()["id"]
    owners = _upload(client, users["Olivia"], pin_id, PNG).json()["id"]

    res = client.delete(f"/api/media/{theirs}", headers=users["Ella"])
    assert res.status_code == 403
    assert res.json()["detail"] == "You can only delete media you uploaded"
    assert client.delete(f"/api/media/{owners}", headers=users["Ella"]).status_code == 403
    assert client.delete(f"/api/media/{mine}", headers=users["Ella"]).status_code == 204


def test_viewer_cannot_delete(client, team):
    users, pin_id = team
    media_id = _upload(client, users["Olivia"], pin_id, PNG).json()["id"]
    assert client.delete(f"/api/media/{media_id}", headers=users["Vera"]).status_code == 403


def test_owner_and_admin_delete_anyones_media(client, team):
    users, pin_id = team
    a = _upload(client, users["Ella"], pin_id, PNG).json()["id"]
    b = _upload(client, users["Eddie"], pin_id, PNG).json()["id"]
    assert client.delete(f"/api/media/{a}", headers=users["Olivia"]).status_code == 204
    assert client.delete(f"/api/media/{b}", headers=users["Adam"]).status_code == 204


def test_non_member_gets_404(client, team):
    users, pin_id = team
    media_id = _upload(client, users["Olivia"], pin_id, PNG).json()["id"]
    assert _upload(client, users["Stranger"], pin_id, PNG).status_code == 404
    assert client.delete(f"/api/media/{media_id}", headers=users["Stranger"]).status_code == 404
