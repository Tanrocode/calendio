from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str
    business_id: int

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    class Config:
        orm_mode = True
