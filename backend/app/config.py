from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@db:5432/courier_db"
    OSRM_URL: str = "http://osrm:5000"
    OSRM_PROFILE: str = "bicycle" 
    
    GA_POPULATION_SIZE: int = 50
    GA_GENERATIONS: int = 100
    GA_MUTATION_RATE: float = 0.1
    GA_CROSSOVER_RATE: float = 0.8
    
    MAX_DELIVERY_TIME_MINUTES: int = 45  
    FOOD_COOLING_TIME_MINUTES: int = 30 
    
    class Config:
        env_file = ".env"

settings = Settings()