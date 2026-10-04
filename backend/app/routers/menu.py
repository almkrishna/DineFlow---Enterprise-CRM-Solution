from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.menu import Category, MenuItem, Variant, AddOn
from app.models.order import OrderItem
from app.schemas.menu import (
    MenuResponse, CategoryWithItems, MenuItemOut, VariantOut, AddOnOut,
    MenuItemCreate, MenuItemUpdate, AvailabilityUpdate, CategoryCreate,
)
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/menu", tags=["Menu"])


def item_to_out(item: MenuItem) -> MenuItemOut:
    return MenuItemOut(
        id=item.id,
        name=item.name,
        description=item.description,
        base_price=item.base_price,
        image_url=item.image_url,
        is_available=item.is_available,
        is_veg=item.is_veg if item.is_veg is not None else True,
        variants=[VariantOut.model_validate(v) for v in item.variants],
        add_ons=[AddOnOut.model_validate(a) for a in item.add_ons],
    )


def build_menu_response(db: Session, include_unavailable: bool) -> MenuResponse:
    categories = db.query(Category).order_by(Category.display_order).all()
    cat_out = []
    for cat in categories:
        items_out = [
            item_to_out(item)
            for item in cat.items
            if include_unavailable or item.is_available
        ]
        cat_out.append(CategoryWithItems(
            id=cat.id,
            name=cat.name,
            display_order=cat.display_order,
            items=items_out,
        ))
    return MenuResponse(categories=cat_out)


@router.get("", response_model=MenuResponse)
def get_menu(db: Session = Depends(get_db)):
    return build_menu_response(db, include_unavailable=False)


@router.get("/admin", response_model=MenuResponse)
def get_admin_menu(db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    return build_menu_response(db, include_unavailable=True)


@router.post("/categories")
def create_category(data: CategoryCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    existing = db.query(Category).filter(Category.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    category = Category(name=name, display_order=data.display_order)
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"id": category.id, "name": category.name, "display_order": category.display_order}


def resolve_category(db: Session, category_id, new_category_name) -> Category:
    if new_category_name and new_category_name.strip():
        name = new_category_name.strip()
        category = db.query(Category).filter(Category.name.ilike(name)).first()
        if not category:
            max_order = db.query(Category).count()
            category = Category(name=name, display_order=max_order + 1)
            db.add(category)
            db.flush()
        return category
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/items", response_model=MenuItemOut)
def create_menu_item(data: MenuItemCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Item name is required")
    if data.base_price <= 0:
        raise HTTPException(status_code=422, detail="Price must be greater than zero")
    category = resolve_category(db, data.category_id, data.new_category_name)

    item = MenuItem(
        category_id=category.id,
        name=data.name.strip(),
        description=(data.description or "").strip() or None,
        base_price=data.base_price,
        image_url=(data.image_url or "").strip() or None,
        is_available=data.is_available,
        is_veg=data.is_veg,
    )
    db.add(item)
    db.flush()
    for v in data.variants:
        if v.name.strip():
            db.add(Variant(item_id=item.id, name=v.name.strip(), price=v.price))
    for a in data.add_ons:
        if a.name.strip():
            db.add(AddOn(item_id=item.id, name=a.name.strip(), price=a.price))
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.put("/items/{item_id}", response_model=MenuItemOut)
def update_menu_item(item_id: int, data: MenuItemUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=422, detail="Item name is required")
        item.name = data.name.strip()
    if data.description is not None:
        item.description = data.description.strip() or None
    if data.base_price is not None:
        if data.base_price <= 0:
            raise HTTPException(status_code=422, detail="Price must be greater than zero")
        item.base_price = data.base_price
    if data.image_url is not None:
        item.image_url = data.image_url.strip() or None
    if data.is_available is not None:
        item.is_available = data.is_available
    if data.is_veg is not None:
        item.is_veg = data.is_veg
    if data.category_id is not None:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        item.category_id = category.id

    if data.variants is not None:
        sync_options(db, item, data.variants, Variant, "variant_id")
    if data.add_ons is not None:
        sync_options(db, item, data.add_ons, AddOn, None)

    db.commit()
    db.refresh(item)
    return item_to_out(item)


def sync_options(db: Session, item: MenuItem, incoming, model, order_item_fk):
    """Update/add/remove an item's variants or add-ons from the submitted list."""
    existing = {o.id: o for o in db.query(model).filter(model.item_id == item.id).all()}
    kept_ids = set()
    for opt in incoming:
        if not opt.name.strip():
            continue
        if opt.id and opt.id in existing:
            existing[opt.id].name = opt.name.strip()
            existing[opt.id].price = opt.price
            kept_ids.add(opt.id)
        else:
            db.add(model(item_id=item.id, name=opt.name.strip(), price=opt.price))
    for opt_id, opt in existing.items():
        if opt_id in kept_ids:
            continue
        if order_item_fk == "variant_id":
            referenced = db.query(OrderItem).filter(OrderItem.variant_id == opt_id).first()
            if referenced:
                raise HTTPException(
                    status_code=409,
                    detail=f"Variant '{opt.name}' was used in past orders and cannot be deleted. You can rename or re-price it instead.",
                )
        db.delete(opt)


@router.patch("/items/{item_id}/availability", response_model=MenuItemOut)
def set_item_availability(item_id: int, data: AvailabilityUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_admin)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    item.is_available = data.is_available
    db.commit()
    db.refresh(item)
    return item_to_out(item)
