from pydantic import BaseModel, Field
from typing import Optional, Literal, Any

NotificationType = Literal["MESSAGE", "TRANSACTION", "SKILL"]
TypeRefEnum = Literal["Chat", "Transaction", "Skill"]

class NotificationResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user: Any
    type: NotificationType
    content: str
    isRead: bool = False
    relatedId: Optional[Any] = None
    typeRef: Optional[TypeRefEnum] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
