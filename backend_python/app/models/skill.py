from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

CategoryType = Literal["Technology", "Creative", "Lifestyle", "Business", "Other"]
SkillTypeEnum = Literal["Offer", "Request"]

class SkillCreateRequest(BaseModel):
    title: str
    description: str
    category: CategoryType
    skillType: SkillTypeEnum
    credits: int = Field(..., ge=0)

class SkillUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[CategoryType] = None
    credits: Optional[int] = Field(None, ge=0)

class SkillResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    owner: Optional[dict] = None
    title: str
    description: str
    category: str
    skillType: str
    credits: int
    isActive: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
