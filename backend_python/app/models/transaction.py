from pydantic import BaseModel, Field
from typing import Optional, Literal

TransactionStatus = Literal["pending", "accepted", "completed", "cancelled", "disputed"]

class TransactionInitiateRequest(BaseModel):
    skillId: str

class TransactionResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    skill: Optional[dict] = None
    seeker: Optional[dict] = None
    provider: Optional[dict] = None
    credits: int
    status: TransactionStatus = "pending"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
