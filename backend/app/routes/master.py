from fastapi import APIRouter, HTTPException
from app.schemas.master import MasterAnalysisRequest, MasterAnalysisResponse
from app.services.master_service import execute_master_analysis

router = APIRouter()

@router.post("/analyze", response_model=MasterAnalysisResponse, tags=["Master Analysis Engine"])
async def analyze_livestock_health(request: MasterAnalysisRequest):
    """
    Unified Endpoint: Evaluates ML prediction, epidemiological dynamics,
    IoT sensor vitals, live weather APIs, and regional disease trends.
    """
    try:
        return await execute_master_analysis(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
