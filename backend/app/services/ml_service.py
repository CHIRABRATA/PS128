import os
import joblib
import pandas as pd
import logging
from typing import Union, List, Any

logger = logging.getLogger(__name__)

PIPELINE_PATH = "app/ml_artifacts/species_aware_pipeline.pkl"

class SpeciesAwareDiseasePredictor:
    def __init__(self):
        if os.path.exists(PIPELINE_PATH):
            self.pipeline = joblib.load(PIPELINE_PATH)
            self.is_loaded = True
            logger.info("Successfully loaded species-aware multi-modal ML pipeline.")
        else:
            self.is_loaded = False
            logger.warning("Pipeline missing at app/ml_artifacts/species_aware_pipeline.pkl")

    def predict(
        self, 
        symptoms: Union[List[str], str], 
        animal_type: str = "Cow", 
        body_temp: float = 38.5, 
        heart_rate: float = 80.0,
        affected_count: int = 1,
        herd_size: int = 1,
        mortality_count: int = 0,
        **kwargs
    ) -> dict:
        symptoms_str = " ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)
        formatted_animal = str(animal_type).strip().capitalize()

        if not self.is_loaded:
            return {
                "suspected_condition": "Model Pipeline Not Loaded",
                "confidence": 0.0,
                "animal_type": formatted_animal,
                "vitals_evaluated": {"body_temp": body_temp, "heart_rate": heart_rate},
                "symptoms_analyzed": symptoms_str,
                "epidemiology_context": {
                    "affected_count": affected_count,
                    "herd_size": herd_size,
                    "mortality_count": mortality_count
                }
            }

        input_df = pd.DataFrame([{
            "Animal_Type_Clean": formatted_animal,
            "Body_Temp_Clean": float(body_temp),
            "Heart_Rate_Clean": float(heart_rate),
            "combined_symptoms": symptoms_str
        }])

        probabilities = self.pipeline.predict_proba(input_df)[0]
        classes = self.pipeline.classes_
        
        max_idx = probabilities.argmax()
        predicted_class = classes[max_idx]
        confidence = float(probabilities[max_idx])

        return {
            "suspected_condition": predicted_class,
            "confidence": round(confidence, 4),
            "animal_type": formatted_animal,
            "vitals_evaluated": {"body_temp": body_temp, "heart_rate": heart_rate},
            "symptoms_analyzed": symptoms_str,
            "epidemiology_context": {
                "affected_count": affected_count,
                "herd_size": herd_size,
                "mortality_count": mortality_count
            }
        }

predictor = SpeciesAwareDiseasePredictor()
