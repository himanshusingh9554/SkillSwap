from fastapi import APIRouter, HTTPException, status, Depends
from app.models.message import MessageSendRequest
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])

@router.post("/{chatId}", status_code=status.HTTP_201_CREATED)
async def send_message(chatId: str, body: MessageSendRequest, current_user: dict = Depends(get_current_user)):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content required")

    chat_id = to_object_id(chatId)
    if not chat_id:
        raise HTTPException(status_code=400, detail="Invalid chat ID format")

    db = get_db()
    chat = await db.chats.find_one({"_id": chat_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    now = datetime.utcnow()
    sender_id = to_object_id(current_user["_id"])
    new_msg = {
        "sender": sender_id,
        "content": content,
        "chat": chat_id,
        "createdAt": now,
        "updatedAt": now
    }
    res = await db.messages.insert_one(new_msg)
    new_msg["_id"] = res.inserted_id

    # Update chat lastMessage
    await db.chats.update_one(
        {"_id": chat_id},
        {"$set": {"lastMessage": res.inserted_id, "updatedAt": now}}
    )

    # Populate sender
    sender = await db.users.find_one({"_id": sender_id}, {"fullName": 1, "profilePicture": 1})
    new_msg["sender"] = serialize_doc(sender)
    new_msg["chat"] = serialize_doc(chat)

    return {
        "success": True,
        "message": serialize_doc(new_msg)
    }

@router.get("/{chatId}")
async def get_messages(chatId: str, current_user: dict = Depends(get_current_user)):
    chat_id = to_object_id(chatId)
    if not chat_id:
        raise HTTPException(status_code=400, detail="Invalid chat ID format")

    db = get_db()
    cursor = db.messages.find({"chat": chat_id}).sort("createdAt", 1)
    msgs = await cursor.to_list(length=500)

    populated_msgs = []
    for m in msgs:
        sender_id = to_object_id(m.get("sender"))
        if sender_id:
            sender = await db.users.find_one({"_id": sender_id}, {"fullName": 1, "profilePicture": 1})
            m["sender"] = serialize_doc(sender) if sender else {"fullName": "Unknown"}
        populated_msgs.append(serialize_doc(m))

    return {
        "success": True,
        "messages": populated_msgs
    }
