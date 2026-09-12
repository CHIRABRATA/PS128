from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import logging
from app.services.vision_service import vision_engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Assessment"])

@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),
    category: str = Form(..., description="Animal category: 'pet' or 'cow'"),
):
    # Support standard image mime-types and fallback by filename extension
    is_image = (
        (file.content_type and (file.content_type.startswith("image/") or file.content_type == "application/octet-stream"))
        or (file.filename and file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")))
    )
    if not is_image:
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()
        if not image_bytes or len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

        prediction = vision_engine.predict(image_bytes, animal_type=category)
        prediction["visual_anomaly_detected"] = (
            prediction.get("primary_prediction") not in {"Healthy", "No disease detected"}
        )
        return {"success": True, "yolo_result": prediction}
    except HTTPException:
        raise
    except (ValueError, OSError) as e:
        logger.warning(f"Invalid image uploaded to /api/predict: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid or unsupported image: {e}")
    except Exception as e:
        logger.exception(f"Inference error during /api/predict: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

