 

import requests
from typing import Optional, Dict
from functools import lru_cache
from datetime import datetime

class WeatherService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
    
    @lru_cache(maxsize=50)
    def get_weather(self, lat: float, lon: float) -> Dict:
        """
        Получает текущие погодные условия
        Возвращает температуру, осадки, ветер
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ["temperature_2m", "precipitation", "rain", "snowfall", "wind_speed_10m"],
            "timezone": "Europe/Moscow"
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            current = data.get("current", {})
            return {
                "temperature": current.get("temperature_2m", 20),
                "precipitation": current.get("precipitation", 0),
                "rain": current.get("rain", 0),
                "snowfall": current.get("snowfall", 0),
                "wind_speed": current.get("wind_speed_10m", 0),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Weather API error: {e}")
            return {
                "temperature": 20,
                "precipitation": 0,
                "rain": 0,
                "snowfall": 0,
                "wind_speed": 0,
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def get_speed_modifier(self, lat: float, lon: float, courier_type: str) -> float:
        """
        Возвращает коэффициент модификации скорости на основе погоды
        1.0 = нормальные условия, <1.0 = замедление
        """
        weather = self.get_weather(lat, lon)
        
        modifier = 1.0

        if weather["rain"] > 0.5 or weather["precipitation"] > 0.5:
            if courier_type == "bicycle":
                modifier -= 0.25  
            else:
                modifier -= 0.10  
        
        if weather["snowfall"] > 0.5:
            if courier_type == "bicycle":
                modifier -= 0.40
            else:
                modifier -= 0.15 
        
        if weather["wind_speed"] > 20:
            if courier_type == "bicycle":
                modifier -= 0.15 
        
        if weather["temperature"] < -15 or weather["temperature"] > 35:
            modifier -= 0.10  
        
        return max(0.5, modifier) 

weather_service = WeatherService()