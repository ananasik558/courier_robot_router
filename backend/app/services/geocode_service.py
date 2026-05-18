import requests
from typing import Optional, Tuple
from functools import lru_cache

class GeocodeService:
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/search"
        self.headers = {
            "User-Agent": "CourierOptimizationApp/1.0 (Diploma Project MAI)"
        }
    
    @lru_cache(maxsize=100)
    def geocode(self, address: str, city: str = "Москва") -> Optional[Tuple[float, float]]:
        query = f"{address}, {city}" if city else address
        
        params = {
            "q": query,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
        
        try:
            response = requests.get(
                self.base_url, 
                params=params, 
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                print(f"Geocoded '{address}' -> ({lat}, {lon})")
                return (lat, lon)
            else:
                print(f"Address not found: {address}")
                return None
                
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
    
    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1
        }
        
        try:
            response = requests.get(
                url, 
                params=params, 
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data and "display_name" in data:
                return data["display_name"]
            return None
            
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return None

geocode_service = GeocodeService()