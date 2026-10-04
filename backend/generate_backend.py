import os

base_dir = r"d:\crm project\backend"

files = {
    "requirements.txt": """fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
mysql-connector-python==9.0.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-dotenv==1.0.1
razorpay==1.4.2
websockets==13.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
""",
    ".env.example": """DATABASE_URL=mysql+mysqlconnector://root:password@localhost:3306/restaurant_crm
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SECRET_KEY=your-secret-key-here
""",
    ".env": """DATABASE_URL=sqlite:///./restaurant_crm.db
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SECRET_KEY=your-secret-key-here
""",
    "app/__init__.py": "",
    "app/config.py": """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    SECRET_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()
""",
    "app/database.py": """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    "app/models/__init__.py": """from .menu import Category, MenuItem, Variant, AddOn
from .order import Order, OrderItem
from .customer import Customer
from .campaign import Campaign
""",
    "app/models/menu.py": """from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, DateTime, Text
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
""",
    "app/models/order.py": """from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    status = Column(String(20), default="received")
    total_amount = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    grand_total = Column(Numeric(10, 2), default=0)
    payment_status = Column(String(20), default="pending")
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")
    customer = relationship("Customer", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    item_id = Column(Integer, ForeignKey("menu_items.id"))
    variant_id = Column(Integer, ForeignKey("variants.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    add_on_ids = Column(JSON, nullable=True)
    add_on_names = Column(JSON, nullable=True)
    add_on_total = Column(Numeric(10, 2), default=0)

    order = relationship("Order", back_populates="items")
    item = relationship("MenuItem")
    variant = relationship("Variant")
""",
    "app/models/customer.py": """from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, nullable=False)
    name = Column(String(100), nullable=True)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Numeric(12, 2), default=0)
    last_order_date = Column(DateTime, nullable=True)
    first_order_date = Column(DateTime, nullable=True)
    rfm_recency = Column(Integer, nullable=True)
    rfm_frequency = Column(Integer, nullable=True)
    rfm_monetary = Column(Integer, nullable=True)
    rfm_score = Column(Integer, nullable=True)
    segment = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")
""",
    "app/models/campaign.py": """from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    segment_target = Column(String(30), nullable=False)
    title = Column(String(200), nullable=False)
    message_template = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False)
    discount_percent = Column(Integer, nullable=True)
    status = Column(String(20), default="draft")
    estimated_reach = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
""",
    "app/schemas/menu.py": """from pydantic import BaseModel
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
""",
    "app/schemas/order.py": """from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class OrderItemCreate(BaseModel):
    item_id: int
    variant_id: Optional[int] = None
    quantity: int
    add_on_ids: List[int] = []

class OrderCreate(BaseModel):
    table_number: int
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[OrderItemCreate]

class OrderItemOut(BaseModel):
    id: int
    item_name: str
    variant_name: Optional[str]
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    add_on_names: List[str]
    add_on_total: Decimal
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
    items: List[OrderItemOut]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str
""",
    "app/schemas/payment.py": """from pydantic import BaseModel

class PaymentCreateRequest(BaseModel):
    order_id: int

class PaymentCreateResponse(BaseModel):
    razorpay_order_id: str
    amount: int
    currency: str
    key_id: str

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
""",
    "app/schemas/crm.py": """from pydantic import BaseModel
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
""",
    "app/schemas/billing.py": """from pydantic import BaseModel
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
""",
    "app/routers/menu.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.menu import Category, MenuItem
from app.schemas.menu import MenuResponse, CategoryWithItems, MenuItemOut, VariantOut, AddOnOut

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.get("", response_model=MenuResponse)
def get_menu(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.display_order).all()
    cat_out = []
    for cat in categories:
        items_out = []
        for item in cat.items:
            if item.is_available:
                v_out = [VariantOut.model_validate(v) for v in item.variants]
                a_out = [AddOnOut.model_validate(a) for a in item.add_ons]
                items_out.append(MenuItemOut(
                    id=item.id,
                    name=item.name,
                    description=item.description,
                    base_price=item.base_price,
                    image_url=item.image_url,
                    is_available=item.is_available,
                    variants=v_out,
                    add_ons=a_out
                ))
        cat_out.append(CategoryWithItems(
            id=cat.id,
            name=cat.name,
            display_order=cat.display_order,
            items=items_out
        ))
    return MenuResponse(categories=cat_out)
""",
    "app/routers/orders.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu import MenuItem, Variant, AddOn
from app.models.customer import Customer
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderItemOut
from decimal import Decimal
import json
from .kitchen import manager

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=OrderOut)
async def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    total_amount = Decimal(0)
    new_order = Order(table_number=order_data.table_number)
    
    if order_data.customer_phone:
        customer = db.query(Customer).filter(Customer.phone == order_data.customer_phone).first()
        if not customer:
            customer = Customer(phone=order_data.customer_phone, name=order_data.customer_name)
            db.add(customer)
            db.commit()
            db.refresh(customer)
        new_order.customer_id = customer.id
        
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    order_items_out = []
    for item_data in order_data.items:
        db_item = db.query(MenuItem).filter(MenuItem.id == item_data.item_id).first()
        if not db_item:
            continue
        
        unit_price = db_item.base_price
        variant_name = None
        if item_data.variant_id:
            db_variant = db.query(Variant).filter(Variant.id == item_data.variant_id).first()
            if db_variant:
                unit_price = db_variant.price
                variant_name = db_variant.name

        add_on_names = []
        add_on_total = Decimal(0)
        for ao_id in item_data.add_on_ids:
            db_ao = db.query(AddOn).filter(AddOn.id == ao_id).first()
            if db_ao:
                add_on_names.append(db_ao.name)
                add_on_total += db_ao.price

        subtotal = (unit_price * item_data.quantity) + add_on_total
        total_amount += subtotal

        new_order_item = OrderItem(
            order_id=new_order.id,
            item_id=db_item.id,
            variant_id=item_data.variant_id,
            quantity=item_data.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
            add_on_ids=item_data.add_on_ids,
            add_on_names=add_on_names,
            add_on_total=add_on_total
        )
        db.add(new_order_item)
        db.commit()
        
        order_items_out.append(OrderItemOut(
            id=new_order_item.id,
            item_name=db_item.name,
            variant_name=variant_name,
            quantity=item_data.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
            add_on_names=add_on_names,
            add_on_total=add_on_total
        ))
        
    tax = total_amount * Decimal('0.05')
    grand_total = total_amount + tax
    
    new_order.total_amount = total_amount
    new_order.tax_amount = tax
    new_order.grand_total = grand_total
    db.commit()
    db.refresh(new_order)

    order_out = OrderOut(
        id=new_order.id,
        table_number=new_order.table_number,
        status=new_order.status,
        total_amount=new_order.total_amount,
        tax_amount=new_order.tax_amount,
        grand_total=new_order.grand_total,
        payment_status=new_order.payment_status,
        items=order_items_out,
        created_at=new_order.created_at,
        updated_at=new_order.updated_at
    )
    
    # Broadcast to kitchen
    await manager.broadcast(json.dumps({"type": "new_order", "data": order_out.model_dump_json()}))
    
    return order_out

