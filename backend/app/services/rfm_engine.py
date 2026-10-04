from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.customer import Customer
from app.models.order import Order
from datetime import datetime


def refresh_customer_stats(db: Session) -> None:
    """Rebuild every customer's order stats from the orders table, so customers
    created through live ordering (not just the seed) are counted."""
    stats = {
        row.customer_id: row
        for row in db.query(
            Order.customer_id,
            func.count(Order.id).label("order_count"),
            func.sum(Order.grand_total).label("spent"),
            func.min(Order.created_at).label("first_order"),
            func.max(Order.created_at).label("last_order"),
        ).filter(
            Order.customer_id.isnot(None),
            Order.status != "cancelled",
        ).group_by(Order.customer_id).all()
    }
    for c in db.query(Customer).all():
        row = stats.get(c.id)
        c.total_orders = row.order_count if row else 0
        c.total_spent = row.spent if row else 0
        c.first_order_date = row.first_order if row else None
        c.last_order_date = row.last_order if row else None


def calculate_rfm_scores(db: Session) -> None:
    refresh_customer_stats(db)
    customers = db.query(Customer).all()
    now = datetime.utcnow()

    for c in customers:
        if not c.last_order_date:
            c.rfm_recency = c.rfm_frequency = c.rfm_monetary = c.rfm_score = None
            c.segment = None
            continue

        days_since_last_order = (now - c.last_order_date).days

        # Recency
        if days_since_last_order <= 7: r = 5
        elif days_since_last_order <= 14: r = 4
        elif days_since_last_order <= 30: r = 3
        elif days_since_last_order <= 60: r = 2
        else: r = 1

        # Frequency
        if c.total_orders >= 10: f = 5
        elif c.total_orders >= 7: f = 4
        elif c.total_orders >= 4: f = 3
        elif c.total_orders >= 2: f = 2
        else: f = 1

        # Monetary
        spend = c.total_spent
        if spend >= 5000: m = 5
        elif spend >= 3000: m = 4
        elif spend >= 1500: m = 3
        elif spend >= 500: m = 2
        else: m = 1

        c.rfm_recency = r
        c.rfm_frequency = f
        c.rfm_monetary = m
        c.rfm_score = r + f + m

        # Segment Assignment
        if r >= 4 and f >= 4 and m >= 4:
            c.segment = 'champions'
        elif r >= 3 and f >= 3 and m >= 3:
            c.segment = 'loyal'
        elif r >= 4 and f <= 2:
            c.segment = 'potential_loyalists'
        elif r <= 2 and f >= 3:
            c.segment = 'at_risk'
        elif r <= 2 and f >= 4 and m >= 4:
            c.segment = 'cant_lose'
        elif r <= 1 and f <= 2 and m <= 2:
            c.segment = 'lost'
        else:
            c.segment = 'loyal' if r >= 3 else 'potential_loyalists'

    db.commit()
