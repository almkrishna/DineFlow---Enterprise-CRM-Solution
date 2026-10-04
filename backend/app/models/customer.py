from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, nullable=False)
    name = Column(String(100), nullable=True)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Numeric(12, 2), default=0)
    last_order_date = Column(DateTime, nullable=True)
    first_order_date = Column(DateTime, nullable=True)
    rfm_recency = Column(Integer, nullable=True)
    rfm_frequency = Column(Integer, nullable=True)
    rfm_monetary = Column(Integer, nullable=True)
    rfm_score = Column(Integer, nullable=True)
    segment = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")
