"""
Text embeddings, computed locally with fastembed (ONNX). No file content is sent
to an external API for embedding.
"""
import threading
from typing import List

from app.config import settings


class FastEmbedEmbedder:
    """BAAI/bge-small-en-v1.5 by default: 384-dimensional, normalized vectors."""

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL):
        self.model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def _get_model(self):
        # Loaded on first use: the first call downloads the model (~65 MB) into EMBEDDING_CACHE_DIR.
        with self._lock:
            if self._model is None:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(self.model_name, cache_dir=settings.EMBEDDING_CACHE_DIR)
            return self._model

    @property
    def dim(self) -> int:
        return len(self.embed_query("dimension probe"))

    def embed_passages(self, texts: List[str]) -> List[List[float]]:
        return [v.tolist() for v in self._get_model().passage_embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        return next(iter(self._get_model().query_embed([text]))).tolist()
