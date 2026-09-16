from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserRegisterRequest(BaseModel):
    fullName: str
    email: EmailStr
    password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserUpdateDetailsRequest(BaseModel):
    fullName: Optional[str] = None
    skills: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    fullName: str
    email: str
    credits: int = 50
    skills: List[str] = []
    profilePicture: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
