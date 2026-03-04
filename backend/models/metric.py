from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Metric(Base):
    """
    Metric model. Stores business-level metrics.
    """
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    total_conversations = Column(Integer, default=0)
    total_appointments_created = Column(Integer, default=0)

    business = relationship("Business", back_populates="metrics")
