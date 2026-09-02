from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.livestock import HealthReportInput, RiskAnalysisResult
from app.schemas.iot import IoTData, IoTResponse
from app.schemas.analytics import WeatherRiskResponse, TrendAnalysisResponse

class MasterAnalysisRequest(BaseModel):
    health_report: HealthReportInput
    iot_telemetry: Optional[IoTData] = None
    latitude: float = Field(..., example=22.5726)
    longitude: float = Field(..., example=88.3639)
    region_id: str = Field(..., example="BLOCK-A")
    historical_weekly_cases: Optional[List[int]] = Field(default=[], description="Passed manually or fetched dynamically from DB")

class MasterAnalysisResponse(BaseModel):
    overall_risk_score: int
    overall_risk_level: str
    disease_prediction: RiskAnalysisResult
    iot_analysis: Optional[IoTResponse] = None
    weather_risk: WeatherRiskResponse
    epidemiological_trend: TrendAnalysisResponse
    unified_recommendations: List[str]
