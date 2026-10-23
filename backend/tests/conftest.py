"""
Shared test setup. Runs before the app is imported, so tests always use local
storage and never upload to the cloud backend configured in .env.
"""
import hashlib
import math
import os

import pytest

os.environ["STORAGE_BACKEND"] = "local"
os.environ["VECTOR_DB_PATH"] = ":memory:"


class FakeEmbedder:
    """Bag-of-words hashing: texts sharing words get similar vectors. No model download."""
    dim = 64

    def _vector(self, text):
        v = [0.0] * self.dim
        for word in text.lower().split():
            v[int(hashlib.md5(word.strip(".,!?").encode()).hexdigest(), 16) % self.dim] += 1
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / norm for x in v]

    def embed_passages(self, texts):
        return [self._vector(t) for t in texts]

    def embed_query(self, text):
        return self._vector(text)


@pytest.fixture(autouse=True, scope="session")
def fake_content_index():
    """Every test gets an in-memory vector DB with the fake embedder."""
    from app.ai.content import indexer
    from app.ai.content.vector_store import VectorStore, make_client

    index = indexer.ContentIndex(FakeEmbedder(), VectorStore(make_client(), FakeEmbedder.dim))
    original = indexer.get_index
    indexer.get_index = lambda: index
    yield index
    indexer.get_index = original
