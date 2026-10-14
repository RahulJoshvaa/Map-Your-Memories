"""
Authentication router: register, login, me, logout.
"""
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import register_user, login_user
from app.dependencies.auth import get_current_user
from app.database.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account and return a JWT token."""
    return register_user(data, db)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email/password and return a JWT token."""
    return login_user(data, db)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout():
    """
    Logout endpoint.
    JWT tokens are stateless; the client must discard the token.
    This endpoint exists as a clean API contract for the frontend.
    """
    return {"message": "Logged out successfully"}


@router.get("/lookup-user", response_model=UserResponse)
def lookup_user_by_email(
    email: str = Query(..., description="Email address to look up"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if a user with the given email exists.
    Used by the frontend to validate collaborator email before adding.
    Returns 404 if not found, 400 if looking up self.
    """
    clean = email.strip().lower()
    if clean == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a collaborator",
        )
    user = db.query(User).filter(User.email == clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found for '{email}'. They must register first.",
        )
    return user

