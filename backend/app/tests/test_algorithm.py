import pytest
from datetime import datetime, timedelta
from app.models.schemas import Order, Courier
from app.algorithms.route_optimizer import route_optimizer

def test_optimization_basic():
    now = datetime.now()
    
    orders = [
        Order(id=1, latitude=55.7558, longitude=37.6173, 
              ready_time=now, deadline=now + timedelta(minutes=30), weight=1.0),
        Order(id=2, latitude=55.7512, longitude=37.6184, 
              ready_time=now, deadline=now + timedelta(minutes=30), weight=1.0),
        Order(id=3, latitude=55.7489, longitude=37.6231, 
              ready_time=now, deadline=now + timedelta(minutes=30), weight=1.0),
    ]
    
    couriers = [
        Courier(id=1, type="bicycle", capacity=5.0, speed_kmh=15.0),
        Courier(id=2, type="bicycle", capacity=5.0, speed_kmh=15.0),
    ]
    
    result = route_optimizer.optimize(
        orders=orders,
        couriers=couriers,
        depot_lat=55.7520,
        depot_lon=37.6150
    )
    
    assert result["total_time_min"] > 0
    assert result["total_distance_m"] > 0
    assert result["computation_time_ms"] > 0
    assert len(result["routes"]) > 0

def test_empty_orders():
    result = route_optimizer.optimize(
        orders=[],
        couriers=[Courier(id=1, type="bicycle", capacity=5.0)],
        depot_lat=55.7520,
        depot_lon=37.6150
    )
    
    assert result["total_time_min"] == 0
    assert result["routes"] == []

if __name__ == "__main__":
    pytest.main([__file__, "-v"])