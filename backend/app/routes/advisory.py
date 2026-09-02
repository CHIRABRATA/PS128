from fastapi import APIRouter, HTTPException
from app.schemas.advisory import MultilingualAdvisoryRequest, MultilingualAdvisoryResponse
from app.services.advisory_service import generate_multilingual_advisory

router = APIRouter()

@router.post("/advisory/translate", response_model=MultilingualAdvisoryResponse, tags=["Multilingual Advisory"])
async def translate_advisory_directive(payload: MultilingualAdvisoryRequest):
    """
    Translates risk engine outcomes into localized regional language directives (Hindi, Tamil, Bengali, etc.)
    with national emergency contacts.
    """
    try:
        return generate_multilingual_advisory(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
