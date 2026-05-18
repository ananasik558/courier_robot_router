from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db, DeliveryRoute
from app.models import schemas
import uuid

router = APIRouter(prefix="/api/routes", tags=["routes"])

@router.get("/", response_model=List[schemas.DeliveryRouteResponse])
def get_routes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить все маршруты"""
    routes = db.query(DeliveryRoute).offset(skip).limit(limit).all()
    return routes

@router.post("/", response_model=schemas.DeliveryRouteResponse)
def create_route(route: schemas.DeliveryRouteCreate, db: Session = Depends(get_db)):
    """Сохранить оптимизированный маршрут"""
    if not route.route_id:
        route.route_id = str(uuid.uuid4())
    
    db_route = DeliveryRoute(**route.dict())
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route