from fastapi import APIRouter, HTTPException, status, Depends
from app.database import get_db, to_object_id, serialize_doc
from app.middleware.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

@router.get("", include_in_schema=False)
@router.get("/")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = to_object_id(current_user["_id"])

    cursor = db.notifications.find({"user": user_id}).sort("createdAt", -1).limit(20)
    notifs = await cursor.to_list(length=20)

    return {
        "success": True,
        "notifications": serialize_doc(notifs)
    }

@router.put("/{notificationId}/read")
async def mark_as_read(notificationId: str, current_user: dict = Depends(get_current_user)):
    notif_id = to_object_id(notificationId)
    if not notif_id:
        raise HTTPException(status_code=400, detail="Invalid notification ID format")

    db = get_db()
    res = await db.notifications.find_one_and_update(
        {"_id": notif_id},
        {"$set": {"isRead": True, "updatedAt": datetime.utcnow()}},
        return_document=True
    )

    if not res:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {
        "success": True,
        "notification": serialize_doc(res)
    }
