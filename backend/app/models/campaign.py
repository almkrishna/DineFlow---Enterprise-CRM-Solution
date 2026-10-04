from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    segment_target = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    message_template = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False)
    discount_percent = Column(Integer, nullable=True)
    status = Column(String(20), default="draft")
    estimated_reach = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
