"""
Minimal Groq chat-completions client (OpenAI-compatible REST API).

The API key is read from backend settings only; it is never returned to the frontend.
"""
import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024  # Groq free-tier upload limit


class GroqError(Exception):
    """Groq is unavailable, misconfigured, or returned something unusable."""


def is_configured() -> bool:
    return bool(settings.GROQ_API_KEY.strip())


def chat_json(system_prompt: str, user_prompt: str) -> dict:
    """Send one chat request in JSON mode and return the parsed JSON object."""
    if not is_configured():
        raise GroqError("GROQ_API_KEY is not set")

    payload = {
        "model": settings.GROQ_MODEL,
        "temperature": 0,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    if settings.GROQ_MODEL.startswith("openai/gpt-oss"):
        # Reasoning model: keep thinking short so search stays fast.
        payload["reasoning_effort"] = "low"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}"}

    response = None
    for attempt in range(2):  # one retry for dropped connections
        try:
            response = httpx.post(
                GROQ_CHAT_URL,
                json=payload,
                headers=headers,
                timeout=settings.GROQ_TIMEOUT_SECONDS,
            )
            break
        except httpx.ConnectError as exc:
            if attempt == 1:
                raise GroqError("Could not connect to Groq") from exc
        except httpx.HTTPError as exc:
            raise GroqError(f"Request to Groq failed: {exc.__class__.__name__}") from exc

    if response.status_code != 200:
        # Log status only; the body can echo request details.
        logger.warning("Groq returned HTTP %s", response.status_code)
        raise GroqError(f"Groq returned HTTP {response.status_code}")

    try:
        content = response.json()["choices"][0]["message"]["content"]
        data = json.loads(content)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise GroqError("Groq returned an unexpected response") from exc

    if not isinstance(data, dict):
        raise GroqError("Groq did not return a JSON object")
    return data


def transcribe(content: bytes, file_name: str, mime_type: str) -> str:
    """Speech-to-text with Groq Whisper. Returns the transcript text."""
    if not is_configured():
        raise GroqError("GROQ_API_KEY is not set")
    if len(content) > MAX_TRANSCRIBE_BYTES:
        raise GroqError("Audio file is too large to transcribe")

    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}"}
    for attempt in range(2):  # one retry for dropped connections
        try:
            response = httpx.post(
                GROQ_TRANSCRIBE_URL,
                headers=headers,
                data={"model": settings.GROQ_TRANSCRIBE_MODEL, "response_format": "json"},
                files={"file": (file_name or "audio", content, mime_type)},
                timeout=120,
            )
            break
        except httpx.ConnectError as exc:
            if attempt == 1:
                raise GroqError("Could not connect to Groq") from exc
        except httpx.HTTPError as exc:
            raise GroqError(f"Request to Groq failed: {exc.__class__.__name__}") from exc

    if response.status_code != 200:
        logger.warning("Groq transcription returned HTTP %s", response.status_code)
        raise GroqError(f"Groq returned HTTP {response.status_code}")
    try:
        return response.json()["text"]
    except (KeyError, TypeError, ValueError) as exc:
        raise GroqError("Groq returned an unexpected response") from exc
