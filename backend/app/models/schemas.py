from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# === ORDER SCHEMAS ===

class OrderBase(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    ready_time: datetime
    deadline: datetime
    weight: float = 1.0

class OrderCreate(OrderBase):
    order_id: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    courier_id: Optional[int] = None
    delivered_at: Optional[datetime] = None

class OrderResponse(OrderBase):
    id: int
    order_id: str
    status: str
    courier_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    delivered_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


# === COURIER SCHEMAS ===

class CourierBase(BaseModel):
    courier_id: int
    courier_type: str = "bicycle"
    capacity: float = 10.0
    speed_kmh: float = 15.0

class CourierCreate(CourierBase):
    pass

class CourierResponse(CourierBase):
    id: int
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# === DELIVERY ROUTE SCHEMAS ===

class DeliveryRouteBase(BaseModel):
    courier_id: int
    total_distance_m: float
    total_time_min: float
    orders_count: int
    route_points: Optional[List[Dict[str, Any]]] = None

class DeliveryRouteCreate(DeliveryRouteBase):
    route_id: Optional[str] = None

class DeliveryRouteResponse(DeliveryRouteBase):
    id: int
    route_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# === OPTIMIZATION SCHEMAS ===

class OptimizationRequest(BaseModel):
    orders: List[OrderBase]
    couriers: List[CourierBase]
    depot_latitude: float
    depot_longitude: float
    model_config = ConfigDict(from_attributes=True)

class RoutePoint(BaseModel):
    order_id: int
    latitude: float
    longitude: float
    arrival_time: datetime
    departure_time: datetime

class OptimizedRoute(BaseModel):
    courier_id: int
    courier_type: str
    points: List[RoutePoint]
    total_distance_m: float
    total_time_min: float
    orders_count: int

class OptimizationResponse(BaseModel):
    routes: List[OptimizedRoute]
    total_time_min: float
    total_distance_m: float
    computation_time_ms: float



class DeliveryStatus(BaseModel):
    order_id: str
    status: str
    delivered_at: Optional[datetime] = None