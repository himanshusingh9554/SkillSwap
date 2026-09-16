from fastapi import APIRouter, HTTPException, status, Depends
from app.models.chat import ChatAccessRequest
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/chats", tags=["Chats"])

async def populate_chat(chat_doc: dict, db) -> dict:
    if not chat_doc:
        return chat_doc
    # Populate participants
    participants = []
    for pid in chat_doc.get("participants", []):
        p_obj_id = to_object_id(pid)
        if p_obj_id:
            u = await db.users.find_one({"_id": p_obj_id}, {"password": 0})
            if u:
                participants.append(serialize_doc(u))
    chat_doc["participants"] = participants

    # Populate lastMessage
    last_msg_id = chat_doc.get("lastMessage")
    if last_msg_id:
        msg_obj_id = to_object_id(last_msg_id)
        if msg_obj_id:
            msg = await db.messages.find_one({"_id": msg_obj_id})
            chat_doc["lastMessage"] = serialize_doc(msg)
    return chat_doc

@router.post("", include_in_schema=False)
@router.post("/")
async def access_or_create_chat(body: ChatAccessRequest, current_user: dict = Depends(get_current_user)):
    if not body.receiverId:
        raise HTTPException(status_code=400, detail="Receiver ID is required")

    db = get_db()
    sender_id = to_object_id(current_user["_id"])
    receiver_id = to_object_id(body.receiverId)

    if not receiver_id:
        raise HTTPException(status_code=400, detail="Invalid receiver ID format")

    existing_chat = await db.chats.find_one({
        "participants": {"$all": [sender_id, receiver_id]}
    })

    if existing_chat:
        populated = await populate_chat(existing_chat, db)
        return {
            "message": "Chat accessed successfully",
            "data": serialize_doc(populated)
        }

    now = datetime.utcnow()
    new_chat = {
        "name": "One-to-One Chat",
        "participants": [sender_id, receiver_id],
        "lastMessage": None,
        "createdAt": now,
        "updatedAt": now
    }
    res = await db.chats.insert_one(new_chat)
    new_chat["_id"] = res.inserted_id

    populated = await populate_chat(new_chat, db)
    return {
        "message": "Chat created successfully",
        "data": serialize_doc(populated)
    }

@router.get("", include_in_schema=False)
@router.get("/")
async def get_my_chats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = to_object_id(current_user["_id"])

    cursor = db.chats.find({
        "participants": {"$in": [user_id]}
    }).sort("updatedAt", -1)
    chats = await cursor.to_list(length=100)

    populated_chats = []
    for c in chats:
        p = await populate_chat(c, db)
        populated_chats.append(serialize_doc(p))

    return {
        "success": True,
        "data": populated_chats,
        "message": "User chats fetched successfully"
    }

@router.get("/{chatId}")
async def get_chat_details(chatId: str, current_user: dict = Depends(get_current_user)):
    chat_id = to_object_id(chatId)
    if not chat_id:
        raise HTTPException(status_code=400, detail="Invalid chat ID format")

    db = get_db()
    chat = await db.chats.find_one({"_id": chat_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    populated = await populate_chat(chat, db)
    return {
        "success": True,
        "data": serialize_doc(populated),
        "message": "Chat details fetched successfully"
    }
