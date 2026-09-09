from pydantic import BaseModel, Field
from typing import List, Optional

class WeatherRequest(BaseModel):
    latitude: float = Field(..., example=22.5726)
    longitude: float = Field(..., example=88.3639)

class WeatherRiskResponse(BaseModel):
    temperature: float
    humidity: float
    precipitation: float
    vector_breeding_risk: str = Field(..., description="LOW, MODERATE, HIGH")
    weather_advisory: str
    source: str

class HistoricalTrendRequest(BaseModel):
    region_id: str
    disease_name: str
    current_week_cases: int
    historical_weekly_cases: List[int] = Field(..., description="Case counts for the past 4-8 weeks")

class TrendAnalysisResponse(BaseModel):
    trend: str = Field(..., description="STABLE, INCREASING, SURGE_ALERT")
    is_outbreak_spike: bool
    historical_average: float
    percentage_increase: float
    message: str
