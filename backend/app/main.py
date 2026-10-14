"""
Map Your Memories - FastAPI Application Entry Point

Architecture:
    React UI → FastAPI → PostgreSQL + Local Storage

Routers:
    /api/auth  - Authentication (register, login, me, logout)
    /api/pins  - Memory pin CRUD
    /api/pins/{pin_id}/media - Media upload/list
    /api/media/{media_id}    - Media delete
    /uploads/* - Static file serving for uploaded media
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path
import logging

from app.config import settings
from app.routers import auth, pins, media, notifications

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Map Your Memories API",
    description="Geographic memory vault backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(pins.router)
app.include_router(media.router)
app.include_router(notifications.router)

# ─── Database Initialization ──────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    from app.database.database import Base, engine
    from app.database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_collaborator_status(engine)


def _migrate_collaborator_status(engine):
    """Add pin_collaborators.status to databases created before invitations existed.
    Existing collaborators are treated as already accepted."""
    from sqlalchemy import inspect, text
    columns = {c["name"] for c in inspect(engine).get_columns("pin_collaborators")}
    if "status" not in columns:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE pin_collaborators "
                "ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'accepted'"
            ))

# ─── Static Files (uploaded media) ───────────────────────────────────────────
upload_dir = Path(settings.UPLOAD_DIR).resolve()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# ─── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "map-your-memories-api"}


@app.get("/", tags=["health"])
def root():
    return {
        "message": "Map Your Memories API",
        "docs": "/docs",
        "health": "/health",
    }
