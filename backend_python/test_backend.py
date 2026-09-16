import asyncio
import os
import sys
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from app.main import fastapi_app
from app.database import connect_db, close_db, get_db

@pytest.mark.asyncio
async def test_full_flow():
    print("\n--- 1. Testing Database Connection & Lifespan ---")
    await connect_db()
    db = get_db()
    assert db is not None, "Database should be connected"
    print("✅ MongoDB connection verified!")

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root Endpoint & Health Check
        res = await client.get("/")
        assert res.status_code == 200
        assert "SkillSwap" in res.text

        health_res = await client.get("/api/health")
        assert health_res.status_code == 200
        assert "SkillSwap server is running" in health_res.text
        print("✅ GET / and /api/health return 200 and expected web UI / health check!")

        # 2. User Registration
        unique_suffix = uuid.uuid4().hex[:8]
        test_email = f"test_{unique_suffix}@example.com"
        test_password = "Password123!"
        test_name = f"Tester {unique_suffix}"

        reg_res = await client.post("/api/v1/users/register", json={
            "fullName": test_name,
            "email": test_email,
            "password": test_password
        })
        assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
        reg_data = reg_res.json()
        assert "user" in reg_data
        user_id = reg_data["user"]["_id"]
        assert reg_data["user"]["credits"] == 50
        print(f"✅ POST /api/v1/users/register succeeded for user {user_id} with 50 credits!")

        # 3. User Login
        login_res = await client.post("/api/v1/users/login", json={
            "email": test_email,
            "password": test_password
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        access_token = login_data["accessToken"]
        assert access_token is not None
        print("✅ POST /api/v1/users/login returned valid JWT access token!")

        auth_headers = {"Authorization": f"Bearer {access_token}"}

        # 4. Current User Profile (/me)
        me_res = await client.get("/api/v1/users/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["user"]["email"] == test_email
        print("✅ GET /api/v1/users/me authenticated successfully!")

        # 5. Update Details
        update_res = await client.patch(
            "/api/v1/users/update-details",
            headers=auth_headers,
            json={"fullName": f"{test_name} Updated", "skills": ["Python", "FastAPI"]}
        )
        assert update_res.status_code == 200
        assert "Python" in update_res.json()["user"]["skills"]
        print("✅ PATCH /api/v1/users/update-details updated skills successfully!")

        # 6. Create Skill
        skill_res = await client.post(
            "/api/v1/skills/create",
            headers=auth_headers,
            json={
                "title": f"Python AI Automation {unique_suffix}",
                "description": "Learn to build fast Gen AI apps using Python & FastAPI",
                "category": "Technology",
                "skillType": "Offer",
                "credits": 20
            }
        )
        assert skill_res.status_code == 201, f"Skill creation failed: {skill_res.text}"
        skill_id = skill_res.json()["skill"]["_id"]
        print(f"✅ POST /api/v1/skills/create created skill {skill_id}!")

        # 7. List All Skills
        skills_res = await client.get("/api/v1/skills/")
        assert skills_res.status_code == 200
        skills_data = skills_res.json()
        assert any(s["_id"] == skill_id for s in skills_data["skills"])
        print(f"✅ GET /api/v1/skills/ lists active skills (count: {skills_data['count']})!")

        # 8. Search Skills
        search_res = await client.get(f"/api/v1/skills/my-skills?search={unique_suffix}")
        assert search_res.status_code == 200
        assert len(search_res.json()["skills"]) >= 1
        print("✅ GET /api/v1/skills/my-skills filtered by title search successfully!")

        # 9. Gen AI: Enhance Skill
        ai_enhance_res = await client.post("/api/v1/ai/enhance-skill", json={
            "title": "Guitar for beginners",
            "description": "learn basic chords and rhythm strumming",
            "category": "Creative"
        })
        assert ai_enhance_res.status_code == 200
        enhanced_data = ai_enhance_res.json()
        assert enhanced_data["success"] is True
        assert "keyOutcomes" in enhanced_data["enhanced"] or "description" in enhanced_data["enhanced"]
        print(f"✅ POST /api/v1/ai/enhance-skill returned: {enhanced_data['enhanced']['title']} ({enhanced_data['enhanced']['credits']} credits)!")

        # 10. Gen AI: Swap Roadmap
        ai_roadmap_res = await client.post("/api/v1/ai/generate-roadmap", json={
            "mySkill": "Python Programming",
            "partnerSkill": "Spanish Language",
            "weeks": 4
        })
        assert ai_roadmap_res.status_code == 200
        roadmap_data = ai_roadmap_res.json()
        assert roadmap_data["success"] is True
        assert len(roadmap_data["roadmap"]["schedule"]) == 4
        print(f"✅ POST /api/v1/ai/generate-roadmap generated {len(roadmap_data['roadmap']['schedule'])}-week bilateral syllabus!")

        # 11. Gen AI: Skill Matching
        ai_match_res = await client.post("/api/v1/ai/match", json={
            "query": "I want to learn Python and FastAPI backend development"
        })
        assert ai_match_res.status_code == 200
        match_data = ai_match_res.json()
        assert match_data["success"] is True
        print(f"✅ POST /api/v1/ai/match found {len(match_data.get('matches', []))} matching skills with compatibility scoring!")

        # 12. Gen AI: Tutor Chat
        ai_tutor_res = await client.post("/api/v1/ai/tutor", json={
            "message": "How do skill credits work on SkillSwap?"
        })
        assert ai_tutor_res.status_code == 200
        tutor_data = ai_tutor_res.json()
        assert tutor_data["success"] is True
        assert len(tutor_data["reply"]) > 10
        print(f"✅ POST /api/v1/ai/tutor responded: {tutor_data['reply'][:60]}...!")

        # 13. Notifications Endpoint
        notif_res = await client.get("/api/v1/notifications", headers=auth_headers)
        assert notif_res.status_code == 200
        print("✅ GET /api/v1/notifications retrieved notifications successfully!")

        # Cleanup test artifacts from DB
        from bson import ObjectId
        await db.skills.delete_one({"_id": ObjectId(skill_id)})
        await db.users.delete_one({"_id": ObjectId(user_id)})
        print("🧹 Cleaned up test user and test skill from MongoDB.")

    await close_db()
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n")

if __name__ == "__main__":
    asyncio.run(test_full_flow())
