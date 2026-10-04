from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models.customer import Customer
from app.models.campaign import Campaign
from app.schemas.crm import SegmentDistribution, CustomerOut, CampaignOut, CampaignSendResponse
from app.services.rfm_engine import calculate_rfm_scores
from app.services.campaign_engine import generate_default_campaigns
from datetime import datetime, timedelta

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    total = db.query(func.count(Customer.id)).scalar() or 0
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    new_customers_30d = db.query(func.count(Customer.id)).filter(
        Customer.first_order_date >= thirty_days_ago).scalar() or 0
    active_30d = db.query(func.count(Customer.id)).filter(
        Customer.last_order_date >= thirty_days_ago).scalar() or 0
    repeat_customers = db.query(func.count(Customer.id)).filter(Customer.total_orders >= 2).scalar() or 0
    avg_spend = db.query(func.avg(Customer.total_spent)).filter(Customer.total_orders > 0).scalar() or 0

    top_spenders = db.query(Customer).filter(Customer.total_orders > 0).order_by(
        Customer.total_spent.desc()).limit(5).all()

    at_risk_value = db.query(func.sum(Customer.total_spent)).filter(
        Customer.segment.in_(["at_risk", "cant_lose"])).scalar() or 0

    return {
        "total_customers": total,
        "new_customers_30d": new_customers_30d,
        "active_customers_30d": active_30d,
        "repeat_rate": round((repeat_customers / total) * 100, 1) if total else 0,
        "avg_customer_spend": float(avg_spend),
        "at_risk_value": float(at_risk_value),
        "top_spenders": [{
            "id": c.id,
            "name": c.name or "Guest",
            "phone": c.phone,
            "total_spent": float(c.total_spent or 0),
            "total_orders": c.total_orders,
            "segment": c.segment,
        } for c in top_spenders],
    }

@router.get("/segments", response_model=SegmentDistribution)
def get_segments(db: Session = Depends(get_db)):
    total = db.query(func.count(Customer.id)).scalar() or 0
    if total == 0:
        return SegmentDistribution(segments=[], total_customers=0)
        
    segments = db.query(Customer.segment, func.count(Customer.id).label('count')).group_by(Customer.segment).all()
    colors = {
        'champions': '#4caf50',
        'loyal': '#8bc34a',
        'potential_loyalists': '#ffeb3b',
        'at_risk': '#ff9800',
        'cant_lose': '#f44336',
        'lost': '#9e9e9e'
    }
    
    seg_data = []
    for s in segments:
        if not s.segment:
            continue
        seg_data.append({
            "name": s.segment,
            "count": s.count,
            "percentage": (s.count / total) * 100,
            "color": colors.get(s.segment, '#000000')
        })
        
    return SegmentDistribution(segments=seg_data, total_customers=total)

@router.get("/customers", response_model=list[CustomerOut])
def get_customers(segment: str = None, search: str = None, sort_by: str = None, db: Session = Depends(get_db)):
    query = db.query(Customer)
    if segment:
        query = query.filter(Customer.segment == segment)
    if search:
        query = query.filter(or_(Customer.name.ilike(f"%{search}%"), Customer.phone.ilike(f"%{search}%")))
    if sort_by == 'rfm_score':
        query = query.order_by(Customer.rfm_score.desc())
    elif sort_by == 'segment':
        query = query.order_by(Customer.segment)
    return query.all()

@router.get("/campaigns", response_model=list[CampaignOut])
def get_campaigns(db: Session = Depends(get_db)):
    generate_default_campaigns(db)
    return db.query(Campaign).all()

@router.post("/campaigns/{id}/send", response_model=CampaignSendResponse)
def send_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    campaign.status = 'sent'
    db.commit()
    return CampaignSendResponse(
        message="Campaign sent successfully (Mock)",
        customers_reached=campaign.estimated_reach
    )

@router.post("/recalculate")
def recalculate_rfm(db: Session = Depends(get_db)):
    calculate_rfm_scores(db)
    return {"message": "RFM scores recalculated successfully"}
