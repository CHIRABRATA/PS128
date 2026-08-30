from fastapi import APIRouter, HTTPException
from app.schemas.iot import IoTData, IoTResponse
from app.services.iot_service import analyze_iot_telemetry

router = APIRouter()

@router.post("/iot/data", response_model=IoTResponse, tags=["IoT & Wearables"])
async def ingest_iot_telemetry(telemetry: IoTData):
    """
    Ingests vital telemetry from ESP32 collar/tag or simulator.
    Evaluates temperature and mobility patterns in real time.
    """
    try:
        result = analyze_iot_telemetry(telemetry)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
