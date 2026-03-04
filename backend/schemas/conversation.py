from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ConversationBase(BaseModel):
    business_id: int
    message: str
    response: str
    timestamp: datetime

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: int
    class Config:
        orm_mode = True
