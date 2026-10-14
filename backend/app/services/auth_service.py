"""
Authentication service: registration, login, token generation.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.database.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.utils.security import hash_password, verify_password, create_access_token


def register_user(data: RegisterRequest, db: Session) -> TokenResponse:
    """Register a new user. Raises 409 if email already exists."""
    normalized_email = data.email.strip().lower()

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=data.name.strip(),
        email=normalized_email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


def login_user(data: LoginRequest, db: Session) -> TokenResponse:
    """
    Authenticate user by email/password.
    Returns a generic 401 on any failure to avoid account enumeration.
    """
    normalized_email = data.email.strip().lower()
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.query(User).filter(User.email == normalized_email).first()
    if user is None:
        raise invalid_exc

    if not verify_password(data.password, user.password_hash):
        raise invalid_exc

    # Update last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )
