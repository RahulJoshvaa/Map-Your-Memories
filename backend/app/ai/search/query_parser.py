"""
Turns a natural-language query into validated SearchFilters.

Groq is tried first; if it is not configured, times out, or returns invalid
output, a deterministic rule-based parser is used so search keeps working.
"""
import calendar
import logging
import re
from datetime import date, timedelta
from typing import Optional, Tuple

from pydantic import ValidationError

from app.ai.search import groq_client
from app.ai.search.filters import SearchFilters

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You convert a user's search over their personal "memory pins" (places on a map, \
each with a title, description, location name, tags, an event date, and attached media) into JSON filters.

Return ONLY a JSON object with exactly these keys:
{
  "date_from": "YYYY-MM-DD" or null,
  "date_to": "YYYY-MM-DD" or null,
  "year_specified": true or false,
  "locations": [place names mentioned, e.g. "Goa", "Paris"],
  "keywords": [other meaningful topic words, e.g. "beach", "birthday"],
  "media_types": any of ["image", "video", "audio", "document"],
  "scope": "all" | "owned" | "shared"
}

Rules:
- Resolve relative dates ("yesterday", "last week", "this month", "last summer") using TODAY.
- A single day sets date_from and date_to to that same day. A month or year covers its whole range.
- "year_specified" is true only if the user wrote a year or used a relative phrase; if they wrote
  only a day and month (e.g. "19 October"), use TODAY's year and set year_specified to false.
- photos/pictures -> "image", videos/clips -> "video", voice notes/recordings -> "audio", pdfs/files -> "document".
- scope is "shared" for things like "shared with me" or "from my friends", "owned" for "I created" / "my own pins",
  otherwise "all". Words like "my memories" alone mean "all".
