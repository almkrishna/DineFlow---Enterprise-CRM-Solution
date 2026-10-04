from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class SegmentData(BaseModel):
    name: str
    count: int
    percentage: float
    color: str

class SegmentDistribution(BaseModel):
    segments: List[SegmentData]
    total_customers: int

class CustomerOut(BaseModel):
    id: int
    phone: str
    name: Optional[str]
    total_orders: int
    total_spent: Decimal
    last_order_date: Optional[datetime]
    segment: Optional[str]
    rfm_recency: Optional[int]
    rfm_frequency: Optional[int]
    rfm_monetary: Optional[int]
    rfm_score: Optional[int]
    class Config:
        from_attributes = True

class CampaignOut(BaseModel):
    id: int
    segment_target: str
    title: str
    message_template: str
    channel: str
    discount_percent: Optional[int]
    status: str
    estimated_reach: int
    created_at: datetime
    class Config:
        from_attributes = True

class CampaignSendResponse(BaseModel):
    message: str
    customers_reached: int
