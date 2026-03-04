from pydantic import BaseModel
from typing import Optional

class BusinessBase(BaseModel):
    name: str
    google_calendar_id: Optional[str] = None
    timezone: Optional[str] = None

class BusinessCreate(BusinessBase):
    pass

class Business(BusinessBase):
    id: int
    class Config:
        orm_mode = True
