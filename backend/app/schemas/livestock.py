from pydantic import BaseModel, Field
from typing import List, Optional

class Location(BaseModel):
    latitude: float
    longitude: float

class AnimalProfile(BaseModel):
    animal_id: str
    species: str = Field(..., description="e.g., cow, buffalo, goat, sheep")
    age_years: float
    vaccination_status: str = Field("unknown", description="full, partial, none, unknown")

class HealthReportInput(BaseModel):
    animal: AnimalProfile
    symptoms: List[str] = Field(..., description="List of observed symptoms (e.g., fever, limping, blisters)")
    duration_days: int = Field(1, description="How long the symptoms have been present")
    affected_count: int = Field(1, description="Number of animals showing these symptoms in the herd")
    herd_size: int = Field(..., description="Total number of animals in the herd")
    mortality_count: int = Field(0, description="Number of deaths recently")
    location: Optional[Location] = None

class RiskAnalysisResult(BaseModel):
    risk_score: int = Field(..., description="0-100 scale")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    suspected_condition: str = Field(..., description="Preliminary assessment. NOT A MEDICAL DIAGNOSIS.")
    confidence: float = Field(..., description="0.0 to 1.0 confidence score of the AI")
    reasons: List[str] = Field(..., description="Explainable AI reasons for the risk score")
    recommended_actions: List[str] = Field(..., description="Preventive and immediate actions")
