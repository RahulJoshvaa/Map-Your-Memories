"""
Tests for AI natural-language search: parser, filter validation, SQL filtering,
authentication and privacy. Groq is mocked so tests run offline.
"""
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.database import models  # noqa: F401
from app.database.models.media import Media
from app.ai.search import groq_client
from app.ai.search.filters import SearchFilters
from app.ai.search.query_parser import parse_query, parse_with_rules

TODAY = date(2026, 10, 15)

engine = create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client():
    """Own in-memory database; restores the previous override afterwards."""
    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)
    if previous:
        app.dependency_overrides[get_db] = previous
    else:
        app.dependency_overrides.pop(get_db, None)


def _register(client, name, email):
    res = client.post("/api/auth/register", json={
        "name": name, "email": email, "password": "Password123!", "confirm_password": "Password123!",
    })
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _pin(client, headers, title, event_date, location="Somewhere", tags=""):
    res = client.post("/api/pins", headers=headers, json={
        "title": title, "latitude": 10, "longitude": 10,
        "location_name": location, "event_date": event_date, "tags": tags,
    })
    assert res.status_code == 201
    return res.json()["id"]


@pytest.fixture(scope="module")
def users(client):
    carol = _register(client, "Carol", "carol@example.com")
    dave = _register(client, "Dave", "dave@example.com")
    ids = {
        "oct19": _pin(client, carol, "Lake walk", "2025-10-19", "Ooty"),
        "oct20": _pin(client, carol, "Tea garden", "2025-10-20", "Ooty", tags="nature"),
        "oct25": _pin(client, carol, "Beach day", "2025-10-25", "Baga Beach, Goa"),
        "dave_oct19": _pin(client, dave, "Dave's secret", "2025-10-19", "Ooty"),
    }
    # Attach a video to the beach pin directly (upload path is covered elsewhere).
    db = SessionLocal()
    db.add(Media(pin_id=uuid.UUID(ids["oct25"]), file_name="waves.mp4",
                 file_path="x/waves.mp4", file_type="video", mime_type="video/mp4", file_size=1))
    db.commit()
    db.close()
    return {"carol": carol, "dave": dave, "ids": ids}


def _mock_groq(monkeypatch, response):
    monkeypatch.setattr(groq_client, "is_configured", lambda: True)
    monkeypatch.setattr(groq_client, "chat_json", lambda system, user: dict(response))


def _no_groq(monkeypatch):
    monkeypatch.setattr(groq_client, "is_configured", lambda: False)


# ─── Parser & validation ─────────────────────────────────────────────────────

def test_rules_parse_day_month_range_assumes_past_year():
    f = parse_with_rules("Show me memories from 19 October to 20 October", TODAY)
    assert (f.date_from, f.date_to) == (date(2025, 10, 19), date(2025, 10, 20))
    assert f.keywords == []


def test_rules_parse_media_scope_and_keywords():
    f = parse_with_rules("beach videos shared with me", TODAY)
    assert f.media_types == ["video"]
    assert f.scope == "shared"
    assert f.keywords == ["beach"]


def test_filters_reject_bad_llm_output():
    f = SearchFilters.model_validate({
        "date_from": "2025-10-20", "date_to": "2025-10-19",  # reversed
        "media_types": ["photos", "hologram"], "scope": "everyone", "keywords": ["  a  ", "A", ""],
    })
    assert (f.date_from, f.date_to) == (date(2025, 10, 19), date(2025, 10, 20))
    assert f.media_types == ["image"]
    assert f.scope == "all"
    assert f.keywords == ["a"]


def test_groq_year_not_specified_shifts_to_past(monkeypatch):
    _mock_groq(monkeypatch, {"date_from": "2026-10-19", "date_to": "2026-10-20", "year_specified": False})
    f, source = parse_query("19 Oct to 20 Oct", TODAY)
    assert source == "groq"
    assert f.date_from == date(2025, 10, 19)


def test_invalid_groq_output_falls_back(monkeypatch):
    _mock_groq(monkeypatch, {"date_from": "not a date"})
    f, source = parse_query("memories from 19 October", TODAY)
    assert source == "fallback"
    assert f.date_from == date(2025, 10, 19)


# ─── Endpoint ────────────────────────────────────────────────────────────────

def test_requires_authentication(client):
    assert client.post("/api/search/ai", json={"query": "anything"}).status_code == 401


def test_rejects_empty_query(client, users):
    res = client.post("/api/search/ai", headers=users["carol"], json={"query": "   "})
    assert res.status_code == 422


def test_date_range_returns_only_own_matching_pins(client, users, monkeypatch):
    _mock_groq(monkeypatch, {"date_from": "2025-10-19", "date_to": "2025-10-20", "year_specified": True})
    res = client.post("/api/search/ai", headers=users["carol"],
                      json={"query": "Show me memories from 19 October to 20 October"})
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "groq"
    found = {p["id"] for p in data["pins"]}
    assert found == {users["ids"]["oct19"], users["ids"]["oct20"]}
    # Privacy: Dave's pin on the same date is never returned to Carol.
    assert users["ids"]["dave_oct19"] not in found


def test_location_and_media_filters(client, users, monkeypatch):
    _mock_groq(monkeypatch, {"locations": ["Goa"], "media_types": ["video"]})
    res = client.post("/api/search/ai", headers=users["carol"], json={"query": "videos in Goa"})
    assert [p["id"] for p in res.json()["pins"]] == [users["ids"]["oct25"]]


def test_keyword_matches_tags(client, users, monkeypatch):
    _mock_groq(monkeypatch, {"keywords": ["nature"]})
    res = client.post("/api/search/ai", headers=users["carol"], json={"query": "nature"})
    assert [p["id"] for p in res.json()["pins"]] == [users["ids"]["oct20"]]


def test_wildcards_are_literal(client, users, monkeypatch):
    _mock_groq(monkeypatch, {"keywords": ["%"]})
    res = client.post("/api/search/ai", headers=users["carol"], json={"query": "%"})
    assert res.json()["total"] == 0


def test_works_without_groq(client, users, monkeypatch):
    _no_groq(monkeypatch)
    res = client.post("/api/search/ai", headers=users["dave"], json={"query": "memories from 19 October 2025"})
    data = res.json()
    assert data["source"] == "fallback"
    assert [p["id"] for p in data["pins"]] == [users["ids"]["dave_oct19"]]
