from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.services.password_policy import validate_password_complexity

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()

    try:
        validate_password_complexity(req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": str(user.id), "email": user.email}

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)
