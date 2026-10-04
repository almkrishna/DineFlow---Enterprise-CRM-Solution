from pydantic import BaseModel, Field, PlainSerializer, field_validator
from typing import List, Optional, Annotated
from decimal import Decimal
from datetime import datetime, timezone


def _to_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

# Naive datetimes in the DB are UTC; serialize them with an explicit offset
# so browsers in any timezone parse them correctly.
UTCDateTime = Annotated[datetime, PlainSerializer(_to_utc_iso, return_type=Optional[str])]


class OrderItemCreate(BaseModel):
    item_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(ge=1, le=50)
    add_on_ids: List[int] = []

class OrderCreate(BaseModel):
    table_number: int = Field(ge=1, le=50)
    customer_phone: str = Field(pattern=r'^[6-9]\d{9}$')
    customer_name: str = Field(min_length=1, max_length=100)
    items: List[OrderItemCreate]

    @field_validator('customer_name')
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Name is required')
        return value

    @field_validator('customer_phone', mode='before')
    @classmethod
    def clean_phone(cls, value):
        if isinstance(value, str):
            return value.replace(' ', '').replace('-', '').removeprefix('+91')
        return value

class OrderItemOut(BaseModel):
    id: int
    item_name: str
    is_veg: bool = True
    variant_name: Optional[str]
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    add_on_names: List[str]
    add_on_total: Decimal
    round_number: int = 1
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    table_number: int
    status: str
    total_amount: Decimal
    tax_amount: Decimal
    grand_total: Decimal
    payment_status: str
    payment_method: Optional[str] = None
    cancel_reason: Optional[str] = None
    bill_printed: bool = False
    items: List[OrderItemOut]
    created_at: UTCDateTime
    updated_at: UTCDateTime
    preparing_at: Optional[UTCDateTime] = None
    ready_at: Optional[UTCDateTime] = None
    completed_at: Optional[UTCDateTime] = None
    cancelled_at: Optional[UTCDateTime] = None
    is_new_order: bool = True
    current_round: int = 1
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class BillPrintedUpdate(BaseModel):
    printed: bool