@router.get("", response_model=list[OrderOut])
def list_orders(status: str = None, db: Session = Depends(get_db)):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    orders = query.all()
    result = []
    for o in orders:
        items_out = []
        for i in o.items:
            items_out.append(OrderItemOut(
                id=i.id,
                item_name=i.item.name,
                variant_name=i.variant.name if i.variant else None,
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal,
                add_on_names=i.add_on_names if i.add_on_names else [],
                add_on_total=i.add_on_total
            ))
        result.append(OrderOut(
            id=o.id,
            table_number=o.table_number,
            status=o.status,
            total_amount=o.total_amount,
            tax_amount=o.tax_amount,
            grand_total=o.grand_total,
            payment_status=o.payment_status,
            items=items_out,
            created_at=o.created_at,
            updated_at=o.updated_at
        ))
    return result

@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    items_out = []
    for i in o.items:
        items_out.append(OrderItemOut(
            id=i.id,
            item_name=i.item.name,
            variant_name=i.variant.name if i.variant else None,
            quantity=i.quantity,
            unit_price=i.unit_price,
            subtotal=i.subtotal,
            add_on_names=i.add_on_names if i.add_on_names else [],
            add_on_total=i.add_on_total
        ))
    return OrderOut(
        id=o.id,
        table_number=o.table_number,
        status=o.status,
        total_amount=o.total_amount,
        tax_amount=o.tax_amount,
        grand_total=o.grand_total,
        payment_status=o.payment_status,
        items=items_out,
        created_at=o.created_at,
        updated_at=o.updated_at
    )

