"""
Natural-language memory search.

Flow: query text -> parser (Groq LLM, rule-based fallback) -> validated SearchFilters
-> SQL filters in app.services.ai_search_service.

The LLM only turns text into filters. It never sees the user's pins and never writes SQL.
"""
from app.ai.search.filters import SearchFilters
from app.ai.search.query_parser import parse_query

__all__ = ["SearchFilters", "parse_query"]
