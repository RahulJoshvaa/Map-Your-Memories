"""
Tests for content search: text extraction, chunking, indexing on upload,
search through /api/search/ai, privacy and cleanup on delete.
Uses the in-memory vector DB and fake embedder from conftest.py; Groq is mocked.
"""
import io
import zipfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.config import settings
from app.database.database import Base, get_db
from app.database import models  # noqa: F401
from app.ai.content.chunking import chunk_text
from app.ai.content.extract import DOCX_MIME, extract_text
from app.ai.search import groq_client
from app.services.storage_service import LocalStorageService, get_storage_service

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

BUDGET = "Goa trip budget: hotel 4000 rupees, flights 6500 rupees, food 2000 rupees."
LAB = "Lab exercise six: implement a linked list in C with insert and delete."


def _override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client(tmp_path_factory, monkeypatch_module):
    monkeypatch_module.setattr(settings, "UPLOAD_DIR", str(tmp_path_factory.mktemp("uploads")))
    monkeypatch_module.setattr(settings, "CONTENT_MIN_SCORE", 0.3)
    overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_storage_service] = LocalStorageService
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    app.dependency_overrides.update(overrides)


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


@pytest.fixture(autouse=True)
def no_groq(monkeypatch):
    """Rule-based parser: keywords come straight from the query words."""
    monkeypatch.setattr(groq_client, "is_configured", lambda: False)


def _register(client, name, email):
    res = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": "Password123!", "confirm_password": "Password123!",
    })
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _pin(client, headers, title):
    res = client.post("/api/pins", headers=headers, json={"title": title, "latitude": 1, "longitude": 1})
    assert res.status_code == 201
    return res.json()["id"]


def _upload(client, headers, pin_id, name, data, mime):
    res = client.post(f"/api/pins/{pin_id}/media", headers=headers, files={"file": (name, data, mime)})
    assert res.status_code == 201
    return res.json()["id"]


def _search(client, headers, query):
    res = client.post("/api/search/ai", headers=headers, json={"query": query})
    assert res.status_code == 200
    return res.json()


def _docx(text):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>'
        ))
    return buf.getvalue()


# ─── Extraction & chunking ───────────────────────────────────────────────────

def test_extracts_docx_and_text():
    assert extract_text(_docx(LAB), DOCX_MIME, "lab.docx") == LAB
    assert extract_text(b"  hello\n\nworld ", "text/plain", "a.txt") == "hello world"
    assert extract_text(b"\x89PNG", "image/png", "a.png") == ""


def test_audio_is_transcribed(monkeypatch):
    monkeypatch.setattr(groq_client, "is_configured", lambda: True)
    monkeypatch.setattr(groq_client, "transcribe", lambda content, name, mime: "we reached the summit")
    assert extract_text(b"ID3", "audio/mpeg", "a.mp3") == "we reached the summit"


def test_chunks_overlap_and_respect_size():
    text = " ".join(f"word{i}" for i in range(500))
    chunks = chunk_text(text, size=200, overlap=40)
    assert len(chunks) > 1 and all(len(c) <= 200 for c in chunks)
    assert chunks[0].split()[-1] in chunks[1].split()[:8]  # tail carried over


# ─── Upload -> index -> search ───────────────────────────────────────────────

@pytest.fixture(scope="module")
def data(client):
    erin = _register(client, "Erin", "erin@example.com")
    frank = _register(client, "Frank", "frank@example.com")
    trip = _pin(client, erin, "Weekend away")
    college = _pin(client, erin, "College")
    franks = _pin(client, frank, "Frank's trip")
    return {
        "erin": erin, "frank": frank, "trip": trip, "college": college, "franks": franks,
        "budget_media": _upload(client, erin, trip, "budget.txt", BUDGET.encode(), "text/plain"),
        "lab_media": _upload(client, erin, college, "lab.docx", _docx(LAB), DOCX_MIME),
        "frank_media": _upload(client, frank, franks, "frank.txt", BUDGET.encode(), "text/plain"),
    }


def test_content_match_finds_pin_by_file_text(client, data):
    res = _search(client, data["erin"], "hotel flights budget")
    assert [p["id"] for p in res["pins"]] == [data["trip"]]  # title "Weekend away" alone wouldn't match
    match = res["content_matches"][0]
    assert match["media_id"] == data["budget_media"] and match["file_name"] == "budget.txt"
    assert "hotel" in match["snippet"]


def test_docx_content_is_searchable(client, data):
    res = _search(client, data["erin"], "linked list insert")
    assert [p["id"] for p in res["pins"]] == [data["college"]]


def test_other_users_files_are_never_matched(client, data):
    res = _search(client, data["erin"], "hotel flights budget")
    assert data["franks"] not in {p["id"] for p in res["pins"]}
    assert data["frank_media"] not in {m["media_id"] for m in res["content_matches"]}


def test_media_type_filter_applies_to_content(client, data):
    res = _search(client, data["erin"], "hotel flights budget videos")
    assert res["content_matches"] == []


def test_query_without_keywords_skips_content_search(client, data):
    assert _search(client, data["erin"], "memories from yesterday")["content_matches"] == []


def test_deleting_media_removes_it_from_the_index(client, data):
    assert client.delete(f"/api/media/{data['lab_media']}", headers=data["erin"]).status_code == 204
    assert _search(client, data["erin"], "linked list insert")["content_matches"] == []


def test_deleting_pin_removes_its_chunks(client, data, fake_content_index):
    assert client.delete(f"/api/pins/{data['franks']}", headers=data["frank"]).status_code == 204
    hits = fake_content_index.store.search(
        fake_content_index.embedder.embed_query(BUDGET), [data["franks"]], 10, 0.0,
    )
    assert hits == []