@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status_update.status
    db.commit()
    await manager.broadcast(json.dumps({"type": "status_update", "order_id": order_id, "status": status_update.status}))
    return {"message": "Status updated successfully"}
""",
    "app/routers/kitchen.py": """from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws/kitchen")
async def websocket_kitchen(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
""",
    "app/routers/payments.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas.payment import PaymentCreateRequest, PaymentCreateResponse, PaymentVerifyRequest
from app.config import settings
import razorpay

router = APIRouter(prefix="/payments", tags=["Payments"])

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

@router.post("/create", response_model=PaymentCreateResponse)
def create_payment(req: PaymentCreateRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == req.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    amount_in_paise = int(order.grand_total * 100)
    data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": str(order.id)
    }
    
    try:
        razorpay_order = client.order.create(data=data)
        order.razorpay_order_id = razorpay_order['id']
        db.commit()
        
        return PaymentCreateResponse(
            razorpay_order_id=razorpay_order['id'],
            amount=amount_in_paise,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
def verify_payment(req: PaymentVerifyRequest, db: Session = Depends(get_db)):
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        })
        
        order = db.query(Order).filter(Order.razorpay_order_id == req.razorpay_order_id).first()
        if order:
            order.payment_status = 'paid'
            order.razorpay_payment_id = req.razorpay_payment_id
            db.commit()
        return {"message": "Payment verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Signature verification failed")
""",
    "app/routers/billing.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas.billing import BillOut, BillItemOut
from decimal import Decimal

router = APIRouter(prefix="/bills", tags=["Billing"])

@router.get("/{order_id}", response_model=BillOut)
def get_bill(order_id: int, db: Session = Depends(get_db)):
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
""",
    "app/routers/analytics.py": """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_revenue = db.query(func.sum(Order.grand_total)).filter(Order.payment_status == 'paid').scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    avg_order_value = (total_revenue / total_orders) if total_orders > 0 else 0
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_order_value": avg_order_value,
        "total_customers": total_customers
    }

@router.get("/daily-sales")
def get_daily_sales(db: Session = Depends(get_db)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sales = db.query(
        func.date(Order.created_at).label('date'),
        func.sum(Order.grand_total).label('revenue'),
        func.count(Order.id).label('order_count')
    ).filter(Order.created_at >= thirty_days_ago).group_by(func.date(Order.created_at)).all()
    
    return [{"date": str(s.date), "revenue": float(s.revenue), "order_count": s.order_count} for s in sales]

@router.get("/top-items")
def get_top_items(db: Session = Depends(get_db)):
    top_items = db.query(
        OrderItem.item_id,
        func.sum(OrderItem.quantity).label('quantity_sold'),
        func.sum(OrderItem.subtotal).label('revenue')
    ).group_by(OrderItem.item_id).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()
    
    result = []
    for item in top_items:
        from app.models.menu import MenuItem
        db_item = db.query(MenuItem).filter(MenuItem.id == item.item_id).first()
        if db_item:
            result.append({
                "item_name": db_item.name,
                "quantity_sold": item.quantity_sold,
                "revenue": float(item.revenue)
            })
    return result
""",
    "app/routers/crm.py": """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models.customer import Customer
from app.models.campaign import Campaign
from app.schemas.crm import SegmentDistribution, CustomerOut, CampaignOut, CampaignSendResponse
from app.services.rfm_engine import calculate_rfm_scores
from app.services.campaign_engine import generate_default_campaigns

router = APIRouter(prefix="/crm", tags=["CRM"])

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
""",
    "app/routers/auth.py": """from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.config import settings
from datetime import datetime, timedelta
from jose import jwt, JWTError

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == settings.ADMIN_USERNAME and form_data.password == settings.ADMIN_PASSWORD:
        token = create_access_token(data={"sub": form_data.username})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=400, detail="Incorrect username or password")

def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username != settings.ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return username
""",
    "app/services/rfm_engine.py": """from sqlalchemy.orm import Session
from app.models.customer import Customer
from datetime import datetime

def calculate_rfm_scores(db: Session) -> None:
    customers = db.query(Customer).all()
    now = datetime.utcnow()
    
    for c in customers:
        if not c.last_order_date:
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
""",
    "app/services/campaign_engine.py": """from sqlalchemy.orm import Session
from app.models.campaign import Campaign
from app.models.customer import Customer
from sqlalchemy import func

