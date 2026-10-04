from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu import MenuItem, Variant, AddOn
from app.models.customer import Customer
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderItemOut, BillPrintedUpdate
from decimal import Decimal
from datetime import datetime, timedelta
import json
from .kitchen import manager
from .auth import get_current_admin, get_current_kitchen_user

router = APIRouter(prefix="/orders", tags=["Orders"])

ACTIVE_STATUSES = {"received", "preparing", "ready"}
TAX_RATE = Decimal("0.05")
# A table's open order accepts extra rounds for this long after it was created.
APPEND_WINDOW_HOURS = 3


def serialize_order(order: Order, is_new_order: bool = True) -> OrderOut:
    items_out = []
    max_round = 1
    for i in order.items:
        round_number = i.round_number or 1
        max_round = max(max_round, round_number)
        items_out.append(OrderItemOut(
            id=i.id,
            item_name=i.item.name,
            is_veg=i.item.is_veg if i.item.is_veg is not None else True,
            variant_name=i.variant.name if i.variant else None,
            quantity=i.quantity,
            unit_price=i.unit_price,
            subtotal=i.subtotal,
            add_on_names=i.add_on_names if i.add_on_names else [],
            add_on_total=i.add_on_total or 0,
            round_number=round_number,
        ))
    return OrderOut(
        id=order.id,
        table_number=order.table_number,
        status=order.status,
        total_amount=order.total_amount,
        tax_amount=order.tax_amount,
        grand_total=order.grand_total,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        cancel_reason=order.cancel_reason,
        bill_printed=bool(order.bill_printed),
        items=items_out,
        created_at=order.created_at,
        updated_at=order.updated_at,
        preparing_at=order.preparing_at,
        ready_at=order.ready_at,
        completed_at=order.completed_at,
        cancelled_at=order.cancelled_at,
        is_new_order=is_new_order,
        current_round=max_round,
    )


async def broadcast_order_event(event_type: str, order_out: OrderOut):
    await manager.broadcast(json.dumps({
        "type": event_type,
        "data": json.loads(order_out.model_dump_json()),
    }))


def build_order_items(order_data: OrderCreate, db: Session, round_number: int):
    """Validate requested items and return (order_items, round_total). Does not commit."""
    items = []
    round_total = Decimal(0)
    for item_data in order_data.items:
        db_item = db.query(MenuItem).filter(MenuItem.id == item_data.item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.item_id} not found")
        if not db_item.is_available:
            raise HTTPException(status_code=409, detail=f"'{db_item.name}' is no longer available. Please refresh the menu.")

        unit_price = db_item.base_price
        if item_data.variant_id:
            db_variant = db.query(Variant).filter(Variant.id == item_data.variant_id).first()
            if not db_variant or db_variant.item_id != db_item.id:
                raise HTTPException(status_code=422, detail="Invalid variant for selected menu item")
            unit_price = db_variant.price

        add_on_names = []
        add_on_total = Decimal(0)
        for ao_id in item_data.add_on_ids:
            db_ao = db.query(AddOn).filter(AddOn.id == ao_id).first()
            if not db_ao or db_ao.item_id != db_item.id:
                raise HTTPException(status_code=422, detail="Invalid add-on for selected menu item")
            add_on_names.append(db_ao.name)
            add_on_total += db_ao.price

        subtotal = (unit_price * item_data.quantity) + add_on_total
        round_total += subtotal
        items.append(OrderItem(
            item_id=db_item.id,
            variant_id=item_data.variant_id,
            quantity=item_data.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
            add_on_ids=item_data.add_on_ids,
            add_on_names=add_on_names,
            add_on_total=add_on_total,
            round_number=round_number,
        ))
    return items, round_total


def refresh_one_customer_stats(db: Session, customer_id: int) -> None:
    """Keep the CRM directory current: recompute one customer's stats from their orders."""
    if not customer_id:
        return
    row = db.query(
        func.count(Order.id), func.sum(Order.grand_total),
        func.min(Order.created_at), func.max(Order.created_at),
    ).filter(Order.customer_id == customer_id, Order.status != "cancelled").first()
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer:
        customer.total_orders = row[0] or 0
        customer.total_spent = row[1] or 0
        customer.first_order_date = row[2]
        customer.last_order_date = row[3]
        db.commit()


def get_or_create_customer(db: Session, phone: str, name: str) -> Customer:
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        customer = Customer(phone=phone, name=name)
        db.add(customer)
        db.flush()
    elif name and not customer.name:
        customer.name = name
    return customer


