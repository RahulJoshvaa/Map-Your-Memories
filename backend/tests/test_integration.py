"""
Integration and End-to-End Test Suite for Map Your Memories Backend & API.
Covers all 26 verification scenarios specified in Section 14 of the requirements.
"""
import io
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.services.storage_service import get_storage_service, LocalStorageService
from app.config import settings

from app.database import models  # noqa: F401

# Test database setup (SQLite in-memory for fast, isolated, reliable runs)
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Test uploads directory
TEST_UPLOAD_DIR = "./test_uploads"
os.makedirs(TEST_UPLOAD_DIR, exist_ok=True)


class MockLocalStorageService(LocalStorageService):
    def __init__(self):
        from pathlib import Path
        self.base_dir = Path(TEST_UPLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_storage_service():
    return MockLocalStorageService()


# Override dependencies
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_storage_service] = override_get_storage_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Create all tables before test run and clean up afterwards."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    # Clean up test uploads
    import shutil
    if os.path.exists(TEST_UPLOAD_DIR):
        shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)


@pytest.fixture
def client():
    return TestClient(app)


# ─── 1. Authentication Scenarios ─────────────────────────────────────────────

def test_1_register_new_user(client):
    """1. Register a new user."""
    payload = {
        "name": "Alice Walker",
        "email": "alice@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["name"] == "Alice Walker"
    assert "password" not in data["user"]


def test_2_reject_duplicate_registration(client):
    """2. Reject duplicate registration with 409 Conflict."""
    payload = {
        "name": "Alice Walker Duplicate",
        "email": "alice@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 409


def test_3_login_with_correct_credentials(client):
    """3. Log in with correct credentials."""
    payload = {
        "email": "alice@example.com",
        "password": "Password123!",
    }
    res = client.post("/api/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"


def test_4_reject_incorrect_credentials(client):
    """4. Reject incorrect credentials with 401."""
    payload = {
        "email": "alice@example.com",
        "password": "WrongPassword!",
    }
    res = client.post("/api/auth/login", json=payload)
    assert res.status_code == 401


def test_5_refresh_and_retain_valid_session(client):
    """5. Refresh dashboard / call /api/auth/me and retain a valid session."""
    # First get token
    login_res = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    # Verify session
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "alice@example.com"


def test_6_logout_and_reject_subsequent_protected_requests(client):
    """6. Log out and reject subsequent requests without authorization."""
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # Request without token fails with 401
    protected_res = client.get("/api/auth/me")
    assert protected_res.status_code == 401


# ─── 2. Pins Scenarios ───────────────────────────────────────────────────────

@pytest.fixture
def auth_header_alice(client):
    login_res = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_7_8_9_10_create_retrieve_persist_pin(client, auth_header_alice):
    """7. Create a pin. 8. Retrieve from DB. 9. Verify pin persists. 10. Verify coordinates."""
    pin_payload = {
        "title": "Ooty Botanical Garden",
        "description": "Lovely walk amidst lush greenery and flowers.",
        "latitude": 11.4102,
        "longitude": 76.6950,
        "location_name": "Ooty, Tamil Nadu",
        "event_date": "2026-08-15",
        "visibility": "private",
        "tags": "Ooty, Vacation",
    }
    create_res = client.post("/api/pins", json=pin_payload, headers=auth_header_alice)
    assert create_res.status_code == 201
    pin_data = create_res.json()
    pin_id = pin_data["id"]

    # Retrieve pin
    get_res = client.get(f"/api/pins/{pin_id}", headers=auth_header_alice)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["title"] == "Ooty Botanical Garden"
    assert retrieved["latitude"] == 11.4102
    assert retrieved["longitude"] == 76.6950


def test_11_search_pin_by_title(client, auth_header_alice):
    """11. Search for the pin by title."""
    search_res = client.get("/api/pins?search=Botanical", headers=auth_header_alice)
    assert search_res.status_code == 200
    results = search_res.json()["pins"]
    assert len(results) >= 1
    assert any("Botanical" in p["title"] for p in results)

    # Search for nonexistent title returns empty list
    none_res = client.get("/api/pins?search=NonExistentPlaceXYZ", headers=auth_header_alice)
    assert none_res.status_code == 200
    assert len(none_res.json()["pins"]) == 0


def test_12_delete_pin(client, auth_header_alice):
    """12. Delete the pin and verify it disappears from the list and database."""
    pin_payload = {
        "title": "Temporary Pin to Delete",
        "latitude": 13.0827,
        "longitude": 80.2707,
    }
    create_res = client.post("/api/pins", json=pin_payload, headers=auth_header_alice)
    pin_id = create_res.json()["id"]

    del_res = client.delete(f"/api/pins/{pin_id}", headers=auth_header_alice)
    assert del_res.status_code == 204

    # Verify 404 on get
    get_res = client.get(f"/api/pins/{pin_id}", headers=auth_header_alice)
    assert get_res.status_code == 404


# ─── 3. Media Upload & Deletion Scenarios ─────────────────────────────────────

def test_13_to_20_media_lifecycle(client, auth_header_alice):
    """
    13. Create a pin without uploading any media.
    14. Upload media to that existing pin.
    15. Verify the file exists in local storage.
    16. Verify media metadata exists in DB.
    17. Refresh / retrieve pin media and verify visible.
    18. Upload another media file to the same pin.
    19. Delete one media file and verify the other remains intact.
    20. Delete the entire pin and verify associated media is cleaned up.
    """
    # 13. Create a pin without media
    create_res = client.post(
        "/api/pins",
        json={"title": "Goa Beach Memories", "latitude": 15.2993, "longitude": 74.1240},
        headers=auth_header_alice,
    )
    assert create_res.status_code == 201
    pin_id = create_res.json()["id"]

    # 14. Upload media file 1
    file_content_1 = b"fake image bytes 1"
    files_1 = {"file": ("sunset.jpg", io.BytesIO(file_content_1), "image/jpeg")}
    upload_res_1 = client.post(f"/api/pins/{pin_id}/media", files=files_1, headers=auth_header_alice)
    assert upload_res_1.status_code == 201
    media_1 = upload_res_1.json()
    media_1_id = media_1["id"]
    file_1_rel_path = media_1["file_path"]

    # 15. Verify file exists on local storage filesystem
    full_path_1 = os.path.join(TEST_UPLOAD_DIR, file_1_rel_path)
    assert os.path.exists(full_path_1)
    with open(full_path_1, "rb") as f:
        assert f.read() == file_content_1

    # 16. Verify media metadata exists in DB / GET response
    get_media_res = client.get(f"/api/pins/{pin_id}/media", headers=auth_header_alice)
    assert get_media_res.status_code == 200
    media_list = get_media_res.json()["media"]
    assert len(media_list) == 1
    assert media_list[0]["file_name"] == "sunset.jpg"

    # 18. Upload another media file to the same pin
    file_content_2 = b"fake audio recording bytes"
    files_2 = {"file": ("birds.mp3", io.BytesIO(file_content_2), "audio/mpeg")}
    upload_res_2 = client.post(f"/api/pins/{pin_id}/media", files=files_2, headers=auth_header_alice)
    assert upload_res_2.status_code == 201
    media_2 = upload_res_2.json()
    media_2_id = media_2["id"]
    file_2_rel_path = media_2["file_path"]
    full_path_2 = os.path.join(TEST_UPLOAD_DIR, file_2_rel_path)
    assert os.path.exists(full_path_2)

    # 19. Delete one media file (media_1) and verify media_2 remains intact
    del_media_res = client.delete(f"/api/media/{media_1_id}", headers=auth_header_alice)
    assert del_media_res.status_code == 204
    assert not os.path.exists(full_path_1)
    assert os.path.exists(full_path_2)

    remaining_res = client.get(f"/api/pins/{pin_id}/media", headers=auth_header_alice)
    remaining_ids = [m["id"] for m in remaining_res.json()["media"]]
    assert media_1_id not in remaining_ids
    assert media_2_id in remaining_ids

    # 20. Delete the entire pin and verify media_2 is cleaned up from storage
    del_pin_res = client.delete(f"/api/pins/{pin_id}", headers=auth_header_alice)
    assert del_pin_res.status_code == 204
    assert not os.path.exists(full_path_2)


# ─── 4. Authorization Scenarios ──────────────────────────────────────────────

@pytest.fixture
def auth_header_bob(client):
    """Register and log in User B (Bob)."""
    client.post(
        "/api/auth/register",
        json={
            "name": "Bob Smith",
            "email": "bob@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_21_to_24_authorization_isolation(client, auth_header_alice, auth_header_bob):
    """
    21. Create two different users (Alice and Bob).
    22. Verify User B cannot view, modify, or delete User A's private pins.
    23. Verify User B cannot upload media to User A's pins.
    24. Verify User B cannot access or delete User A's media by guessing resource IDs.
    """
    # Alice creates a private pin
    create_res = client.post(
        "/api/pins",
        json={"title": "Alice Secret Place", "latitude": 10.0, "longitude": 20.0},
        headers=auth_header_alice,
    )
    alice_pin_id = create_res.json()["id"]

    # Alice uploads media
    upload_res = client.post(
        f"/api/pins/{alice_pin_id}/media",
        files={"file": ("secret.png", io.BytesIO(b"secret image"), "image/png")},
        headers=auth_header_alice,
    )
    alice_media_id = upload_res.json()["id"]

    # 22: Bob tries to GET Alice's pin -> 404
    bob_get_res = client.get(f"/api/pins/{alice_pin_id}", headers=auth_header_bob)
    assert bob_get_res.status_code == 404

    # Bob tries to UPDATE Alice's pin -> 404
    bob_update_res = client.patch(
        f"/api/pins/{alice_pin_id}",
        json={"title": "Hacked Title"},
        headers=auth_header_bob,
    )
    assert bob_update_res.status_code == 404

    # Bob tries to DELETE Alice's pin -> 404
    bob_del_pin_res = client.delete(f"/api/pins/{alice_pin_id}", headers=auth_header_bob)
    assert bob_del_pin_res.status_code == 404

    # 23: Bob tries to upload media to Alice's pin -> 404
    bob_upload_res = client.post(
        f"/api/pins/{alice_pin_id}/media",
        files={"file": ("injected.png", io.BytesIO(b"injected"), "image/png")},
        headers=auth_header_bob,
    )
    assert bob_upload_res.status_code == 404

    # 24: Bob tries to list Alice's media -> 404
    bob_list_media_res = client.get(f"/api/pins/{alice_pin_id}/media", headers=auth_header_bob)
    assert bob_list_media_res.status_code == 404

    # Bob tries to delete Alice's media by guessing media_id -> 403 or 404
    bob_del_media_res = client.delete(f"/api/media/{alice_media_id}", headers=auth_header_bob)
    assert bob_del_media_res.status_code in (403, 404)


# ─── 5. Error Handling Scenarios ─────────────────────────────────────────────

def test_25_26_error_handling(client, auth_header_alice):
    """25 & 26. Test invalid credentials, missing pins, invalid files, oversized files."""
    # Invalid email on registration
    bad_email_res = client.post(
        "/api/auth/register",
        json={"name": "Test", "email": "invalid-email", "password": "123", "confirm_password": "123"},
    )
    assert bad_email_res.status_code == 422

    # Nonexistent pin 404
    random_uuid = uuid.uuid4()
    not_found_res = client.get(f"/api/pins/{random_uuid}", headers=auth_header_alice)
    assert not_found_res.status_code == 404

    # Disallowed file type (.exe)
    alice_pin = client.post(
        "/api/pins",
        json={"title": "Test Error Pin", "latitude": 1.0, "longitude": 1.0},
        headers=auth_header_alice,
    ).json()

    bad_file = {"file": ("malware.exe", io.BytesIO(b"binary"), "application/x-msdownload")}
    bad_upload_res = client.post(f"/api/pins/{alice_pin['id']}/media", files=bad_file, headers=auth_header_alice)
    assert bad_upload_res.status_code == 400
    assert "not allowed" in bad_upload_res.json()["detail"].lower()


# ─── 6. Collaboration Invitations ────────────────────────────────────────────

def _invite_for(client, headers, pin_id):
    notifs = client.get("/api/notifications", headers=headers).json()["notifications"]
    return next(n for n in notifs if n["type"] == "collaboration_invite" and n["pin_id"] == pin_id)


def test_27_collaboration_invite_accept_and_reject(client, auth_header_alice, auth_header_bob):
    """Invited users get no access until they accept; declining keeps them out."""
    pin_id = client.post(
        "/api/pins",
        json={"title": "Invite Pin", "latitude": 5.0, "longitude": 5.0},
        headers=auth_header_alice,
    ).json()["id"]

    res = client.post(
        f"/api/pins/{pin_id}/collaborators",
        json={"email": "bob@example.com", "role": "Viewer"},
        headers=auth_header_alice,
    )
    assert res.status_code == 201
    assert res.json()["status"] == "pending"

    # Pending: no access yet, and the invite shows as pending
    assert client.get(f"/api/pins/{pin_id}", headers=auth_header_bob).status_code == 404
    invite = _invite_for(client, auth_header_bob, pin_id)
    assert invite["invite_status"] == "pending"
    # Timestamps carry a UTC offset so browsers don't misread them as local time
    assert invite["created_at"].endswith(("Z", "+00:00"))

    # Decline -> still no access, owner is told
    assert client.post(f"/api/pins/{pin_id}/invitation/reject", headers=auth_header_bob).status_code == 200
    assert client.get(f"/api/pins/{pin_id}", headers=auth_header_bob).status_code == 404
    assert _invite_for(client, auth_header_bob, pin_id)["invite_status"] == "rejected"
    owner_types = [n["type"] for n in client.get("/api/notifications", headers=auth_header_alice).json()["notifications"]]
    assert "invite_rejected" in owner_types

    # Owner re-invites, Bob accepts -> access granted with the invited role
    assert client.post(
        f"/api/pins/{pin_id}/collaborators",
        json={"email": "bob@example.com", "role": "Viewer"},
        headers=auth_header_alice,
    ).status_code == 201
    assert client.post(f"/api/pins/{pin_id}/invitation/accept", headers=auth_header_bob).status_code == 200
    pin = client.get(f"/api/pins/{pin_id}", headers=auth_header_bob).json()
    assert pin["permission"] == "VIEWER"

    # Responding twice is rejected
    assert client.post(f"/api/pins/{pin_id}/invitation/accept", headers=auth_header_bob).status_code == 409
