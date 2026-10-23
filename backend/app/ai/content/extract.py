"""
Turn an uploaded file into plain text for embedding.

  documents  PDF (pypdf), DOCX (read from the zip's XML), plain text
  audio      transcribed with Groq Whisper
  images / videos / .doc  not indexed (no text to extract with the current models)
"""
import io
import logging
import zipfile
from xml.etree import ElementTree

from app.ai.search import groq_client

logger = logging.getLogger(__name__)

MAX_TEXT_CHARS = 200_000  # cap what one file can add to the index
MAX_PDF_PAGES = 200

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
DOCUMENT_MIMES = {"application/pdf", DOCX_MIME, "text/plain"}
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def is_indexable(mime_type: str) -> bool:
    return mime_type in DOCUMENT_MIMES or mime_type.startswith("audio/")


def extract_text(content: bytes, mime_type: str, file_name: str) -> str:
    """Return the file's text ("" when there is nothing to index)."""
    if mime_type == "application/pdf":
        text = _pdf_text(content)
    elif mime_type == DOCX_MIME:
        text = _docx_text(content)
    elif mime_type == "text/plain":
        text = content.decode("utf-8", errors="replace")
    elif mime_type.startswith("audio/"):
        text = _audio_text(content, mime_type, file_name)
    else:
        return ""
    return " ".join(text.split())[:MAX_TEXT_CHARS]


def _pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    return "\n".join((page.extract_text() or "") for page in reader.pages[:MAX_PDF_PAGES])


def _docx_text(content: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    paragraphs = (
        "".join(node.text or "" for node in para.iter(f"{WORD_NS}t"))
        for para in root.iter(f"{WORD_NS}p")
    )
    return "\n".join(p for p in paragraphs if p)


def _audio_text(content: bytes, mime_type: str, file_name: str) -> str:
    if not groq_client.is_configured():
        return ""
    try:
        return groq_client.transcribe(content, file_name, mime_type)
    except groq_client.GroqError as exc:
        logger.warning("Audio transcription skipped: %s", exc)
        return ""
