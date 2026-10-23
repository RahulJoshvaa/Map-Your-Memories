"""
Validated search filters.

Everything the parser produces (LLM or fallback) must pass through this model
before it is used in a database query, so bad or malicious model output can
only ever narrow a search, never change what the user is allowed to see.
"""
from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

MediaType = Literal["image", "video", "audio", "document"]
Scope = Literal["all", "owned", "shared"]

MAX_TERMS = 10
MAX_TERM_LENGTH = 60


def _clean_terms(values, limit: int) -> List[str]:
    """Strip, de-duplicate (case-insensitive), cap length and count."""
    if not values:
        return []
    if isinstance(values, str):
        values = [values]
    seen, cleaned = set(), []
    for v in values:
        if not isinstance(v, str):
            continue
        term = " ".join(v.split())[:MAX_TERM_LENGTH]
        if term and term.lower() not in seen:
            seen.add(term.lower())
            cleaned.append(term)
    return cleaned[:limit]


class SearchFilters(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    locations: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    media_types: List[MediaType] = Field(default_factory=list)
    scope: Scope = "all"

    @field_validator("locations", "keywords", mode="before")
    @classmethod
    def clean_terms(cls, v):
        return _clean_terms(v, MAX_TERMS)

    @field_validator("media_types", mode="before")
    @classmethod
    def clean_media_types(cls, v):
        aliases = {
            "photo": "image", "photos": "image", "picture": "image", "pictures": "image",
            "images": "image", "pic": "image", "pics": "image",
            "videos": "video", "clip": "video", "clips": "video",
            "audios": "audio", "sound": "audio", "voice": "audio", "recording": "audio",
            "documents": "document", "doc": "document", "docs": "document", "pdf": "document",
        }
        if not v:
            return []
        if isinstance(v, str):
            v = [v]
        out = []
        for item in v:
            if not isinstance(item, str):
                continue
            t = aliases.get(item.strip().lower(), item.strip().lower())
            if t in ("image", "video", "audio", "document") and t not in out:
                out.append(t)
        return out

    @field_validator("scope", mode="before")
    @classmethod
    def clean_scope(cls, v):
        v = (v or "all").strip().lower() if isinstance(v, str) else "all"
        return v if v in ("all", "owned", "shared") else "all"

    @model_validator(mode="after")
    def order_dates(self):
        if self.date_from and self.date_to and self.date_from > self.date_to:
            self.date_from, self.date_to = self.date_to, self.date_from
        return self

    def is_empty(self) -> bool:
        return not (
            self.date_from or self.date_to or self.locations
            or self.keywords or self.media_types or self.scope != "all"
        )
