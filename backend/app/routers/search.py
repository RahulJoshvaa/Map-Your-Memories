"""
Search router: AI natural-language search over the user's accessible pins.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models.user import User
from app.dependencies.auth import get_current_user
from app.schemas.search import AISearchRequest, AISearchResponse
from app.services import ai_search_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/ai", response_model=AISearchResponse)
def ai_search(
    data: AISearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Search memories with a natural-language query, e.g.
    "Show me memories from 19 October to 20 October" or "beach photos in Goa".
    Pins match on their details or on the content of their documents and audio.
    Only pins the user owns or collaborates on are returned.
    """
    filters, source, pins, matches = ai_search_service.search(data.query, current_user, db)
    return AISearchResponse(
        query=data.query, filters=filters, source=source, pins=pins, total=len(pins),
        content_matches=matches,
    )
