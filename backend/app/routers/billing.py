from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas.billing import BillOut, BillItemOut
from decimal import Decimal
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/bills", tags=["Billing"])

@router.get("/{order_id}", response_model=BillOut)
def get_bill(order_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    items_out = []
    for item in order.items:
        items_out.append(BillItemOut(
            item_name=item.item.name,
            variant_name=item.variant.name if item.variant else None,
            quantity=item.quantity,
            unit_price=item.unit_price,
            add_ons=item.add_on_names if item.add_on_names else [],
            add_on_total=item.add_on_total,
            subtotal=item.subtotal
        ))
        
    return BillOut(
        order_id=order.id,
        table_number=order.table_number,
        items=items_out,
        subtotal=order.total_amount,
        tax_rate=Decimal('0.05'),
        tax_amount=order.tax_amount,
        grand_total=order.grand_total,
        payment_status=order.payment_status,
        created_at=order.created_at
    )
