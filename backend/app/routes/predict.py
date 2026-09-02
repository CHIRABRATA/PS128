from fastapi import APIRouter, HTTPException
from app.schemas.predict import SymptomPredictionRequest, SymptomPredictionResponse
from app.services.ml_service import predictor

router = APIRouter()

@router.post("/predict", response_model=SymptomPredictionResponse, tags=["AI Assessment"])
async def predict_disease_risk(payload: SymptomPredictionRequest):
    try:
        res = predictor.predict(
            symptoms=payload.symptoms,
            duration_days=payload.duration_days,
            animal=payload.animal,
            herd_size=payload.herd_size
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
