from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, unique=True, index=True, nullable=False)  # ID заказа (UUID)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=True)
    ready_time = Column(DateTime, nullable=False)
    deadline = Column(DateTime, nullable=False)
    weight = Column(Float, default=1.0)
    
    status = Column(String, default="pending")  # pending, delivered, cancelled
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    
    courier = relationship("Courier", back_populates="orders")

class Courier(Base):
    __tablename__ = "couriers"
    
    id = Column(Integer, primary_key=True, index=True)
    courier_id = Column(Integer, unique=True, index=True, nullable=False)  # ID курьера
    courier_type = Column(String, default="bicycle")  # bicycle, foot
    capacity = Column(Float, default=10.0)
    speed_kmh = Column(Float, default=15.0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="courier")

class DeliveryRoute(Base):
    __tablename__ = "delivery_routes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String, unique=True, index=True, nullable=False)
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=False)
    
    total_distance_m = Column(Float, nullable=False)
    total_time_min = Column(Float, nullable=False)
    orders_count = Column(Integer, nullable=False)
    
    route_points = Column(JSON, nullable=True)  # [{"order_id": 1, "lat": 55.75, "lon": 37.61}, ...]
    
    status = Column(String, default="pending")  # pending, in_progress, completed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()