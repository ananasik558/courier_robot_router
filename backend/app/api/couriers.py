from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db, Courier
from app.models import schemas

router = APIRouter(prefix="/api/couriers", tags=["couriers"])

@router.get("/", response_model=List[schemas.CourierResponse])
def get_couriers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить всех курьеров"""
    couriers = db.query(Courier).offset(skip).limit(limit).all()
    return couriers

@router.post("/", response_model=schemas.CourierResponse)
def create_courier(courier: schemas.CourierCreate, db: Session = Depends(get_db)):
    """Создать курьера"""
    db_courier = Courier(**courier.dict())
    db.add(db_courier)
    db.commit()
    db.refresh(db_courier)
    return db_courier

@router.delete("/{courier_id}")
def delete_courier(courier_id: int, db: Session = Depends(get_db)):
    """Удалить курьера"""
    db_courier = db.query(Courier).filter(Courier.id == courier_id).first()
    if not db_courier:
        raise HTTPException(status_code=404, detail="Курьер не найден")
    
    db.delete(db_courier)
    db.commit()
    return {"message": "Курьер удалён"}