from fastapi import APIRouter, HTTPException
from app.schemas.analytics import (
    WeatherRequest, 
    WeatherRiskResponse, 
    HistoricalTrendRequest, 
    TrendAnalysisResponse
)
from app.services.weather_service import fetch_weather_risk
from app.services.trend_service import evaluate_disease_trend

router = APIRouter()

@router.post("/weather/risk", response_model=WeatherRiskResponse, tags=["Environmental & Trends"])
async def get_weather_risk_assessment(payload: WeatherRequest):
    try:
        return fetch_weather_risk(payload.latitude, payload.longitude)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trends/analyze", response_model=TrendAnalysisResponse, tags=["Environmental & Trends"])
async def analyze_trend_surge(payload: HistoricalTrendRequest):
    try:
        return evaluate_disease_trend(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