def find_open_order(db: Session, table_number: int) -> Order:
    cutoff = datetime.utcnow() - timedelta(hours=APPEND_WINDOW_HOURS)
    return (
        db.query(Order)
        .filter(
            Order.table_number == table_number,
            Order.status.in_(ACTIVE_STATUSES),
            Order.payment_status == "pending",
            Order.created_at >= cutoff,
        )
        .order_by(Order.id.desc())
        .first()
    )


@router.post("", response_model=OrderOut)
async def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    if not order_data.items:
        raise HTTPException(status_code=422, detail="An order must contain at least one item")

    open_order = find_open_order(db, order_data.table_number)

    try:
        if open_order:
            # Append this round to the table's open order — one order ID, one bill.
            if not open_order.customer_id:
                open_order.customer_id = get_or_create_customer(
                    db, order_data.customer_phone, order_data.customer_name).id
            next_round = max((i.round_number or 1) for i in open_order.items) + 1 if open_order.items else 1
            new_items, round_total = build_order_items(order_data, db, next_round)
            for oi in new_items:
                oi.order_id = open_order.id
                db.add(oi)

            open_order.total_amount = (open_order.total_amount or 0) + round_total
            open_order.tax_amount = open_order.total_amount * TAX_RATE
            open_order.grand_total = open_order.total_amount + open_order.tax_amount
            # New food must be cooked: a 'ready' order goes back to 'preparing'.
            if open_order.status == "ready":
                open_order.status = "preparing"
            db.commit()
            db.refresh(open_order)
            refresh_one_customer_stats(db, open_order.customer_id)

            order_out = serialize_order(open_order, is_new_order=False)
            await broadcast_order_event("order_updated", order_out)
            return order_out

        new_order = Order(table_number=order_data.table_number)
        new_order.customer_id = get_or_create_customer(
            db, order_data.customer_phone, order_data.customer_name).id

        new_items, total_amount = build_order_items(order_data, db, round_number=1)
        new_order.total_amount = total_amount
        new_order.tax_amount = total_amount * TAX_RATE
        new_order.grand_total = total_amount + new_order.tax_amount
        db.add(new_order)
        db.flush()
        for oi in new_items:
            oi.order_id = new_order.id
            db.add(oi)
        db.commit()
        db.refresh(new_order)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to place order. Please try again.")

    refresh_one_customer_stats(db, new_order.customer_id)
    order_out = serialize_order(new_order, is_new_order=True)
    await broadcast_order_event("new_order", order_out)
    return order_out


@router.get("", response_model=list[OrderOut])
def list_orders(status: str = None, db: Session = Depends(get_db), current_user: str = Depends(get_current_kitchen_user)):
    query = db.query(Order)
    if status:
        statuses = [value.strip() for value in status.split(",") if value.strip()]
        query = query.filter(Order.status.in_(statuses))
    return [serialize_order(o) for o in query.all()]


@router.get("/{order_id}/track", response_model=OrderOut)
def track_order(order_id: int, db: Session = Depends(get_db)):
    """Public endpoint: lets the customer follow their own order live."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(o)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(o)


@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_kitchen_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    allowed_statuses = {"received", "preparing", "ready", "completed", "cancelled"}
    if status_update.status not in allowed_statuses:
        raise HTTPException(status_code=422, detail="Invalid order status")
    if order.status in {"completed", "cancelled"} and order.status != status_update.status:
        raise HTTPException(status_code=409, detail=f"Order is already {order.status}")

    now = datetime.utcnow()
    order.status = status_update.status
    if status_update.status == "preparing" and not order.preparing_at:
        order.preparing_at = now
    elif status_update.status == "ready":
        order.ready_at = now
        if not order.preparing_at:
            order.preparing_at = now
    elif status_update.status == "completed":
        order.completed_at = now
    elif status_update.status == "cancelled":
        order.cancelled_at = now
        order.cancel_reason = (status_update.reason or "").strip() or None
    db.commit()
    db.refresh(order)
    if status_update.status == "cancelled":
        refresh_one_customer_stats(db, order.customer_id)

    await broadcast_order_event("status_update", serialize_order(order))
    return {"message": "Status updated successfully"}


@router.patch("/{order_id}/bill-printed")
def set_bill_printed(order_id: int, update: "BillPrintedUpdate", db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.bill_printed = update.printed
    db.commit()
    return {"message": "Bill print status updated", "bill_printed": order.bill_printed}
