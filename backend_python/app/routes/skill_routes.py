from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.skill import SkillCreateRequest, SkillUpdateRequest
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import get_current_user
from datetime import datetime
from typing import Optional
import re

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])

async def populate_owner(skill_doc: dict, db) -> dict:
    if not skill_doc:
        return skill_doc
    owner_id = skill_doc.get("owner")
    if owner_id:
        owner_obj_id = to_object_id(owner_id)
        if owner_obj_id:
            owner = await db.users.find_one({"_id": owner_obj_id}, {"fullName": 1, "profilePicture": 1})
            skill_doc["owner"] = serialize_doc(owner) if owner else {"_id": str(owner_id), "fullName": "Unknown"}
    return skill_doc

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_skill(body: SkillCreateRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.utcnow()
    new_skill = {
        "owner": to_object_id(current_user["_id"]),
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category,
        "skillType": body.skillType,
        "credits": body.credits,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now
    }
    res = await db.skills.insert_one(new_skill)
    new_skill["_id"] = res.inserted_id

    return {
        "message": "Skill listed successfully",
        "skill": serialize_doc(new_skill)
    }

@router.get("", include_in_schema=False)
@router.get("/")
async def get_all_skills():
    db = get_db()
    cursor = db.skills.find({"isActive": True}).sort("createdAt", -1)
    skills = await cursor.to_list(length=200)

    populated = []
    for s in skills:
        s_pop = await populate_owner(s, db)
        populated.append(serialize_doc(s_pop))

    return {
        "message": "Skills fetched successfully",
        "count": len(populated),
        "skills": populated
    }

@router.get("/my-skills")
async def get_my_skills(search: str = Query("", alias="search")):
    db = get_db()
    query = {"isActive": True}
    if search:
        query["title"] = {"$regex": re.escape(search), "$options": "i"}

    cursor = db.skills.find(query).sort("createdAt", -1)
    skills = await cursor.to_list(length=200)

    populated = []
    for s in skills:
        s_pop = await populate_owner(s, db)
        populated.append(serialize_doc(s_pop))

    return {"skills": populated}

@router.get("/{skillId}")
async def get_skill_by_id(skillId: str):
    obj_id = to_object_id(skillId)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid Skill ID format")

    db = get_db()
    skill = await db.skills.find_one({"_id": obj_id})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    skill_pop = await populate_owner(skill, db)
    return {
        "message": "Skill details fetched successfully",
        "skill": serialize_doc(skill_pop)
    }

@router.patch("/{skillId}")
async def update_skill(skillId: str, body: SkillUpdateRequest, current_user: dict = Depends(get_current_user)):
    obj_id = to_object_id(skillId)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid Skill ID format")

    db = get_db()
    skill = await db.skills.find_one({"_id": obj_id})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(skill.get("owner")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to update this skill")

    update_fields = {"updatedAt": datetime.utcnow()}
    if body.title is not None:
        update_fields["title"] = body.title.strip()
    if body.description is not None:
        update_fields["description"] = body.description.strip()
    if body.category is not None:
        update_fields["category"] = body.category
    if body.credits is not None:
        update_fields["credits"] = body.credits

    await db.skills.update_one({"_id": obj_id}, {"$set": update_fields})
    updated = await db.skills.find_one({"_id": obj_id})
    return {
        "message": "Skill updated successfully",
        "skill": serialize_doc(updated)
    }

@router.delete("/{skillId}")
async def delete_skill(skillId: str, current_user: dict = Depends(get_current_user)):
    obj_id = to_object_id(skillId)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid Skill ID format")

    db = get_db()
    skill = await db.skills.find_one({"_id": obj_id})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(skill.get("owner")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to delete this skill")

    await db.skills.delete_one({"_id": obj_id})
    return {"message": "Skill deleted successfully"}