- Do not put filler words ("show", "me", "memories", "pins", "from", "with") in keywords.
- Never invent filters the user did not ask for. Use [] or null when absent."""

MONTHS = {name.lower(): i for i, name in enumerate(calendar.month_name) if name}
MONTHS.update({name.lower(): i for i, name in enumerate(calendar.month_abbr) if name})
MONTHS["sept"] = 9
MONTH_RE = "|".join(sorted(MONTHS, key=len, reverse=True))

MEDIA_WORDS = {
    "photo": "image", "photos": "image", "picture": "image", "pictures": "image", "image": "image",
    "images": "image", "pics": "image", "selfie": "image", "selfies": "image",
    "video": "video", "videos": "video", "clip": "video", "clips": "video",
    "audio": "audio", "audios": "audio", "recording": "audio", "recordings": "audio", "voice": "audio",
    "document": "document", "documents": "document", "pdf": "document", "pdfs": "document",
}

STOPWORDS = {
    "show", "me", "my", "all", "the", "a", "an", "of", "in", "at", "on", "from", "to", "and", "or",
    "with", "between", "during", "for", "find", "get", "give", "list", "search", "memories", "memory",
    "pins", "pin", "where", "when", "that", "which", "i", "was", "were", "is", "are", "have", "had",
    "any", "some", "please", "what", "did", "go", "went", "been", "there", "until", "till", "through",
    "since", "about", "do", "does", "done", "can", "you", "us", "our", "we", "notes", "voice", "shared", "own", "created",
}


def parse_query(query: str, today: Optional[date] = None) -> Tuple[SearchFilters, str]:
    """Return (filters, source) where source is "groq" or "fallback"."""
    today = today or date.today()
    if groq_client.is_configured():
        try:
            return _parse_with_groq(query, today), "groq"
        except (groq_client.GroqError, ValidationError, ValueError) as exc:
            logger.warning("AI search fell back to rule-based parser: %s", exc)
    return parse_with_rules(query, today), "fallback"


# ─── Groq ────────────────────────────────────────────────────────────────────

def _parse_with_groq(query: str, today: date) -> SearchFilters:
    user_prompt = f"TODAY: {today.isoformat()} ({today.strftime('%A')})\nQUERY: {query}"
    raw = groq_client.chat_json(SYSTEM_PROMPT, user_prompt)

    year_specified = bool(raw.pop("year_specified", True))
    allowed = set(SearchFilters.model_fields)
    filters = SearchFilters.model_validate({k: v for k, v in raw.items() if k in allowed})

    if not year_specified:
        filters = _assume_past_year(filters, today)
    return filters


def _assume_past_year(filters: SearchFilters, today: date) -> SearchFilters:
    """Memories are past events: "19 October" said before 19 October means last year."""
    if filters.date_from and filters.date_from > today:
        filters.date_from = _shift_year(filters.date_from, -1)
        if filters.date_to:
            filters.date_to = _shift_year(filters.date_to, -1)
    return filters


def _shift_year(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year + years)
    except ValueError:  # 29 Feb
        return d.replace(year=d.year + years, day=28)


# ─── Rule-based fallback ─────────────────────────────────────────────────────

def parse_with_rules(query: str, today: date) -> SearchFilters:
    text = query.lower()
    date_from, date_to, year_given = _extract_dates(text, today)

    media = []
    for word, media_type in MEDIA_WORDS.items():
        if re.search(rf"\b{word}\b", text) and media_type not in media:
            media.append(media_type)

    scope = "all"
    if re.search(r"\bshared\b|\bfrom (my )?friends\b", text):
        scope = "shared"
    elif re.search(r"\bi (created|made|own)\b|\bmy own\b", text):
        scope = "owned"

    # Remaining words become keywords (matched against title, description, tags and location).
    stripped = re.sub(rf"\b\d{{1,2}}(st|nd|rd|th)?\b|\b\d{{4}}(-\d{{2}}-\d{{2}})?\b|\b({MONTH_RE})\b", " ", text)
    stripped = re.sub(r"\b(today|yesterday|last|this|week|month|year)\b", " ", stripped)
    words = [w for w in re.findall(r"[a-z][a-z'-]+", stripped)
             if w not in STOPWORDS and w not in MEDIA_WORDS]

    filters = SearchFilters(
        date_from=date_from, date_to=date_to, keywords=words, media_types=media, scope=scope,
    )
    return filters if year_given else _assume_past_year(filters, today)


def _extract_dates(text: str, today: date):
    """Find explicit or simple relative dates. Returns (from, to, year_given)."""
    if re.search(r"\btoday\b", text):
        return today, today, True
    if re.search(r"\byesterday\b", text):
        d = today - timedelta(days=1)
        return d, d, True
    if re.search(r"\blast week\b", text):
        return today - timedelta(days=7), today, True
    if re.search(r"\bthis month\b", text):
        return today.replace(day=1), today, True

    found = []  # (date_from, date_to) per mention
    year_given = False

    for m in re.finditer(r"\b(\d{4})-(\d{2})-(\d{2})\b", text):
        d = _safe_date(int(m[1]), int(m[2]), int(m[3]))
        if d:
            found.append((m.start(), d, d))
            year_given = True

    day_month = rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+(?:of\s+)?({MONTH_RE})\b(?:,?\s+(\d{{4}}))?"
    month_day = rf"\b({MONTH_RE})\s+(\d{{1,2}})(?:st|nd|rd|th)?\b(?:,?\s+(\d{{4}}))?"
    for pattern, day_i, mon_i in ((day_month, 1, 2), (month_day, 2, 1)):
        for m in re.finditer(pattern, text):
            year = int(m[3]) if m[3] else today.year
            year_given = year_given or bool(m[3])
            d = _safe_date(year, MONTHS[m[mon_i]], int(m[day_i]))
            if d:
                found.append((m.start(), d, d))

    if not found:
        # Whole month ("in October 2025") or whole year ("in 2024").
        m = re.search(rf"\b({MONTH_RE})\b(?:\s+(\d{{4}}))?", text)
        if m:
            year = int(m[2]) if m[2] else today.year
            month = MONTHS[m[1]]
            last = calendar.monthrange(year, month)[1]
            return date(year, month, 1), date(year, month, last), bool(m[2])
        m = re.search(r"\b(19|20)\d{2}\b", text)
        if m:
            year = int(m[0])
            return date(year, 1, 1), date(year, 12, 31), True
        return None, None, True

    found.sort()
    starts = [f[1] for f in found]
    ends = [f[2] for f in found]
    return min(starts), max(ends), year_given


def _safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        return date(year, month, day)
    except ValueError:
        return None
