from pydantic import BaseModel, Field
from typing import List, Dict

class MultilingualAdvisoryRequest(BaseModel):
    target_language: str = Field(default="hi", description="ISO language code: hi (Hindi), ta (Tamil), bn (Bengali), te (Telugu), mr (Marathi), en (English)")
    risk_level: str
    suspected_condition: str
    unified_recommendations: List[str]

class MultilingualAdvisoryResponse(BaseModel):
    language: str
    headline: str
    urgency_badge: str
    translated_condition: str
    localized_actions: List[str]
    emergency_contacts: Dict[str, str]
