from datetime import datetime
from bson import ObjectId
from typing import Optional, Any
from app.database import get_db, to_object_id, serialize_doc
from app.sockets.chat_socket import sio
import logging

logger = logging.getLogger("skillswap.notifications")

async def create_notification(
    user_id: Any,
    notif_type: str,
    content: str,
    related_id: Optional[Any] = None,
    type_ref: Optional[str] = None
):
    try:
        db = get_db()
        u_id = to_object_id(user_id)
        r_id = to_object_id(related_id) if related_id else None

        now = datetime.utcnow()
        doc = {
            "user": u_id,
            "type": notif_type,
            "content": content,
            "isRead": False,
            "relatedId": r_id,
            "typeRef": type_ref,
            "createdAt": now,
            "updatedAt": now
        }
        res = await db.notifications.insert_one(doc)
        doc["_id"] = res.inserted_id

        serialized = serialize_doc(doc)
        # Emit real-time notification to user's room
        await sio.emit("new_notification", serialized, room=str(user_id))
        return serialized
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return None
