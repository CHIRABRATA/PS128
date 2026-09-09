from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from app.services.advisory_service import generate_farmer_advisory

router = APIRouter()

class AdvisoryRequest(BaseModel):
    language: Optional[str] = Field(default="English", example="Hindi")
    analysis_data: Dict[str, Any] = Field(
        default={
            "overall_risk_score": 100,
            "overall_risk_level": "CRITICAL",
            "disease_prediction": {
                "suspected_condition": "Foot and Mouth Disease",
                "confidence": 0.85
            },
            "iot_telemetry_analysis": {
                "anomalies": ["Hyperthermia detected: 40.1°C"]
            },
            "weather_analysis": {
                "vector_breeding_risk": "HIGH"
            },
            "outbreak_surge_analysis": {
                "is_outbreak_spike": True
            }
        }
    )

@router.post("/advisory/generate", tags=["GenAI Multilingual Advisory Engine"])
async def get_advisory(payload: AdvisoryRequest):
    try:
        res = generate_farmer_advisory(
            analysis_data=payload.analysis_data,
            language=payload.language
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
