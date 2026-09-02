from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.iot_simulator import generate_simulated_telemetry

router = APIRouter()

class IoTDataRequest(BaseModel):
    animal_id: str = Field(default="ESP32-COW-01", example="ESP32-COW-01")
    temperature: Optional[float] = Field(default=None, example=40.1)
    activity: Optional[int] = Field(default=None, example=22)
    use_simulation: Optional[bool] = Field(default=False, example=False)
    simulate_fever: Optional[bool] = Field(default=False, example=False)

class IoTDataResponse(BaseModel):
    animal_id: str
    temperature: float
    activity_index: int
    has_anomaly: bool
    anomalies: List[str]

@router.post("/iot/data", response_model=IoTDataResponse, tags=["IoT & Wearables"])
async def ingest_iot_data(payload: IoTDataRequest):
    try:
        if payload.use_simulation or payload.temperature is None:
            simulated = generate_simulated_telemetry(
                animal_id=payload.animal_id,
                simulate_fever=payload.simulate_fever
            )
            temp = simulated["temperature"]
            activity = simulated["activity_index"]
        else:
            temp = payload.temperature
            activity = payload.activity if payload.activity is not None else 50

        anomalies = []
        if temp > 39.5:
            anomalies.append(f"Hyperthermia detected: Core temp {temp}°C exceeds 39.5°C threshold.")
        elif temp < 37.5:
            anomalies.append(f"Hypothermia detected: Core temp {temp}°C below 37.5°C threshold.")

        if activity < 30:
            anomalies.append(f"Lethargy detected: Movement activity index ({activity}) is critically low.")

        return {
            "animal_id": payload.animal_id,
            "temperature": temp,
            "activity_index": activity,
            "has_anomaly": len(anomalies) > 0,
            "anomalies": anomalies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
