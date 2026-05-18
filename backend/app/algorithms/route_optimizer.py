import numpy as np
import time
from typing import List, Tuple, Dict, Any
from datetime import datetime, timedelta, timezone
from app.models.schemas import (
    OptimizedRoute, 
    RoutePoint, 
    OrderBase as OrderSchema,  
    CourierBase as CourierSchema
)
from app.services.osrm_service import osrm_service
from app.algorithms.genetic_algorithm import GeneticAlgorithmVRP
from app.config import settings

class RouteOptimizer:
    def __init__(self):
        self.osrm = osrm_service
    
    def _prepare_matrices(self, orders: List[OrderSchema], depot_lat: float, 
                          depot_lon: float, profile: str = "bicycle") -> tuple:
        coordinates = [(depot_lon, depot_lat)] + [(o.longitude, o.latitude) for o in orders]
        
        matrix_data = self.osrm.get_route_matrix(coordinates, profile=profile)
        
        if matrix_data["code"] not in ["Ok", "Fallback"]:
            raise Exception(f"OSRM matrix request failed: {matrix_data['code']}")
        
        distances = np.array(matrix_data["distances"])
        durations = np.array(matrix_data["durations"])
        
        return distances, durations, coordinates
    
    def _prepare_time_windows(self, orders: List[OrderSchema], start_time: datetime) -> List[Tuple[int, int]]:
        if start_time.tzinfo is not None:
            start_time = start_time.astimezone(timezone.utc).replace(tzinfo=None)
        
        windows = []
        for order in orders:
            ready = order.ready_time
            deadline = order.deadline
            
            if isinstance(ready, str):
                ready = datetime.fromisoformat(ready.replace('Z', '+00:00'))
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
            
            if ready.tzinfo is not None:
                ready = ready.astimezone(timezone.utc).replace(tzinfo=None)
            if deadline.tzinfo is not None:
                deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)
            
            earliest = int((ready - start_time).total_seconds())
            latest = int((deadline - start_time).total_seconds())
            windows.append((max(0, earliest), max(earliest, latest)))
        
        return windows
    
    def optimize(self, orders: List[OrderSchema], couriers: List[CourierSchema], 
                 depot_lat: float, depot_lon: float) -> Dict[str, Any]:
        start_time = datetime.now(timezone.utc)
        computation_start = time.time()
        
        if not orders or not couriers:
            return {
                "routes": [], 
                "total_time_min": 0, 
                "total_distance_m": 0, 
                "computation_time_ms": 0
            }
        
        primary_profile = couriers[0].courier_type if hasattr(couriers[0], 'courier_type') else "bicycle"
        
        distances, durations, coordinates = self._prepare_matrices(
            orders, depot_lat, depot_lon, profile=primary_profile
        )
        
        order_weights = [o.weight for o in orders]
        courier_caps = [c.capacity for c in couriers]
        time_windows = self._prepare_time_windows(orders, start_time)
        
        ga = GeneticAlgorithmVRP(
            distance_matrix=distances,
            time_matrix=durations,
            num_couriers=len(couriers),
            courier_capacities=courier_caps,
            order_weights=order_weights,
            time_windows=time_windows
        )
        
        best_individual, best_fitness = ga.optimize(verbose=False)
        
        routes_decoded = ga._decode_route(best_individual)
        
        optimized_routes = []
        total_distance = 0
        total_time = 0
        
        for courier_idx, route in enumerate(routes_decoded):
            if len(route) <= 2:
                continue
            
            courier = couriers[courier_idx % len(couriers)]
            route_points = []
            route_distance = 0
            route_time = 0
            current_time = start_time
            
            for i in range(len(route) - 1):
                from_idx = route[i]
                to_idx = route[i + 1]
                
                if to_idx == 0:
                    continue
                
                order = orders[to_idx - 1]
                travel_time_sec = durations[from_idx][to_idx]
                route_distance += distances[from_idx][to_idx]
                route_time += travel_time_sec
                
                arrival_time = current_time + timedelta(seconds=travel_time_sec)
                
                route_points.append(RoutePoint(
                    order_id=order.id if hasattr(order, 'id') else to_idx,
                    latitude=order.latitude,
                    longitude=order.longitude,
                    arrival_time=arrival_time.isoformat(),
                    departure_time=(arrival_time + timedelta(minutes=2)).isoformat()
                ))
                
                current_time = arrival_time + timedelta(minutes=2)
            
            courier_type = courier.courier_type if hasattr(courier, 'courier_type') else "bicycle"
            
            optimized_routes.append(OptimizedRoute(
                courier_id=courier.courier_id if hasattr(courier, 'courier_id') else courier_idx + 1,
                courier_type=courier_type,
                points=route_points,
                total_distance_m=route_distance,
                total_time_min=route_time / 60,
                orders_count=len(route_points)
            ))
            
            total_distance += route_distance
            total_time += route_time
        
        computation_time = (time.time() - computation_start) * 1000
        
        return {
            "routes": [r.model_dump() if hasattr(r, 'model_dump') else r.__dict__ for r in optimized_routes],
            "total_time_min": total_time / 60,
            "total_distance_m": total_distance,
            "computation_time_ms": computation_time
        }

route_optimizer = RouteOptimizer()