"""
Qdrant vector store for media content chunks.

One point per chunk: vector = chunk embedding, payload = which media/pin it came
from plus the chunk text (used for result snippets). Access control is not
stored here; callers pass the pin ids the user may see, and search filters on them.
"""
import threading
import uuid
from dataclasses import dataclass
from typing import List, Optional, Sequence

from qdrant_client import QdrantClient, models

from app.config import settings

COLLECTION = "media_chunks"


@dataclass
class ChunkHit:
    pin_id: str
    media_id: str
    file_name: str
    file_type: str
    text: str
    score: float


def make_client() -> QdrantClient:
    if settings.VECTOR_DB_URL:
        return QdrantClient(url=settings.VECTOR_DB_URL, api_key=settings.VECTOR_DB_API_KEY or None)
    if settings.VECTOR_DB_PATH == ":memory:":
        return QdrantClient(location=":memory:")
    return QdrantClient(path=settings.VECTOR_DB_PATH)


class VectorStore:
    def __init__(self, client: QdrantClient, dim: int):
        self.client = client
        self._lock = threading.Lock()  # local Qdrant is not safe for concurrent writers
        if not client.collection_exists(COLLECTION):
            client.create_collection(
                COLLECTION,
                vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
            )

    def replace_media(self, media_id, pin_id, file_name: str, file_type: str,
                      chunks: List[str], vectors: List[List[float]]) -> None:
        """Store a file's chunks, replacing any earlier ones for the same media."""
        points = [
            models.PointStruct(
                id=str(uuid.uuid5(uuid.UUID(str(media_id)), str(i))),
                vector=vector,
                payload={
                    "pin_id": str(pin_id), "media_id": str(media_id), "chunk": i,
                    "file_name": file_name, "file_type": file_type, "text": chunk,
                },
            )
            for i, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        with self._lock:
            self._delete("media_id", media_id)
            if points:
                self.client.upsert(COLLECTION, points=points)

    def delete_media(self, media_id) -> None:
        with self._lock:
            self._delete("media_id", media_id)

    def delete_pin(self, pin_id) -> None:
        with self._lock:
            self._delete("pin_id", pin_id)

    def search(self, vector: List[float], pin_ids: Sequence, limit: int,
               min_score: float, file_types: Optional[Sequence[str]] = None) -> List[ChunkHit]:
        if not pin_ids:
            return []
        must = [models.FieldCondition(key="pin_id", match=models.MatchAny(any=[str(p) for p in pin_ids]))]
        if file_types:
            must.append(models.FieldCondition(key="file_type", match=models.MatchAny(any=list(file_types))))
        with self._lock:
            result = self.client.query_points(
                COLLECTION, query=vector, query_filter=models.Filter(must=must),
                limit=limit, score_threshold=min_score, with_payload=True,
            )
        return [
            ChunkHit(
                pin_id=p.payload["pin_id"], media_id=p.payload["media_id"],
                file_name=p.payload["file_name"], file_type=p.payload["file_type"],
                text=p.payload["text"], score=p.score,
            )
            for p in result.points
        ]

    def _delete(self, key: str, value) -> None:
        self.client.delete(
            COLLECTION,
            points_selector=models.FilterSelector(filter=models.Filter(must=[
                models.FieldCondition(key=key, match=models.MatchValue(value=str(value))),
            ])),
        )
