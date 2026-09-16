from fastapi import Request, HTTPException, status, Depends
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.config import settings
from app.database import get_db, to_object_id, serialize_doc

import bcrypt

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password[:72].encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password[:72].encode("utf-8")
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.ACCESS_TOKEN_EXPIRY_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.ACCESS_TOKEN_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request) -> Dict[str, Any]:
    header_auth = request.headers.get("Authorization")
    header_token = None
    if header_auth and header_auth.startswith("Bearer "):
        header_token = header_auth[7:].strip()

    cookie_token = request.cookies.get("accessToken")
    if cookie_token:
        cookie_token = cookie_token.strip()

    token = header_token if (header_token and header_token not in ("undefined", "null")) else cookie_token
    if not token or token in ("undefined", "null"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized request, no token provided"
        )

    user_id = None
    try:
        payload = jwt.decode(token, settings.ACCESS_TOKEN_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("id")
    except JWTError:
        # Fallback to alternate token source if primary failed
        alt_token = cookie_token if token == header_token else header_token
        if alt_token and alt_token not in ("undefined", "null") and alt_token != token:
            try:
                payload = jwt.decode(alt_token, settings.ACCESS_TOKEN_SECRET, algorithms=[ALGORITHM])
                user_id = payload.get("id")
            except JWTError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired access token"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token"
            )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or invalid token payload"
        )

    db = get_db()
    obj_id = to_object_id(user_id)
    if not obj_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token user ID")

    user = await db.users.find_one({"_id": obj_id}, {"password": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or invalid token")

    return serialize_doc(user)

async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
