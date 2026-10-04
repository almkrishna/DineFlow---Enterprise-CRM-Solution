from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu import MenuItem
from app.models.customer import Customer
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Minutes between two datetime columns (SQLite julianday returns days).
def minutes_between(start_col, end_col):
    return (func.julianday(end_col) - func.julianday(start_col)) * 24 * 60


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    completed = db.query(Order).filter(Order.status == "completed")
    total_revenue = db.query(func.sum(Order.grand_total)).filter(Order.status == "completed").scalar() or 0
    completed_count = completed.count()
    total_orders = db.query(func.count(Order.id)).filter(Order.status != "cancelled").scalar() or 0
    avg_order_value = (total_revenue / completed_count) if completed_count > 0 else 0
    total_customers = db.query(func.count(Customer.id)).scalar() or 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_revenue = db.query(func.sum(Order.grand_total)).filter(
        Order.status == "completed", Order.created_at >= today_start).scalar() or 0
    today_orders = db.query(func.count(Order.id)).filter(
        Order.status != "cancelled", Order.created_at >= today_start).scalar() or 0

    avg_prep = db.query(func.avg(minutes_between(Order.created_at, Order.completed_at))).filter(
        Order.status == "completed", Order.completed_at.isnot(None)).scalar()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_total = db.query(func.count(Order.id)).filter(Order.created_at >= thirty_days_ago).scalar() or 0
    recent_cancelled = db.query(func.count(Order.id)).filter(
        Order.created_at >= thirty_days_ago, Order.status == "cancelled").scalar() or 0

    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "avg_order_value": float(avg_order_value),
        "total_customers": total_customers,
        "today_revenue": float(today_revenue),
        "today_orders": today_orders,
        "avg_prep_minutes": round(avg_prep, 1) if avg_prep else None,
        "cancellation_rate": round((recent_cancelled / recent_total) * 100, 1) if recent_total else 0,
    }


@router.get("/daily-sales")
def get_daily_sales(db: Session = Depends(get_db)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    day = func.date(Order.created_at, 'localtime')
    sales = db.query(
        day.label('date'),
        func.sum(Order.grand_total).label('revenue'),
        func.count(Order.id).label('order_count')
    ).filter(
        Order.created_at >= thirty_days_ago,
        Order.status == "completed",
    ).group_by(day).order_by(day).all()

    return [{"date": str(s.date), "revenue": float(s.revenue), "order_count": s.order_count} for s in sales]


@router.get("/top-items")
def get_top_items(db: Session = Depends(get_db)):
    top_items = db.query(
        MenuItem.name.label('item_name'),
        func.sum(OrderItem.quantity).label('quantity_sold'),
        func.sum(OrderItem.subtotal).label('revenue')
    ).join(Order, OrderItem.order_id == Order.id
    ).join(MenuItem, OrderItem.item_id == MenuItem.id
    ).filter(Order.status == "completed"
    ).group_by(MenuItem.id).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()

    return [{
        "item_name": item.item_name,
        "quantity_sold": item.quantity_sold,
        "revenue": float(item.revenue),
    } for item in top_items]


@router.get("/operations")
def get_operations(db: Session = Depends(get_db)):
    """Kitchen performance + cancellations, powered by the status-transition timestamps."""
    done = [Order.status == "completed", Order.completed_at.isnot(None)]

    prep_minutes = minutes_between(Order.created_at, Order.completed_at)
    avg_prep, fastest, slowest = db.query(
        func.avg(prep_minutes), func.min(prep_minutes), func.max(prep_minutes)
    ).filter(*done).one()

    # Average time spent in each kitchen stage
    stage_accept = db.query(func.avg(minutes_between(Order.created_at, Order.preparing_at))).filter(
        *done, Order.preparing_at.isnot(None)).scalar()
    stage_cook = db.query(func.avg(minutes_between(Order.preparing_at, Order.ready_at))).filter(
        *done, Order.preparing_at.isnot(None), Order.ready_at.isnot(None)).scalar()
    stage_serve = db.query(func.avg(minutes_between(Order.ready_at, Order.completed_at))).filter(
        *done, Order.ready_at.isnot(None)).scalar()

    # Daily average prep time, last 14 days
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    day = func.date(Order.created_at, 'localtime')
    trend = db.query(
        day.label('date'),
        func.avg(prep_minutes).label('avg_prep'),
        func.count(Order.id).label('order_count'),
    ).filter(*done, Order.created_at >= fourteen_days_ago).group_by(day).order_by(day).all()

    # Orders & revenue by hour of day, last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    hour = func.strftime('%H', Order.created_at, 'localtime')
    by_hour = db.query(
        hour.label('hour'),
        func.count(Order.id).label('order_count'),
        func.sum(Order.grand_total).label('revenue'),
    ).filter(Order.status == "completed", Order.created_at >= thirty_days_ago).group_by(hour).all()
    hours_map = {int(h.hour): h for h in by_hour}
    peak_hours = [{
        "hour": h,
        "label": f"{(h % 12) or 12}{'am' if h < 12 else 'pm'}",
        "order_count": hours_map[h].order_count if h in hours_map else 0,
        "revenue": float(hours_map[h].revenue) if h in hours_map else 0,
    } for h in range(10, 24)]  # restaurant hours 10am-11pm

    # Cancellations, last 30 days
    cancelled_q = db.query(Order).filter(Order.status == "cancelled", Order.created_at >= thirty_days_ago)
    cancelled_count = cancelled_q.count()
    lost_revenue = db.query(func.sum(Order.grand_total)).filter(
        Order.status == "cancelled", Order.created_at >= thirty_days_ago).scalar() or 0
    total_recent = db.query(func.count(Order.id)).filter(Order.created_at >= thirty_days_ago).scalar() or 0
    reasons = db.query(
        Order.cancel_reason, func.count(Order.id).label('count')
    ).filter(Order.status == "cancelled", Order.created_at >= thirty_days_ago).group_by(Order.cancel_reason).all()

    return {
        "prep": {
            "avg_minutes": round(avg_prep, 1) if avg_prep else None,
            "fastest_minutes": round(fastest, 1) if fastest else None,
            "slowest_minutes": round(slowest, 1) if slowest else None,
            "stage_minutes": {
                "accept": round(stage_accept, 1) if stage_accept else None,
                "cooking": round(stage_cook, 1) if stage_cook else None,
                "serving": round(stage_serve, 1) if stage_serve else None,
            },
        },
        "prep_trend": [
            {"date": str(t.date), "avg_prep": round(t.avg_prep, 1), "order_count": t.order_count}
            for t in trend
        ],
        "peak_hours": peak_hours,
        "cancellations": {
            "count": cancelled_count,
            "rate": round((cancelled_count / total_recent) * 100, 1) if total_recent else 0,
            "lost_revenue": float(lost_revenue),
            "reasons": [
                {"reason": r.cancel_reason or "No reason given", "count": r.count}
                for r in sorted(reasons, key=lambda x: -x.count)
            ],
        },
    }
