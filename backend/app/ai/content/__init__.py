"""
Content search: embeddings of uploaded documents and audio in a vector DB.
"""
from app.ai.content.indexer import (  # noqa: F401
    index_media, remove_media, remove_pin, search_content, should_index,
)
