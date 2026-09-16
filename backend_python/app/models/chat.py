from pydantic import BaseModel, Field
from typing import Optional, List, Any

class ChatAccessRequest(BaseModel):
    receiverId: str

class ChatResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str = "One-to-One Chat"
    participants: List[Any] = []
    lastMessage: Optional[Any] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
