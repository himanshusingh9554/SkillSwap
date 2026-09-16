from fastapi import APIRouter, HTTPException, status, Response, Request, Depends, UploadFile, File
from app.models.user import UserRegisterRequest, UserLoginRequest, UserUpdateDetailsRequest
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.config import settings
from datetime import datetime
import os
import shutil

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(body: UserRegisterRequest):
    if not body.fullName or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    db = get_db()
    norm_email = body.email.strip().lower()
    existing = await db.users.find_one({"email": norm_email})
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    hashed = get_password_hash(body.password)
    now = datetime.utcnow()
    new_user_doc = {
        "fullName": body.fullName.strip(),
        "email": norm_email,
        "password": hashed,
        "credits": 50,
        "skills": [],
        "profilePicture": None,
        "createdAt": now,
        "updatedAt": now
    }
    result = await db.users.insert_one(new_user_doc)
    created_user = await db.users.find_one({"_id": result.inserted_id}, {"password": 0})

    return {
        "message": "User registered successfully",
        "user": serialize_doc(created_user)
    }

@router.post("/login")
async def login_user(body: UserLoginRequest, response: Response):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    db = get_db()
    norm_email = body.email.strip().lower()
    user = await db.users.find_one({"email": norm_email})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    if not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Password does not match")

    token_data = {
        "id": str(user["_id"]),
        "email": user["email"],
        "fullName": user["fullName"]
    }
    access_token = create_access_token(token_data)

    # Set httpOnly cookie matching Express options
    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=False
    )

    clean_user = await db.users.find_one({"_id": user["_id"]}, {"password": 0})
    return {
        "message": "User logged in successfully",
        "user": serialize_doc(clean_user),
        "accessToken": access_token
    }

@router.post("/logout")
async def logout_user(response: Response, current_user: dict = Depends(get_current_user)):
    response.delete_cookie(key="accessToken")
    return {"message": "User logged out successfully"}

@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Current user fetched successfully",
        "user": current_user
    }

@router.patch("/update-details")
async def update_user_details(body: UserUpdateDetailsRequest, current_user: dict = Depends(get_current_user)):
    if not body.fullName and body.skills is None:
        raise HTTPException(status_code=400, detail="At least one field is required")

    db = get_db()
    update_data = {"updatedAt": datetime.utcnow()}
    if body.fullName:
        update_data["fullName"] = body.fullName.strip()
    if body.skills is not None:
        update_data["skills"] = body.skills

    user_obj_id = to_object_id(current_user["_id"])
    await db.users.update_one({"_id": user_obj_id}, {"$set": update_data})
    updated = await db.users.find_one({"_id": user_obj_id}, {"password": 0})
    return {
        "message": "User details updated ",
        "user": serialize_doc(updated)
    }

@router.patch("/update-avatar")
async def update_user_avatar(avatar: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{current_user['_id']}_{avatar.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(avatar.file, buffer)

    db = get_db()
    user_obj_id = to_object_id(current_user["_id"])
    avatar_url = f"/uploads/{filename}"
    await db.users.update_one(
        {"_id": user_obj_id},
        {"$set": {"profilePicture": avatar_url, "updatedAt": datetime.utcnow()}}
    )
    updated = await db.users.find_one({"_id": user_obj_id}, {"password": 0})
    return {
        "message": "Avatar updated ",
        "user": serialize_doc(updated)
    }

@router.get("/profile/{userId}")
async def get_user_profile(userId: str):
    obj_id = to_object_id(userId)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    db = get_db()
    user = await db.users.find_one({"_id": obj_id}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    skills_cursor = db.skills.find({"owner": obj_id, "isActive": True})
    skills = await skills_cursor.to_list(length=100)

    return {
        "message": "User profile fetched successfully",
        "data": {
            "user": serialize_doc(user),
            "skills": serialize_doc(skills)
        }
    }
