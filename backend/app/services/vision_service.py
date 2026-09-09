import io
import base64
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

LABEL_MAP = {
    "lumpy": "Lumpy Skin Disease",
    "foot-and-mouth": "Foot and Mouth Disease",
    "healthy": "Healthy",
}

CATTLE_MODEL_LABELS = {"foot-and-mouth", "healthy", "lumpy"}

PET_DISEASE_MAP = {
    "Dermatitis": {
        "severity": "MODERATE",
        "description": "Inflammation of the skin, causing redness, itchiness, and irritation.",
        "contagious": False,
    },
    "Fungal_infections": {
        "severity": "MODERATE",
        "description": "Fungal growth causing skin irritation, hair loss, and scaly patches.",
        "contagious": True,
    },
    "Healthy": {
        "severity": "LOW",
        "description": "Skin and coat appear healthy with no visible lesions or parasites.",
        "contagious": False,
    },
    "Hypersensitivity": {
        "severity": "MODERATE",
        "description": "Allergic reaction leading to localized swelling, redness, or hives.",
        "contagious": False,
    },
    "demodicosis": {
        "severity": "HIGH",
        "description": "Mite infestation causing localized or generalized hair loss and skin scaling.",
        "contagious": False,
    },
    "ringworm": {
        "severity": "HIGH",
        "description": "Highly contagious fungal skin infection causing circular lesions and hair loss.",
        "contagious": True,
    },
}

COW_DISEASE_MAP = {
    "foot-and-mouth": {
        "severity": "CRITICAL",
        "description": "Highly contagious viral disease causing fever, blisters, and lesions on the feet and mouth.",
        "contagious": True,
    },
    "healthy": {
        "severity": "LOW",
        "description": "Skin and coat appear healthy with no visible lesions or systemic anomalies.",
        "contagious": False,
    },
    "lumpy": {
        "severity": "HIGH",
        "description": "Lumpy Skin Disease (LSD) characterized by fever and prominent cutaneous nodules across the body.",
        "contagious": True,
    },
}


def format_label(label: str) -> str:
    return LABEL_MAP.get(label.lower(), label)


def pet_metadata(label: str) -> dict:
    normalized_label = str(label).strip().lower()
    return next(
        (metadata for name, metadata in PET_DISEASE_MAP.items() if name.lower() == normalized_label),
        {},
    )


def disease_metadata(label: str, animal_lower: str) -> dict:
    if animal_lower in ["pet", "dog", "cat"]:
        return pet_metadata(label)
    if animal_lower in ["cow", "cattle", "livestock"]:
        return COW_DISEASE_MAP.get(str(label).strip().lower(), {})
    return {}


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

    def predict_image_lesions(
        self,
        image_input: str | bytes | None,
        animal_type: str = "cow",
    ) -> dict | None:
        if not image_input:
            return None

        if isinstance(image_input, bytes):
            image_bytes = image_input
        elif isinstance(image_input, str):
            encoded_image = image_input.split(",", 1)[-1]
            try:
                image_bytes = base64.b64decode(encoded_image)
            except (ValueError, base64.binascii.Error) as exc:
                raise ValueError("image_data must be valid base64 image data") from exc
        else:
            raise ValueError("image_data must be base64 image data or bytes")

        prediction = self.predict(image_bytes, animal_type=animal_type)
        prediction["visual_anomaly_detected"] = (
            prediction.get("primary_prediction") != "Healthy"
            and prediction.get("primary_prediction") != "No disease detected"
        )
        return prediction

    def predict(self, image_bytes: bytes, animal_type: str) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        animal_lower = str(animal_type).strip().lower()

        # Select the requested model explicitly; never use the cow model as a fallback.
        if animal_lower in ["pet", "dog", "cat"] and self.pet_model is not None:
            pet_labels = {str(label).strip().lower() for label in self.pet_model.names.values()}
            if pet_labels == CATTLE_MODEL_LABELS:
                raise ValueError(
                    "The pet model contains cattle disease classes. "
                    "Replace app/ml_artifacts/model_pet.pt with a pet-trained model."
                )
            model = self.pet_model
        elif animal_lower in ["cow", "cattle", "livestock"] and self.cow_model is not None:
            model = self.cow_model
        else:
            raise ValueError(f"No valid model available for animal category: '{animal_type}'")

        # Perform inference
        results = model(image)
        result = results[0]  # First image output

        # For Classification Models (YOLOv8-cls)
        if hasattr(result, "probs") and result.probs is not None:
            top_idx = result.probs.top1
            top_conf = float(result.probs.top1conf)
            class_name = format_label(result.names[top_idx])

            return {
                "primary_prediction": class_name,
                "confidence": round(top_conf * 100, 2),
                **disease_metadata(result.names[top_idx], animal_lower),
                "top_predictions": [
                    {
                        "condition": format_label(result.names[idx]),
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
                    "condition": format_label(result.names[cls_id]),
                    "confidence": round(conf * 100, 2)
                })

        primary_prediction = detections[0]["condition"] if detections else "No disease detected"
        response = {
            "primary_prediction": primary_prediction,
            "confidence": detections[0]["confidence"] if detections else 0.0,
            "all_detections": detections,
        }
        if animal_lower in ["pet", "dog", "cat"]:
            response.update(disease_metadata(primary_prediction, animal_lower))
        return response
    

vision_engine = VisionService()