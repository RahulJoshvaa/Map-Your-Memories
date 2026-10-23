"""
AI search service: natural-language query -> validated filters -> SQL,
plus semantic search over the content of uploaded documents and audio.

Privacy: the query only ever runs against pins the user owns or is an accepted
collaborator on (same rule as the rest of the pin API). Only the query text is
sent to the LLM; pin data never leaves the backend, and content search is
restricted to the ids of those same pins.
"""
import uuid
from datetime import datetime, time, timedelta
from typing import Dict, List, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.ai import content as content_index
from app.ai.search import SearchFilters, parse_query
from app.database.models.collaborator import PinCollaborator
from app.database.models.media import Media
from app.database.models.memory_pin import MemoryPin
from app.database.models.user import User
from app.services.pin_service import _has_access, _normalize_pin_response

MAX_RESULTS = 100
MAX_CONTENT_MATCHES = 20
SNIPPET_CHARS = 240


def search(query: str, user: User, db: Session) -> Tuple[SearchFilters, str, List[MemoryPin], List[Dict]]:
    """
    Returns (filters, source, pins, content_matches).
    pins = metadata matches first, then pins found only through file content.
    """
    filters, source = parse_query(query)
    pins = find_pins(filters, user, db)
    matches = find_content_matches(query, filters, user, db)

    found = {p.id for p in pins}
    extra_ids = [m["pin_id"] for m in matches if m["pin_id"] not in found]
    if extra_ids:
        by_id = {p.id: p for p in _load_pins(db, extra_ids, user)}
        pins += [by_id[i] for i in dict.fromkeys(extra_ids) if i in by_id]
    return filters, source, pins[:MAX_RESULTS], matches


def find_content_matches(query: str, filters: SearchFilters, user: User, db: Session) -> List[Dict]:
    """
    Semantic search over indexed file content. Runs when the query has topic
    keywords; dates, places, media types and scope still narrow which pins count.
    Returns the best-scoring chunk per file.
    """
    if not filters.keywords:
        return []
    narrowed = filters.model_copy(update={"keywords": []})
    pin_ids = [row[0] for row in _filtered_query(narrowed, user, db).with_entities(MemoryPin.id).distinct()]
    hits = content_index.search_content(query, pin_ids, file_types=filters.media_types or None)

    best = {}
    for hit in hits:  # sorted by score, so the first hit per file is its best
        best.setdefault(hit.media_id, hit)
    return [
        {
            "pin_id": uuid.UUID(h.pin_id), "media_id": uuid.UUID(h.media_id),
            "file_name": h.file_name, "file_type": h.file_type,
            "snippet": _snippet(h.text, filters.keywords), "score": round(h.score, 3),
        }
        for h in list(best.values())[:MAX_CONTENT_MATCHES]
    ]


def find_pins(filters: SearchFilters, user: User, db: Session) -> List[MemoryPin]:
    q = _filtered_query(filters, user, db).options(*_pin_load_options())
    pins = q.distinct().order_by(MemoryPin.created_at.desc()).limit(MAX_RESULTS).all()
    return [_normalize_pin_response(p, user) for p in pins]


def _load_pins(db: Session, pin_ids, user: User) -> List[MemoryPin]:
    pins = db.query(MemoryPin).options(*_pin_load_options()).filter(MemoryPin.id.in_(pin_ids)).all()
    return [_normalize_pin_response(p, user) for p in pins]


def _pin_load_options():
    return (
        joinedload(MemoryPin.media),
        joinedload(MemoryPin.owner),
        joinedload(MemoryPin.collaborators).joinedload(PinCollaborator.user),
    )


def _filtered_query(filters: SearchFilters, user: User, db: Session):
    """Pins the user can access that match the filters (no eager loading or limit)."""
    q = (
        db.query(MemoryPin)
        .outerjoin(PinCollaborator, MemoryPin.id == PinCollaborator.pin_id)
        .filter(_has_access(user))
    )

    if filters.scope == "owned":
        q = q.filter(MemoryPin.owner_id == user.id)
    elif filters.scope == "shared":
        q = q.filter(MemoryPin.owner_id != user.id)

    if filters.date_from or filters.date_to:
        q = q.filter(_date_clause(filters))

    if filters.locations:
        q = q.filter(or_(*[
            or_(_contains(MemoryPin.location_name, loc), _contains(MemoryPin.title, loc))
            for loc in filters.locations
        ]))

    if filters.keywords:
        q = q.filter(or_(*[
            or_(
                _contains(MemoryPin.title, kw),
                _contains(MemoryPin.description, kw),
                _contains(MemoryPin.tags, kw),
                _contains(MemoryPin.location_name, kw),
            )
            for kw in filters.keywords
        ]))

    if filters.media_types:
        q = q.filter(MemoryPin.media.any(Media.file_type.in_(filters.media_types)))
    return q


def _snippet(text: str, keywords: List[str]) -> str:
    """A window of the chunk around the first keyword it contains, else its start."""
    if len(text) <= SNIPPET_CHARS:
        return text
    lower = text.lower()
    positions = [lower.find(k.lower()) for k in keywords if k.lower() in lower]
    start = max(0, min(positions) - SNIPPET_CHARS // 3) if positions else 0
    end = start + SNIPPET_CHARS
    return ("…" if start else "") + text[start:end].strip() + ("…" if end < len(text) else "")


def _date_clause(filters: SearchFilters):
    """
    Match on the memory's event_date (stored as "YYYY-MM-DD" text, so string
    comparison is date order). Pins without an event date fall back to created_at.
    """
    event_day = func.substr(MemoryPin.event_date, 1, 10)
    has_event_date = and_(MemoryPin.event_date.isnot(None), MemoryPin.event_date != "")

    event_conds, created_conds = [has_event_date], [~has_event_date]
    if filters.date_from:
        event_conds.append(event_day >= filters.date_from.isoformat())
        created_conds.append(MemoryPin.created_at >= datetime.combine(filters.date_from, time.min))
    if filters.date_to:
        event_conds.append(event_day <= filters.date_to.isoformat())
        created_conds.append(
            MemoryPin.created_at < datetime.combine(filters.date_to + timedelta(days=1), time.min)
        )
    return or_(and_(*event_conds), and_(*created_conds))


def _contains(column, term: str):
    """Case-insensitive substring match that treats % and _ in the term literally."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.ilike(f"%{escaped}%", escape="\\")
