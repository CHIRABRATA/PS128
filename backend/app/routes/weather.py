from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.weather_service import fetch_weather_risk

router = APIRouter()

class WeatherRiskRequest(BaseModel):
    latitude: float = Field(default=28.6139, example=28.6139)
    longitude: float = Field(default=77.2090, example=77.2090)

class WeatherRiskResponse(BaseModel):
    temperature: float
    humidity: float
    precipitation: float
    vector_breeding_risk: str
    weather_advisory: str
    source: str

@router.post("/weather/risk", response_model=WeatherRiskResponse, tags=["Environmental & Trends"])
async def evaluate_weather_risk(payload: WeatherRiskRequest):
    try:
        risk_data = fetch_weather_risk(latitude=payload.latitude, longitude=payload.longitude)
        return risk_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
