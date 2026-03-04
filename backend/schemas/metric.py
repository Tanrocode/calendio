from pydantic import BaseModel

class MetricBase(BaseModel):
    business_id: int
    total_conversations: int = 0
    total_appointments_created: int = 0

class MetricCreate(MetricBase):
    pass

class Metric(MetricBase):
    id: int
    class Config:
        orm_mode = True
