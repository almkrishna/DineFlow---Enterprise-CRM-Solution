from pydantic import BaseModel
from typing import List
from decimal import Decimal
from datetime import datetime

class BillItemOut(BaseModel):
    item_name: str
    variant_name: str | None
    quantity: int
    unit_price: Decimal
    add_ons: List[str]
    add_on_total: Decimal
    subtotal: Decimal

class BillOut(BaseModel):
    order_id: int
    table_number: int
    items: List[BillItemOut]
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    grand_total: Decimal
    payment_status: str
    created_at: datetime
