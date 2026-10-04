from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    status = Column(String(20), default="received")
    total_amount = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    grand_total = Column(Numeric(10, 2), default=0)
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(20), nullable=True)
    cancel_reason = Column(String(255), nullable=True)
    bill_printed = Column(Boolean, default=False)
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    preparing_at = Column(DateTime, nullable=True)
    ready_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    items = relationship("OrderItem", back_populates="order")
    customer = relationship("Customer", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    item_id = Column(Integer, ForeignKey("menu_items.id"))
    variant_id = Column(Integer, ForeignKey("variants.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    add_on_ids = Column(JSON, nullable=True)
    add_on_names = Column(JSON, nullable=True)
    add_on_total = Column(Numeric(10, 2), default=0)
    round_number = Column(Integer, default=1)

    order = relationship("Order", back_populates="items")
    item = relationship("MenuItem")
    variant = relationship("Variant")
