import io
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

class VisionService:
    def __init__(self, models_dir: str | None = None):
        if models_dir is None:
            models_dir = Path(__file__).resolve().parents[1] / "ml_artifacts"
        else:
            models_dir = Path(models_dir)

        # Load models using Ultralytics YOLO class
        pet_path = models_dir / "model_pet.pt"
        cow_path = models_dir / "model_cow.pt"

        self.pet_model = YOLO(pet_path)
        self.cow_model = YOLO(cow_path)

    def predict(self, image_bytes: bytes, animal_type: str) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Select model based on animal type
        if animal_type.lower() in ["pet", "dog", "cat"]:
            model = self.pet_model
        elif animal_type.lower() in ["cow", "cattle"]:
            model = self.cow_model
        else:
            raise ValueError(f"Unsupported animal category: {animal_type}")

        # Perform inference
        results = model(image)
        result = results[0]  # First image output

        # For Classification Models (YOLOv8-cls)
        if hasattr(result, "probs") and result.probs is not None:
            top_idx = result.probs.top1
            top_conf = float(result.probs.top1conf)
            class_name = result.names[top_idx]

            return {
                "primary_prediction": class_name,
                "confidence": round(top_conf * 100, 2),
                "top_predictions": [
                    {
                        "condition": result.names[idx],
                        "confidence": round(float(conf) * 100, 2)
                    }
                    for idx, conf in zip(result.probs.top5, result.probs.top5conf)
                ]
            }

        # For Object Detection Models (YOLOv8-det)
        detections = []
        if hasattr(result, "boxes") and result.boxes is not None:
            for box in result.boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                detections.append({
                    "condition": result.names[cls_id],
                    "confidence": round(conf * 100, 2)
                })

        return {
            "primary_prediction": detections[0]["condition"] if detections else "No disease detected",
            "confidence": detections[0]["confidence"] if detections else 0.0,
            "all_detections": detections
        }

vision_engine = VisionService()