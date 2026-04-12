from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    """
    User model. Each user belongs to a business.
    supabase_uid links this record to a Supabase Auth user (the JWT `sub` claim).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    supabase_uid = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    business = relationship("Business", back_populates="users")
