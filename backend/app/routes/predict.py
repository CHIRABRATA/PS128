from fastapi import APIRouter, HTTPException
from app.schemas.livestock import HealthReportInput, RiskAnalysisResult
from app.services.ml_service import predictor

router = APIRouter()

@router.post("/predict", response_model=RiskAnalysisResult, tags=["AI Assessment"])
async def predict_disease_risk(report: HealthReportInput):
    try:
        # Get ML Prediction
        ml_result = predictor.predict(report.symptoms, report.duration_days)
        
        # Basic Risk Logic (We will expand this in Checkpoint 4)
        risk_score = int(ml_result["confidence"] * 100)
        
        if ml_result["suspected_condition"] == "Healthy":
            risk_level = "LOW"
            risk_score = 10
            actions = ["Maintain standard care and hygiene."]
        elif risk_score > 75:
            risk_level = "HIGH"
            actions = ["Isolate animal immediately.", "Contact local veterinary officer.", "Do not consume/sell milk."]
        else:
            risk_level = "MEDIUM"
            actions = ["Monitor closely for 24 hours.", "Ensure hydration."]

        return RiskAnalysisResult(
            risk_score=risk_score,
            risk_level=risk_level,
            suspected_condition=ml_result["suspected_condition"],
            confidence=ml_result["confidence"],
            reasons=[
                f"AI identified pattern matching {ml_result['suspected_condition']}",
                f"Symptoms reported for {report.duration_days} days."
            ],
            recommended_actions=actions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
