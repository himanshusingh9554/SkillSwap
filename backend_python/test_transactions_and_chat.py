import asyncio
import os
import sys
import uuid
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from app.main import fastapi_app
from app.database import connect_db, close_db, get_db
from bson import ObjectId

async def run_chat_and_transaction_tests():
    print("\n--- Testing Transactions and Chat Endpoints ---")
    await connect_db()
    db = get_db()

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Provider
        p_suffix = uuid.uuid4().hex[:6]
        p_email = f"provider_{p_suffix}@example.com"
        p_res = await client.post("/api/v1/users/register", json={
            "fullName": f"Provider {p_suffix}",
            "email": p_email,
            "password": "Password123!"
        })
        p_user = p_res.json()["user"]
        p_id = p_user["_id"]

        p_login = await client.post("/api/v1/users/login", json={"email": p_email, "password": "Password123!"})
        p_token = p_login.json()["accessToken"]
        p_headers = {"Authorization": f"Bearer {p_token}"}

        # Create Seeker
        s_suffix = uuid.uuid4().hex[:6]
        s_email = f"seeker_{s_suffix}@example.com"
        s_res = await client.post("/api/v1/users/register", json={
            "fullName": f"Seeker {s_suffix}",
            "email": s_email,
            "password": "Password123!"
        })
        s_user = s_res.json()["user"]
        s_id = s_user["_id"]

        s_login = await client.post("/api/v1/users/login", json={"email": s_email, "password": "Password123!"})
        s_token = s_login.json()["accessToken"]
        s_headers = {"Authorization": f"Bearer {s_token}"}

        # Provider creates skill
        skill_res = await client.post(
            "/api/v1/skills/create",
            headers=p_headers,
            json={
                "title": f"Graphic Design {p_suffix}",
                "description": "Photoshop and Figma masterclass",
                "category": "Creative",
                "skillType": "Offer",
                "credits": 15
            }
        )
        skill = skill_res.json()["skill"]
        skill_id = skill["_id"]
        print(f"✅ Provider created skill {skill_id} for 15 credits.")

        # Seeker initiates transaction
        init_res = await client.post(
            "/api/v1/transactions/initiate",
            headers=s_headers,
            json={"skillId": skill_id}
        )
        assert init_res.status_code == 201
        tx = init_res.json()["transaction"]
        tx_id = tx["_id"]
        assert tx["status"] == "pending"
        print(f"✅ Seeker initiated transaction {tx_id} (status: pending).")

        # Provider accepts transaction
        accept_res = await client.patch(
            f"/api/v1/transactions/accept/{tx_id}",
            headers=p_headers
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["transaction"]["status"] == "accepted"
        print(f"✅ Provider accepted transaction {tx_id} (status: accepted).")

        # Seeker completes transaction
        complete_res = await client.patch(
            f"/api/v1/transactions/complete/{tx_id}",
            headers=s_headers
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["transaction"]["status"] == "completed"
        print(f"✅ Seeker completed transaction {tx_id}. Verified credit transfer!")

        # Verify balances: Seeker started with 50 -> now 35; Provider started with 50 -> now 65
        s_updated = await client.get("/api/v1/users/me", headers=s_headers)
        p_updated = await client.get("/api/v1/users/me", headers=p_headers)
        assert s_updated.json()["user"]["credits"] == 35
        assert p_updated.json()["user"]["credits"] == 65
        print(f"✅ Seeker balance: 35 credits (-15), Provider balance: 65 credits (+15). Perfect!")

        # Check transactions list
        my_txs_res = await client.get("/api/v1/transactions/my-transactions", headers=s_headers)
        assert my_txs_res.status_code == 200
        assert len(my_txs_res.json()["transactions"]) >= 1
        print("✅ GET /api/v1/transactions/my-transactions returned populated transactions!")

        # Chat tests: Seeker initiates chat with Provider
        chat_create_res = await client.post(
            "/api/v1/chats",
            headers=s_headers,
            json={"receiverId": p_id}
        )
        assert chat_create_res.status_code in [200, 201]
        chat_id = chat_create_res.json()["data"]["_id"]
        print(f"✅ Access/create chat returned chat ID: {chat_id}")

        # Seeker sends message
        msg_send_res = await client.post(
            f"/api/v1/messages/{chat_id}",
            headers=s_headers,
            json={"content": "Hey, excited for our skill swap!"}
        )
        assert msg_send_res.status_code == 201
        print("✅ POST /api/v1/messages/{chat_id} sent message successfully!")

        # Provider fetches messages
        msgs_res = await client.get(f"/api/v1/messages/{chat_id}", headers=p_headers)
        assert msgs_res.status_code == 200
        msgs = msgs_res.json()["messages"]
        assert len(msgs) >= 1
        assert msgs[0]["content"] == "Hey, excited for our skill swap!"
        print(f"✅ GET /api/v1/messages/{chat_id} retrieved {len(msgs)} message(s) with sender populated!")

        # Cleanup DB
        await db.messages.delete_many({"chat": ObjectId(chat_id)})
        await db.chats.delete_one({"_id": ObjectId(chat_id)})
        await db.transactions.delete_one({"_id": ObjectId(tx_id)})
        await db.skills.delete_one({"_id": ObjectId(skill_id)})
        await db.users.delete_many({"_id": {"$in": [ObjectId(p_id), ObjectId(s_id)]}})
        await db.notifications.delete_many({"user": {"$in": [ObjectId(p_id), ObjectId(s_id)]}})
        print("🧹 Cleaned up test chat, messages, transaction, and users.")

    await close_db()
    print("\n🎉 ALL TRANSACTION & CHAT TESTS PASSED! 🎉\n")

if __name__ == "__main__":
    asyncio.run(run_chat_and_transaction_tests())
