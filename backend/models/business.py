from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base

class Business(Base):
    """
    Business model. Each business can have multiple users and appointments.
    """
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    google_calendar_id = Column(String, nullable=True)
    timezone = Column(String, nullable=True)

    users = relationship("User", back_populates="business")
    appointments = relationship("Appointment", back_populates="business")
    conversations = relationship("Conversation", back_populates="business")
    metrics = relationship("Metric", back_populates="business")
