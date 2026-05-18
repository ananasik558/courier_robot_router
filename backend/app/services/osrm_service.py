import requests
from typing import List, Tuple
from app.config import settings

class OSRMService:
    def __init__(self):
        self.base_url = settings.OSRM_URL
        self.profile = settings.OSRM_PROFILE  # bicycle или foot
    
    def get_route_matrix(self, coordinates: List[Tuple[float, float]], profile: str = None) -> dict:
        """
        Получает матрицу времени и расстояний между точками
        profile: 'bicycle' или 'foot'
        """
        if profile is None:
            profile = getattr(self, 'profile', 'bicycle')   
            
        if profile not in ['bicycle', 'foot']:
            profile = 'bicycle'

        if len(coordinates) > 100:
            coordinates = coordinates[:100]
        
        coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
        
        url = f"{self.base_url}/table/v1/{profile}/{coords_str}"
        params = {"annotations": "distance,duration"}
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok":
                raise Exception(f"OSRM error: {data.get('code')}")
            
            # Проверка на пустые матрицы
            if not data.get("durations") or not data["durations"][0]:
                n = len(coordinates)
                return {
                    "durations": [[0 if i == j else 300 for j in range(n)] for i in range(n)],
                    "distances": [[0 if i == j else 1000 for j in range(n)] for i in range(n)],
                    "code": "Fallback"
                }
            
            return {
                "durations": data["durations"],
                "distances": data["distances"],
                "code": data["code"]
            }
        except Exception as e:
            print(f"OSRM Matrix Error: {e}")
            n = len(coordinates)
            return {
                "durations": [[0 if i == j else 300 for j in range(n)] for i in range(n)],
                "distances": [[0 if i == j else 1000 for j in range(n)] for i in range(n)],
                "code": "Error"
            }
    
    def get_route_geometry(self, coordinates: List[Tuple[float, float]], profile: str = None) -> dict:
        """
        Получает геометрию маршрута для отрисовки на карте
        profile: 'bicycle' или 'foot'
        """
        if profile is None:
            profile = self.profile
        
        coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
        
        url = f"{self.base_url}/route/v1/{profile}/{coords_str}"
        params = {"overview": "full", "geometries": "geojson"}
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"OSRM Geometry Error: {e}")
            return {}

    # backend/app/services/osrm_service.py

    def get_route_matrix(self, coordinates: List[Tuple[float, float]], 
                     profile: str = None, consider_traffic: bool = True) -> dict:
        """
        Получает матрицу времени и расстояний между точками
        ВАЖНО: /table endpoint не поддерживает overview параметр!
        """
        if profile is None:
            profile = self.profile
        
        if len(coordinates) > 100:
            coordinates = coordinates[:100]
        
        coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
        
        # TABLE endpoint — НЕ добавляем overview!
        url = f"{self.base_url}/table/v1/{profile}/{coords_str}"
        params = {
            "annotations": "distance,duration",
            "fallback_speed": 10
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok":
                raise Exception(f"OSRM error: {data.get('code')}")
            
            # Проверка на пустые матрицы
            if not data.get("durations") or not data["durations"][0]:
                n = len(coordinates)
                return {
                    "durations": [[0 if i == j else 300 for j in range(n)] for i in range(n)],
                    "distances": [[0 if i == j else 1000 for j in range(n)] for i in range(n)],
                    "code": "Fallback"
                }
            
            # Применяем коэффициент "час пик"
            from datetime import datetime
            current_hour = datetime.now().hour
            peak_hour_modifier = 1.0
            
            if (8 <= current_hour <= 10) or (17 <= current_hour <= 19):
                if profile == "bicycle":
                    peak_hour_modifier = 1.15
                else:
                    peak_hour_modifier = 1.25
            
            durations = data["durations"]
            if peak_hour_modifier > 1.0:
                durations = [[t * peak_hour_modifier for t in row] for row in durations]
            
            return {
                "durations": durations,
                "distances": data["distances"],
                "code": data["code"],
                "peak_hour": peak_hour_modifier > 1.0,
                "peak_modifier": peak_hour_modifier
            }
            
        except Exception as e:
            print(f"OSRM Matrix Error: {e}")
            n = len(coordinates)
            return {
                "durations": [[0 if i == j else 300 for j in range(n)] for i in range(n)],
                "distances": [[0 if i == j else 1000 for j in range(n)] for i in range(n)],
                "code": "Error",
                "peak_hour": False,
                "peak_modifier": 1.0
            }

osrm_service = OSRMService()