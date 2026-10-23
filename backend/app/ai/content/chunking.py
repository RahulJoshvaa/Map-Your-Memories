"""
Split long text into overlapping chunks so each embedding covers one passage.
"""
from typing import List

CHUNK_CHARS = 800
OVERLAP_CHARS = 120
MAX_CHUNKS = 300


def chunk_text(text: str, size: int = CHUNK_CHARS, overlap: int = OVERLAP_CHARS) -> List[str]:
    """Chunks of about `size` characters, broken at word boundaries."""
    words = text.split()
    chunks, current, length = [], [], 0
    for word in words:
        if current and length + len(word) + 1 > size:
            chunks.append(" ".join(current))
            if len(chunks) >= MAX_CHUNKS:
                return chunks
            # Carry the tail of this chunk into the next one for context.
            tail, tail_len = [], 0
            for w in reversed(current):
                if tail_len + len(w) + 1 > overlap:
                    break
                tail.insert(0, w)
                tail_len += len(w) + 1
            current, length = tail, tail_len
        current.append(word)
        length += len(word) + 1
    if current:
        chunks.append(" ".join(current))
    return chunks
