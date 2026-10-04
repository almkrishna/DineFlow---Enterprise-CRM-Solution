from app.database import SessionLocal, Base, engine
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
        (categories[0].id, "Paneer Tikka", 280, True, [("Half", 150), ("Full", 280)], [("Extra Chutney", 30), ("Onion Rings", 50)]),
        (categories[0].id, "Chicken 65", 320, False, [("Regular", 320), ("Spicy", 340)], []),
        (categories[0].id, "Veg Spring Rolls", 180, True, [], []),
        (categories[0].id, "Masala Papad", 80, True, [], []),
        (categories[1].id, "Butter Chicken", 350, False, [("Half", 200), ("Full", 350)], [("Extra Gravy", 40), ("Butter Naan", 60)]),
        (categories[1].id, "Dal Makhani", 250, True, [("Regular", 250), ("Special", 280)], []),
        (categories[1].id, "Chicken Biryani", 380, False, [("Regular", 380), ("Family Pack", 650)], [("Raita", 40), ("Extra Egg", 30)]),
        (categories[1].id, "Paneer Butter Masala", 300, True, [], []),
        (categories[2].id, "Gulab Jamun", 120, True, [("2pc", 60), ("4pc", 120)], []),
        (categories[2].id, "Rasmalai", 150, True, [], []),
        (categories[2].id, "Brownie with Ice Cream", 220, True, [], []),
        (categories[3].id, "Masala Chai", 50, True, [("Regular", 50), ("Large", 80)], []),
        (categories[3].id, "Mango Lassi", 120, True, [], []),
        (categories[3].id, "Fresh Lime Soda", 80, True, [("Sweet", 80), ("Salt", 80)], []),
        (categories[3].id, "Cold Coffee", 150, True, [], [])
    ]

    db_items = []
    for cid, name, base_price, is_veg, variants, addons in menu_items_data:
        item = MenuItem(category_id=cid, name=name, base_price=base_price, is_available=True, is_veg=is_veg)
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
                
                preparing_at = order_date + timedelta(minutes=random.uniform(1, 4))
                ready_at = preparing_at + timedelta(minutes=random.uniform(6, 20))
                completed_at = ready_at + timedelta(minutes=random.uniform(2, 8))
                order = Order(
                    table_number=random.randint(1, 20),
                    customer_id=c.id,
                    status="completed",
                    payment_status="paid",
                    created_at=order_date,
                    updated_at=completed_at,
                    preparing_at=preparing_at,
                    ready_at=ready_at,
                    completed_at=completed_at
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
            
    # Cancelled demo orders (for cancellation analytics)
    reasons = ["Item unavailable"] * 6 + ["Kitchen overloaded"] * 4 + ["Closing time"] * 3 + ["Customer left"] * 2
    for reason in reasons:
        created_at = now - timedelta(days=random.uniform(0, 30))
        created_at = created_at.replace(hour=random.choice([12, 13, 14, 19, 20, 21, 22]), minute=random.randint(0, 59))
        cancelled_at = created_at + timedelta(minutes=random.uniform(2, 10))
        order = Order(
            table_number=random.randint(1, 20),
            status="cancelled",
            cancel_reason=reason,
            created_at=created_at,
            updated_at=cancelled_at,
            cancelled_at=cancelled_at
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        order_total = Decimal(0)
        for item in random.sample(db_items, random.randint(1, 2)):
            qty = random.randint(1, 2)
            subtotal = item.base_price * qty
            order_total += subtotal
            db.add(OrderItem(order_id=order.id, item_id=item.id, quantity=qty, unit_price=item.base_price, subtotal=subtotal, add_on_total=0, round_number=1))
        tax = order_total * Decimal('0.05')
        order.total_amount = order_total
        order.tax_amount = tax
        order.grand_total = order_total + tax
    db.commit()

    # Calculate RFM and generate campaigns
    calculate_rfm_scores(db)
    generate_default_campaigns(db)
    
    db.close()
    print("Seed complete")

if __name__ == "__main__":
    seed_data()
