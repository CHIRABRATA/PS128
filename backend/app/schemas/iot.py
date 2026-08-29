from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class IoTData(BaseModel):
    animal_id: str = Field(..., description="Unique ID of the animal (e.g., ear tag)")
    temperature: float = Field(..., description="Body temperature in Celsius")
    activity: int = Field(..., description="Activity level score (0-100)")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class IoTResponse(BaseModel):
    status: str
    is_anomaly: bool
    risk_level: str
    message: str
