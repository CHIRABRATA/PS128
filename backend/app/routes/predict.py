from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.services.vision_service import vision_engine

router = APIRouter(tags=["AI Assessment"])

@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),
    category: str = Form(..., description="Animal category: 'pet' or 'cow'"),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()
        prediction = vision_engine.predict(image_bytes, animal_type=category)
        return {"success": True, "data": prediction}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
