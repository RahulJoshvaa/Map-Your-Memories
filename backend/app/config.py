"""
Application configuration loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/map_your_memories"

    # JWT
    JWT_SECRET_KEY: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Storage
    STORAGE_BACKEND: str = "local"  # "local", "cloudinary" or "r2"
    UPLOAD_DIR: str = "./uploads"

    # Cloudflare R2 (used when STORAGE_BACKEND=r2). Keys stay on the backend.
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_PUBLIC_URL: str = ""  # optional r2.dev / custom domain; empty = private bucket + presigned URLs
    R2_URL_EXPIRE_SECONDS: int = 3600

    # Cloudinary (used when STORAGE_BACKEND=cloudinary). The secret stays on the backend.
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER: str = "map-your-memories"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # AI search (Groq). The key stays on the backend and is never sent to the browser.
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    GROQ_TIMEOUT_SECONDS: float = 10.0
    GROQ_TRANSCRIBE_MODEL: str = "whisper-large-v3-turbo"  # audio -> text for content search

    # Content search: uploaded documents/audio are embedded into a vector DB (Qdrant).
    CONTENT_INDEXING_ENABLED: bool = True
    VECTOR_DB_PATH: str = "./vector_db"  # local on-disk Qdrant; ":memory:" for tests
    VECTOR_DB_URL: str = ""  # optional Qdrant server / Qdrant Cloud URL (overrides VECTOR_DB_PATH)
    VECTOR_DB_API_KEY: str = ""
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"  # runs locally via fastembed (ONNX)
    EMBEDDING_CACHE_DIR: str = "./models"
    CONTENT_MIN_SCORE: float = 0.6  # cosine similarity needed to count as a content match

    # App
    APP_ENV: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
