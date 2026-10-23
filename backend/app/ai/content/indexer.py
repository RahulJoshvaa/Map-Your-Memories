"""
Content index: the entry points the rest of the app uses.

  index_media   upload -> extract text -> chunk -> embed -> vector DB  (runs as a background task)
  remove_media / remove_pin   keep the index in step with deletes
  search_content   semantic search over the chunks of pins the user can access

Failures here are logged and never break uploads, deletes or search.
"""
import logging
from functools import lru_cache
from typing import List, Optional, Sequence

from app.ai.content.chunking import chunk_text
from app.ai.content.embedder import FastEmbedEmbedder
from app.ai.content.extract import extract_text, is_indexable
from app.ai.content.vector_store import ChunkHit, VectorStore, make_client
from app.config import settings

logger = logging.getLogger(__name__)


class ContentIndex:
    def __init__(self, embedder, store: VectorStore):
        self.embedder = embedder
        self.store = store


@lru_cache
def get_index() -> ContentIndex:
    embedder = FastEmbedEmbedder()
    return ContentIndex(embedder, VectorStore(make_client(), embedder.dim))


def enabled() -> bool:
    return settings.CONTENT_INDEXING_ENABLED


def should_index(mime_type: str) -> bool:
    return enabled() and is_indexable(mime_type)


def index_media(media_id, pin_id, file_name: str, file_type: str, mime_type: str, content: bytes) -> int:
    """Index one uploaded file. Returns the number of chunks stored."""
    try:
        text = extract_text(content, mime_type, file_name)
        chunks = chunk_text(text) if text else []
        index = get_index()
        vectors = index.embedder.embed_passages(chunks) if chunks else []
        index.store.replace_media(media_id, pin_id, file_name, file_type, chunks, vectors)
        logger.info("Indexed %s: %d chunk(s)", file_name, len(chunks))
        return len(chunks)
    except Exception:
        logger.exception("Content indexing failed for media %s", media_id)
        return 0


def remove_media(media_id) -> None:
    if not enabled():
        return
    try:
        get_index().store.delete_media(media_id)
    except Exception:
        logger.exception("Could not remove media %s from the content index", media_id)


def remove_pin(pin_id) -> None:
    if not enabled():
        return
    try:
        get_index().store.delete_pin(pin_id)
    except Exception:
        logger.exception("Could not remove pin %s from the content index", pin_id)


def search_content(query: str, pin_ids: Sequence, limit: int = 30,
                   file_types: Optional[Sequence[str]] = None) -> List[ChunkHit]:
    """Chunks semantically close to the query, restricted to the given pins."""
    if not enabled() or not pin_ids:
        return []
    try:
        index = get_index()
        return index.store.search(
            index.embedder.embed_query(query), pin_ids, limit,
            settings.CONTENT_MIN_SCORE, file_types,
        )
    except Exception:
        logger.exception("Content search failed")
        return []