def generate_default_campaigns(db: Session) -> None:
    count = db.query(func.count(Campaign.id)).scalar()
    if count > 0:
        return
        
    templates = [
        {'segment': 'champions', 'title': 'VIP Early Access', 'message': "You're one of our top customers! Try our new Chef's Special before anyone else 🍽️", 'channel': 'whatsapp', 'discount': 0},
        {'segment': 'loyal', 'title': 'Loyalty Reward', 'message': "Thanks for being a regular! Here's 10% off your next visit 🎉", 'channel': 'sms', 'discount': 10},
        {'segment': 'potential_loyalists', 'title': 'Second Visit Nudge', 'message': "Loved your first visit? Come back this week — dessert is on us! 🍰", 'channel': 'whatsapp', 'discount': 0},
        {'segment': 'at_risk', 'title': 'Win-Back Offer', 'message': "We miss you! It's been a while — enjoy 20% off this weekend 💛", 'channel': 'whatsapp', 'discount': 20},
        {'segment': 'cant_lose', 'title': 'Personal Outreach', 'message': "Hey {name}, we haven't seen you in a while. Your favorite dish is waiting — 25% off, just for you", 'channel': 'whatsapp', 'discount': 25},
        {'segment': 'lost', 'title': 'Reactivation Blast', 'message': "It's been too long! Here's a flat ₹150 off on orders above ₹500", 'channel': 'sms', 'discount': 0},
    ]
    
    for t in templates:
        reach = db.query(func.count(Customer.id)).filter(Customer.segment == t['segment']).scalar()
        c = Campaign(
            segment_target=t['segment'],
            title=t['title'],
            message_template=t['message'],
            channel=t['channel'],
            discount_percent=t['discount'],
            estimated_reach=reach or 0
        )
        db.add(c)
    db.commit()
""",
    "app/seed.py": """from app.database import SessionLocal, Base, engine
from app.models.menu import Category, MenuItem, Variant, AddOn
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.services.rfm_engine import calculate_rfm_scores
from app.services.campaign_engine import generate_default_campaigns
import random
from datetime import datetime, timedelta
from decimal import Decimal

