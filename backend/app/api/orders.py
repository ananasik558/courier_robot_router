from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db, Order, Courier, DeliveryRoute
from app.models import schemas
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("/", response_model=List[schemas.OrderResponse])
def get_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить все заказы"""
    orders = db.query(Order).offset(skip).limit(limit).all()
    return orders

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)):
    """Получить заказ по ID"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order

@router.post("/", response_model=schemas.OrderResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Создать новый заказ"""
    # Генерируем order_id если не указан
    if not order.order_id:
        order.order_id = str(uuid.uuid4())
    
    db_order = Order(**order.dict())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.put("/{order_id}", response_model=schemas.OrderResponse)
def update_order(order_id: str, order_update: schemas.OrderUpdate, db: Session = Depends(get_db)):
    """Обновить заказ (статус доставки)"""
    db_order = db.query(Order).filter(Order.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    update_data = order_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_order, key, value)
    
    db_order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_order)
    return db_order

@router.delete("/{order_id}")
def delete_order(order_id: str, db: Session = Depends(get_db)):
    """Удалить заказ"""
    db_order = db.query(Order).filter(Order.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    db.delete(db_order)
    db.commit()
    return {"message": "Заказ удалён"}

@router.get("/stats/delivery")
def get_delivery_stats(db: Session = Depends(get_db)):
    """Статистика доставок"""
    total = db.query(Order).count()
    pending = db.query(Order).filter(Order.status == "pending").count()
    delivered = db.query(Order).filter(Order.status == "delivered").count()
    cancelled = db.query(Order).filter(Order.status == "cancelled").count()
    
    return {
        "total": total,
        "pending": pending,
        "delivered": delivered,
        "cancelled": cancelled
    }