from sqlalchemy.orm import Session
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
