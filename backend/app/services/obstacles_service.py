from typing import List, Dict, Optional
from datetime import datetime

class Obstacle:
    def __init__(self, id: int, lat: float, lon: float, 
                 radius_m: float, description: str, 
                 start_date: datetime, end_date: Optional[datetime] = None,
                 obstacle_type: str = "construction"):
        self.id = id
        self.lat = lat
        self.lon = lon
        self.radius_m = radius_m  # Радиус зоны в метрах
        self.description = description
        self.start_date = start_date
        self.end_date = end_date
        self.obstacle_type = obstacle_type  # construction, event, road_closure
    
    def is_active(self) -> bool:
        """Проверяет, активно ли препятствие сейчас"""
        now = datetime.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True
    
    def affects_route(self, route_lat: float, route_lon: float) -> bool:
        """Проверяет, влияет ли препятствие на точку маршрута"""
        # Упрощённая проверка расстояния (можно улучшить с Haversine)
        distance_approx = ((self.lat - route_lat)**2 + (self.lon - route_lon)**2)**0.5 * 111000
        return distance_approx < self.radius_m

class ObstaclesService:
    def __init__(self):
        # Пример препятствий (в реальности можно загружать из БД или OSM)
        self.obstacles: List[Obstacle] = [
            # Пример: ремонт на Тверской
            Obstacle(
                id=1,
                lat=55.7558,
                lon=37.6095,
                radius_m=200,
                description="Ремонт дорожного покрытия",
                start_date=datetime(2026, 1, 1),
                end_date=datetime(2026, 6, 1),
                obstacle_type="construction"
            ),
            # Пример: мероприятие на Красной площади
            Obstacle(
                id=2,
                lat=55.7520,
                lon=37.6175,
                radius_m=300,
                description="Массовое мероприятие",
                start_date=datetime(2026, 3, 1),
                end_date=datetime(2026, 3, 15),
                obstacle_type="event"
            )
        ]
    
    def get_active_obstacles(self, lat: float, lon: float, radius_km: float = 5) -> List[Obstacle]:
        """Возвращает активные препятствия в радиусе"""
        active = []
        for obstacle in self.obstacles:
            if obstacle.is_active():
                # Проверка расстояния до препятствия
                distance_approx = ((obstacle.lat - lat)**2 + (obstacle.lon - lon)**2)**0.5 * 111000
                if distance_approx < radius_km * 1000:
                    active.append(obstacle)
        return active
    
    def add_obstacle(self, lat: float, lon: float, radius_m: float, 
                     description: str, days_duration: int = 7) -> Obstacle:
        """Добавляет новое препятствие"""
        from datetime import timedelta
        obstacle = Obstacle(
            id=len(self.obstacles) + 1,
            lat=lat,
            lon=lon,
            radius_m=radius_m,
            description=description,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=days_duration),
            obstacle_type="construction"
        )
        self.obstacles.append(obstacle)
        return obstacle
    
    def get_obstacles_for_route(self, route_points: List[tuple]) -> List[Obstacle]:
        """Возвращает препятствия, влияющие на маршрут"""
        affected = []
        for lat, lon in route_points:
            for obstacle in self.obstacles:
                if obstacle.is_active() and obstacle.affects_route(lat, lon):
                    if obstacle not in affected:
                        affected.append(obstacle)
        return affected

obstacles_service = ObstaclesService()