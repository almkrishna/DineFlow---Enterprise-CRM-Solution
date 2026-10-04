from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("MenuItem", back_populates="category")

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True)
    is_veg = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="items")
    variants = relationship("Variant", back_populates="item")
    add_ons = relationship("AddOn", back_populates="item")

class Variant(Base):
    __tablename__ = "variants"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"))
    name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    item = relationship("MenuItem", back_populates="variants")

class AddOn(Base):
    __tablename__ = "add_ons"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"))
    name = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    item = relationship("MenuItem", back_populates="add_ons")
