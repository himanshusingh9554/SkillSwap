from pydantic import BaseModel, Field
from typing import Optional, Any

class MessageSendRequest(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    sender: Any
    content: str
    chat: Any
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
