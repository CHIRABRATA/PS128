from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings

router = APIRouter()


@router.get("/health", tags=["System"])
async def health_check():
    """System health check and basic diagnostic info."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "modules": {
            "api": "online",
            "cors_configured": True,
        }
    }
