from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database import get_db, serialize_doc
from app.services.ai_service import (
    enhance_skill_listing,
    generate_swap_roadmap,
    match_skills_with_ai,
    ai_tutor_chat
)
from app.middleware.auth import get_optional_user

router = APIRouter(prefix="/api/v1/ai", tags=["AI & Smart Matching"])

class EnhanceSkillRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None

class MatchSkillsRequest(BaseModel):
    query: str

class GenerateRoadmapRequest(BaseModel):
    mySkill: str
    partnerSkill: str
    weeks: Optional[int] = 4

class AITutorChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

@router.post("/enhance-skill")
async def enhance_skill_endpoint(body: EnhanceSkillRequest):
    if not body.title or not body.description:
        raise HTTPException(status_code=400, detail="Title and rough description are required")

    result = await enhance_skill_listing(body.title, body.description, body.category)
    return {
        "success": True,
        "enhanced": result
    }

@router.post("/match")
async def match_skills_endpoint(body: MatchSkillsRequest):
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="Search query is required")

    db = get_db()
    # Fetch active skills to match against
    cursor = db.skills.find({"isActive": True}).sort("createdAt", -1).limit(50)
    raw_skills = await cursor.to_list(length=50)

    # Populate owner names
    skills = []
    for s in raw_skills:
        owner_id = s.get("owner")
        if owner_id:
            owner = await db.users.find_one({"_id": owner_id}, {"fullName": 1})
            s["owner"] = serialize_doc(owner) if owner else {"fullName": "User"}
        skills.append(serialize_doc(s))

    result = await match_skills_with_ai(body.query.strip(), skills)
    return {
        "success": True,
        **result
    }

@router.post("/generate-roadmap")
async def generate_roadmap_endpoint(body: GenerateRoadmapRequest):
    if not body.mySkill or not body.partnerSkill:
        raise HTTPException(status_code=400, detail="Both mySkill and partnerSkill are required")

    weeks = min(max(body.weeks or 4, 1), 12)
    roadmap = await generate_swap_roadmap(body.mySkill, body.partnerSkill, weeks)
    return {
        "success": True,
        "roadmap": roadmap
    }

@router.post("/tutor")
async def ai_tutor_endpoint(body: AITutorChatRequest):
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    reply = await ai_tutor_chat(body.message.strip(), body.history)
    return {
        "success": True,
        "reply": reply
    }
