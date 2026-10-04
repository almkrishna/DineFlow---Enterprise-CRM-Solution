from pydantic import BaseModel
from decimal import Decimal
from typing import List, Optional

class AddOnOut(BaseModel):
    id: int
    name: str
    price: Decimal
    class Config:
        from_attributes = True

class VariantOut(BaseModel):
    id: int
    name: str
    price: Decimal
    class Config:
        from_attributes = True

class MenuItemOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    base_price: Decimal
    image_url: Optional[str]
    is_available: bool
    is_veg: bool = True
    variants: List[VariantOut]
    add_ons: List[AddOnOut]
    class Config:
        from_attributes = True

class CategoryWithItems(BaseModel):
    id: int
    name: str
    display_order: int
    items: List[MenuItemOut]
    class Config:
        from_attributes = True

class MenuResponse(BaseModel):
    categories: List[CategoryWithItems]

class VariantIn(BaseModel):
    id: Optional[int] = None
    name: str
    price: Decimal

class AddOnIn(BaseModel):
    id: Optional[int] = None
    name: str
    price: Decimal

class MenuItemCreate(BaseModel):
    category_id: Optional[int] = None
    new_category_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    base_price: Decimal
    image_url: Optional[str] = None
    is_available: bool = True
    is_veg: bool = True
    variants: List[VariantIn] = []
    add_ons: List[AddOnIn] = []

class MenuItemUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_veg: Optional[bool] = None
    variants: Optional[List[VariantIn]] = None
    add_ons: Optional[List[AddOnIn]] = None

class AvailabilityUpdate(BaseModel):
    is_available: bool

class CategoryCreate(BaseModel):
    name: str
    display_order: int = 0
