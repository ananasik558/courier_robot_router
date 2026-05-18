 

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import time
import uuid

 
from app.models.schemas import (
    OptimizationRequest, 
    OptimizationResponse,
    OrderBase,
    CourierBase
)

 
from app.models.database import Order, Courier, DeliveryRoute, get_db, init_db
from sqlalchemy.orm import Session

 
from app.algorithms.route_optimizer import route_optimizer
from app.services.weather_service import weather_service
from app.services.obstacles_service import obstacles_service

app = FastAPI(
    title="Courier Route Optimizer",
    description="API для оптимизации маршрутов курьеров",
    version="2.0.0"
)

 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️ Database init warning: {e}")

@app.get("/")
def root():
    return {"status": "ok", "service": "Courier Route Optimizer API v2.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

 
class GeocodeRequest(BaseModel):
    address: str
    city: Optional[str] = "Москва"

class GeocodeResponse(BaseModel):
    success: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    message: str = ""
    model_config = ConfigDict(from_attributes=True)

@app.post("/api/geocode", response_model=GeocodeResponse)
async def geocode_address(request: GeocodeRequest):
    try:
        result = weather_service.geocode(request.address, request.city)
        if result:
            lat, lon = result
            return GeocodeResponse(success=True, latitude=lat, longitude=lon, address=request.address, message="Адрес найден")
        return GeocodeResponse(success=False, message="Адрес не найден")
    except Exception as e:
        return GeocodeResponse(success=False, message=str(e))

 
class WeatherResponse(BaseModel):
    temperature: float
    precipitation: float
    rain: float
    snowfall: float
    wind_speed: float
    speed_modifier_bicycle: float
    speed_modifier_foot: float
    model_config = ConfigDict(from_attributes=True)

@app.get("/api/weather", response_model=WeatherResponse)
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    weather = weather_service.get_weather(lat, lon)
    return WeatherResponse(
        temperature=weather.get("temperature", 20),
        precipitation=weather.get("precipitation", 0),
        rain=weather.get("rain", 0),
        snowfall=weather.get("snowfall", 0),
        wind_speed=weather.get("wind_speed", 0),
        speed_modifier_bicycle=weather_service.get_speed_modifier(lat, lon, "bicycle"),
        speed_modifier_foot=weather_service.get_speed_modifier(lat, lon, "foot")
    )

 
class ObstacleRequest(BaseModel):
    latitude: float
    longitude: float
    radius_m: float = 100
    description: str
    days_duration: int = 7

class ObstacleResponse(BaseModel):
    success: bool
    obstacles: List[dict] = []
    message: str = ""
    model_config = ConfigDict(from_attributes=True)

@app.post("/api/obstacles", response_model=ObstacleResponse)
async def add_obstacle(request: ObstacleRequest):
    try:
        obstacle = obstacles_service.add_obstacle(
            lat=request.latitude,
            lon=request.longitude,
            radius_m=request.radius_m,
            description=request.description,
            days_duration=request.days_duration
        )
        return ObstacleResponse(
            success=True,
            obstacles=[{
                "id": obstacle.id,
                "lat": obstacle.lat,
                "lon": obstacle.lon,
                "radius_m": obstacle.radius_m,
                "description": obstacle.description
            }],
            message="Препятствие добавлено"
        )
    except Exception as e:
        return ObstacleResponse(success=False, message=str(e))

@app.get("/api/obstacles")
async def get_obstacles(lat: float = Query(...), lon: float = Query(...), radius_km: float = 5):
    obstacles = obstacles_service.get_active_obstacles(lat, lon, radius_km)
    return {
        "success": True,
        "obstacles": [{
            "id": o.id,
            "lat": o.lat,
            "lon": o.lon,
            "radius_m": o.radius_m,
            "description": o.description
        } for o in obstacles],
        "count": len(obstacles)
    }

 
@app.post("/api/optimize", response_model=OptimizationResponse)
def optimize_routes(request: OptimizationRequest):
    try:
        result = route_optimizer.optimize(
            orders=request.orders,
            couriers=request.couriers,
            depot_lat=request.depot_latitude,
            depot_lon=request.depot_longitude
        )
        return OptimizationResponse(**result)
    except Exception as e:
        import traceback
        print(f"Optimization error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/route/geometry")
async def get_route_geometry(
    coordinates: str = Query(...),
    profile: str = Query("bicycle")
):
    try:
        coords_list = [tuple(map(float, c.split(","))) for c in coordinates.split(";")]
        geometry = route_optimizer.osrm.get_route_geometry(coords_list, profile=profile)
        return geometry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

 
@app.get("/api/orders/")
def get_orders(db: Session = Depends(get_db)):
    from sqlalchemy.orm import Session
    orders = db.query(Order).all()
    return [
        {
            "id": o.id,
            "order_id": o.order_id,
            "latitude": o.latitude,
            "longitude": o.longitude,
            "address": o.address,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None
        }
        for o in orders
    ]

@app.post("/api/orders/", response_model=dict)
def create_order(order: OrderBase, db: Session = Depends(get_db)):
    import uuid
    from datetime import datetime
    
    db_order = Order(
        order_id=str(uuid.uuid4()),   
        latitude=order.latitude,
        longitude=order.longitude,
        address=order.address,
        ready_time=datetime.fromisoformat(order.ready_time.replace('Z', '+00:00')) if isinstance(order.ready_time, str) else order.ready_time,
        deadline=datetime.fromisoformat(order.deadline.replace('Z', '+00:00')) if isinstance(order.deadline, str) else order.deadline,
        weight=order.weight,
        status="pending"
    )
    
    db.add(db_order)
    db.commit()   
    db.refresh(db_order)   
    
    return {
        "id": db_order.id,
        "order_id": db_order.order_id,
        "status": "created"
    }

@app.put("/api/orders/{order_id}")
def update_order(order_id: str, status: str = "delivered", db: Session = Depends(get_db)):
    from datetime import datetime
    
    db_order = db.query(Order).filter(Order.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    db_order.status = status
    if status == "delivered":
        db_order.delivered_at = datetime.utcnow()
    db_order.updated_at = datetime.utcnow()
    
    db.commit()   
    db.refresh(db_order)
    
    return {"id": db_order.id, "status": db_order.status}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: str, db: Session = Depends(get_db)):
    from sqlalchemy.orm import Session
    db_order = db.query(Order).filter(Order.order_id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    db.delete(db_order)
    db.commit()
    return {"message": "Заказ удалён"}

 
@app.get("/api/couriers/")
def get_couriers(db: Session = Depends(get_db)):
    from sqlalchemy.orm import Session
    couriers = db.query(Courier).all()
    return [
        {
            "id": c.id,
            "courier_id": c.courier_id,
            "courier_type": c.courier_type,
            "capacity": c.capacity,
            "speed_kmh": c.speed_kmh
        }
        for c in couriers
    ]

@app.post("/api/couriers/", response_model=dict)
def create_courier(courier: CourierBase, db: Session = Depends(get_db)):
    db_courier = Courier(
        courier_id=courier.courier_id,
        courier_type=courier.courier_type,
        capacity=courier.capacity,
        speed_kmh=courier.speed_kmh
    )
    
    db.add(db_courier)
    db.commit()   
    db.refresh(db_courier)
    
    return {"id": db_courier.id, "courier_id": db_courier.courier_id}

 
@app.get("/api/orders/stats/delivery")
def get_delivery_stats(db: Session = Depends(get_db)):
    from sqlalchemy.orm import Session
    total = db.query(Order).count()
    pending = db.query(Order).filter(Order.status == "pending").count()
    delivered = db.query(Order).filter(Order.status == "delivered").count()
    return {
        "total": total,
        "pending": pending,
        "delivered": delivered,
        "cancelled": total - pending - delivered
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)