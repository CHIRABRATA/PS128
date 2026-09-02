from pydantic import BaseModel, Field
from typing import List, Union, Optional, Dict, Any

class AnimalDetails(BaseModel):
    animal_id: Optional[str] = "COW-01"
    species: Optional[str] = "Cow"
    age_years: Optional[int] = 3
    vaccination_status: Optional[str] = "none"

class SymptomPredictionRequest(BaseModel):
    animal: Union[AnimalDetails, Dict[str, Any], str] = Field(
        default="Cow",
        example="Cow"
    )
    body_temp: Optional[float] = Field(default=38.5, example=40.1)
    heart_rate: Optional[float] = Field(default=80.0, example=95.0)
    symptoms: Union[List[str], str] = Field(
        ..., 
        example=["Fever", "Nasal Discharge", "Labored Breathing", "Coughing"]
    )
    duration_days: Optional[int] = Field(default=1, example=3)
    affected_count: Optional[int] = Field(default=1, example=2)
    herd_size: Optional[int] = Field(default=1, example=10)
    mortality_count: Optional[int] = Field(default=0, example=0)

class SymptomPredictionResponse(BaseModel):
    suspected_condition: str
    confidence: float
    animal_type: str
    vitals_evaluated: Dict[str, float]
    symptoms_analyzed: str
    epidemiology_context: Dict[str, int]
