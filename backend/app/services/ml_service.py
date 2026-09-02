import os
import joblib
import logging
from typing import Union, List, Any

logger = logging.getLogger(__name__)

MODEL_PATH = "app/ml_artifacts/livestock_model.pkl"
VECTORIZER_PATH = "app/ml_artifacts/vectorizer.pkl"

class DiseasePredictor:
    def __init__(self):
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.vectorizer = joblib.load(VECTORIZER_PATH)
            self.is_loaded = True
            logger.info("Successfully loaded Random Forest model trained on Kaggle dataset.")
        else:
            self.is_loaded = False
            logger.warning("ML artifacts missing in app/ml_artifacts/")

    def predict(self, symptoms: Union[List[str], str], duration_days: int = 1, animal: Any = "Cow", herd_size: int = 1) -> dict:
        if not self.is_loaded:
            return {
                "suspected_condition": "Model Not Loaded",
                "confidence": 0.0,
                "symptoms_analyzed": str(symptoms)
            }

        # Handle list vs string for symptoms
        if isinstance(symptoms, list):
            symptoms_str = " ".join(symptoms)
        else:
            symptoms_str = str(symptoms)

        X_input = self.vectorizer.transform([symptoms_str])
        probabilities = self.model.predict_proba(X_input)[0]
        max_idx = probabilities.argmax()
        
        predicted_class = self.model.classes_[max_idx]
        confidence = float(probabilities[max_idx])

        return {
            "suspected_condition": predicted_class,
            "confidence": round(confidence, 4),
            "symptoms_analyzed": symptoms_str
        }

predictor = DiseasePredictor()
