from fastapi import APIRouter, HTTPException
from app.schemas.livestock import HealthReportInput, RiskAnalysisResult
from app.services.ml_service import predictor
from app.services.risk_engine import calculate_hybrid_risk

router = APIRouter()

@router.post("/predict", response_model=RiskAnalysisResult, tags=["AI Assessment"])
async def predict_disease_risk(report: HealthReportInput):
    try:
        # 1. Get Base ML Prediction
        ml_result = predictor.predict(report.symptoms, report.duration_days)
        
        # 2. Run through Hybrid Epidemiological Risk Engine
        hybrid_result = calculate_hybrid_risk(ml_result, report)

        return RiskAnalysisResult(
            risk_score=hybrid_result["final_score"],
            risk_level=hybrid_result["risk_level"],
            suspected_condition=ml_result["suspected_condition"],
            confidence=ml_result["confidence"],
            reasons=hybrid_result["reasons"],
            recommended_actions=hybrid_result["recommended_actions"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
