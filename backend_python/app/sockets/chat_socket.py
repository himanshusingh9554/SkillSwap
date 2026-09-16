import socketio
from datetime import datetime
from app.database import get_db, to_object_id, serialize_doc
import logging

logger = logging.getLogger("skillswap.sockets")

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

@sio.event
async def connect(sid, environ):
    logger.info(f"✅ User connected: {sid}")

@sio.event
async def setup(sid, userId):
    if userId:
        await sio.enter_room(sid, str(userId))
        logger.info(f"User {sid} associated with userId room: {userId}")

@sio.event
async def join_chat(sid, chatId):
    if chatId:
        await sio.enter_room(sid, str(chatId))
        logger.info(f"User {sid} joined chat room: {chatId}")

# Also support event name with space "join chat" as emitted by frontend: socket.emit('join chat', chatId)
@sio.on("join chat")
async def on_join_chat(sid, chatId):
    if chatId:
        await sio.enter_room(sid, str(chatId))
        logger.info(f"User {sid} joined chat room: {chatId}")

@sio.on("new message")
async def on_new_message(sid, data):
    if not isinstance(data, dict):
        logger.warning(f"Invalid data format for new message: {data}")
        return

    chat_id = data.get("chatId")
    sender_id = data.get("senderId")
    content = data.get("content")

    if not chat_id or not sender_id or not content:
        logger.warning(f"Missing required fields for new message: {data}")
        return

    try:
        db = get_db()
        chat_obj_id = to_object_id(chat_id)
        sender_obj_id = to_object_id(sender_id)

        now = datetime.utcnow()
        new_msg = {
            "sender": sender_obj_id,
            "content": content.strip(),
            "chat": chat_obj_id,
            "createdAt": now,
            "updatedAt": now
        }
        res = await db.messages.insert_one(new_msg)
        msg_id = res.inserted_id

        # Populate sender
        sender = await db.users.find_one({"_id": sender_obj_id}, {"fullName": 1, "profilePicture": 1})
        full_message = {
            "_id": str(msg_id),
            "sender": serialize_doc(sender),
            "content": content.strip(),
            "chat": str(chat_obj_id),
            "createdAt": now.isoformat(),
            "updatedAt": now.isoformat()
        }

        # Update chat lastMessage
        await db.chats.update_one(
            {"_id": chat_obj_id},
            {"$set": {"lastMessage": msg_id, "updatedAt": now}}
        )

        # Emit to chat room
        await sio.emit("message received", full_message, room=str(chat_id))

        # Notify participants
        chat = await db.chats.find_one({"_id": chat_obj_id})
        if chat and "participants" in chat:
            for participant_id in chat["participants"]:
                p_id_str = str(participant_id)
                if p_id_str != str(sender_id):
                    sender_name = sender.get("fullName", "Someone") if sender else "Someone"
                    notif_data = {
                        "user": participant_id,
                        "type": "MESSAGE",
                        "content": f"New message from {sender_name}",
                        "relatedId": chat_obj_id,
                        "typeRef": "Chat",
                        "isRead": False,
                        "createdAt": now,
                        "updatedAt": now
                    }
                    notif_res = await db.notifications.insert_one(notif_data)
                    notif_data["_id"] = str(notif_res.inserted_id)

                    await sio.emit("new_notification", serialize_doc(notif_data), room=p_id_str)
                    await sio.emit("notification", {
                        "userId": p_id_str,
                        "type": "MESSAGE"
                    }, room=str(chat_id))

    except Exception as e:
        logger.error(f"Error handling new message event: {e}")

@sio.event
async def disconnect(sid):
    logger.info(f"❌ User disconnected: {sid}")