random.seed(42)

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    if db.query(Category).first():
        print("Data already seeded")
        db.close()
        return

    # Categories
    categories = [
        Category(name="Starters", display_order=1),
        Category(name="Main Course", display_order=2),
        Category(name="Desserts", display_order=3),
        Category(name="Drinks", display_order=4)
    ]
    db.add_all(categories)
    db.commit()

    # Menu Items
    menu_items_data = [
        (categories[0].id, "Paneer Tikka", 280, [("Half", 150), ("Full", 280)], [("Extra Chutney", 30), ("Onion Rings", 50)]),
        (categories[0].id, "Chicken 65", 320, [("Regular", 320), ("Spicy", 340)], []),
        (categories[0].id, "Veg Spring Rolls", 180, [], []),
        (categories[0].id, "Masala Papad", 80, [], []),
        (categories[1].id, "Butter Chicken", 350, [("Half", 200), ("Full", 350)], [("Extra Gravy", 40), ("Butter Naan", 60)]),
        (categories[1].id, "Dal Makhani", 250, [("Regular", 250), ("Special", 280)], []),
        (categories[1].id, "Chicken Biryani", 380, [("Regular", 380), ("Family Pack", 650)], [("Raita", 40), ("Extra Egg", 30)]),
        (categories[1].id, "Paneer Butter Masala", 300, [], []),
        (categories[2].id, "Gulab Jamun", 120, [("2pc", 60), ("4pc", 120)], []),
        (categories[2].id, "Rasmalai", 150, [], []),
        (categories[2].id, "Brownie with Ice Cream", 220, [], []),
        (categories[3].id, "Masala Chai", 50, [("Regular", 50), ("Large", 80)], []),
        (categories[3].id, "Mango Lassi", 120, [], []),
        (categories[3].id, "Fresh Lime Soda", 80, [("Sweet", 80), ("Salt", 80)], []),
        (categories[3].id, "Cold Coffee", 150, [], [])
    ]
    
    db_items = []
    for cid, name, base_price, variants, addons in menu_items_data:
        item = MenuItem(category_id=cid, name=name, base_price=base_price, is_available=True)
        db.add(item)
        db.commit()
        db.refresh(item)
        db_items.append(item)
        
        for vname, vprice in variants:
            db.add(Variant(item_id=item.id, name=vname, price=vprice))
        for aname, aprice in addons:
            db.add(AddOn(item_id=item.id, name=aname, price=aprice))
            
    db.commit()

    # Customers
    first_names = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rohit", "Pooja", "Suresh", "Ramesh"]
    last_names = ["Sharma", "Verma", "Singh", "Gupta", "Patel", "Kumar", "Das", "Joshi", "Iyer", "Rao"]
    
    customers = []
    for i in range(50):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        phone = f"98{random.randint(10000000, 99999999)}"
        c = Customer(name=name, phone=phone)
        db.add(c)
        customers.append(c)
    db.commit()
    
    for c in customers:
        db.refresh(c)

    # Orders mapping for realistic RFM
    # Champions: 8, Loyal: 12, Potential: 10, At risk: 8, Cant lose: 5, Lost: 7 (Total 50)
    customer_groups = {
        'champions': {'count': 8, 'orders': (12, 18), 'days_ago': (0, 3)},
        'loyal': {'count': 12, 'orders': (6, 10), 'days_ago': (4, 14)},
        'potential': {'count': 10, 'orders': (2, 3), 'days_ago': (0, 7)},
        'at_risk': {'count': 8, 'orders': (5, 8), 'days_ago': (40, 60)},
        'cant_lose': {'count': 5, 'orders': (8, 12), 'days_ago': (45, 90)},
        'lost': {'count': 7, 'orders': (1, 2), 'days_ago': (70, 90)}
    }
    
    cust_idx = 0
    all_variants = db.query(Variant).all()
    all_addons = db.query(AddOn).all()
    now = datetime.utcnow()
    
    for group, params in customer_groups.items():
        for _ in range(params['count']):
            if cust_idx >= len(customers): break
            c = customers[cust_idx]
            num_orders = random.randint(*params['orders'])
            
            c.total_orders = num_orders
            c.total_spent = 0
            first_date = None
            last_date = None
            
            for _ in range(num_orders):
                order_date = now - timedelta(days=random.randint(*params['days_ago']), hours=random.randint(0, 23))
                if not first_date or order_date < first_date: first_date = order_date
                if not last_date or order_date > last_date: last_date = order_date
                
                order = Order(
                    table_number=random.randint(1, 20),
                    customer_id=c.id,
                    status="completed",
                    payment_status="paid",
                    created_at=order_date,
                    updated_at=order_date
                )
                db.add(order)
                db.commit()
                db.refresh(order)
                
                num_items = random.randint(2, 4)
                order_total = Decimal(0)
                
                for _ in range(num_items):
                    item = random.choice(db_items)
                    qty = random.randint(1, 3)
                    
                    item_variants = [v for v in all_variants if v.item_id == item.id]
                    variant = random.choice(item_variants) if item_variants else None
                    unit_price = variant.price if variant else item.base_price
                    
                    item_addons = [a for a in all_addons if a.item_id == item.id]
                    chosen_addons = random.sample(item_addons, random.randint(0, len(item_addons)))
                    addon_total = sum(a.price for a in chosen_addons)
                    
                    subtotal = (unit_price * qty) + addon_total
                    order_total += subtotal
                    
                    oi = OrderItem(
                        order_id=order.id,
                        item_id=item.id,
                        variant_id=variant.id if variant else None,
                        quantity=qty,
                        unit_price=unit_price,
                        subtotal=subtotal,
                        add_on_ids=[a.id for a in chosen_addons] if chosen_addons else None,
                        add_on_names=[a.name for a in chosen_addons] if chosen_addons else None,
                        add_on_total=addon_total
                    )
                    db.add(oi)
                    
                tax = order_total * Decimal('0.05')
                order.total_amount = order_total
                order.tax_amount = tax
                order.grand_total = order_total + tax
                
                c.total_spent += order.grand_total
                
            c.first_order_date = first_date
            c.last_order_date = last_date
            db.commit()
            cust_idx += 1
            
    # Calculate RFM and generate campaigns
    calculate_rfm_scores(db)
    generate_default_campaigns(db)
    
    db.close()
    print("Seed complete")

if __name__ == "__main__":
    seed_data()
""",
    "app/main.py": """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import menu, orders, kitchen, payments, billing, analytics, crm, auth
from app.database import engine, Base
from app.seed import seed_data
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_data()
    yield

app = FastAPI(title="Restaurant CRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(kitchen.router)
app.include_router(payments.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Files generated successfully.")
