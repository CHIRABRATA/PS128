import joblib
import numpy as np
import os

class DiseasePredictor:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))
        model_path = os.path.join(base_dir, 'ai', 'ml_models', 'rf_disease_model.joblib')
        mlb_path = os.path.join(base_dir, 'ai', 'ml_models', 'mlb_symptoms.joblib')
        
        self.model = joblib.load(model_path)
        self.mlb = joblib.load(mlb_path)

    def predict(self, symptoms: list[str], duration_days: int) -> dict:
        # Standardize symptom strings (lowercase, strip spaces)
        clean_symptoms = [s.lower().strip() for s in symptoms]
        
        # Transform symptoms using the saved MultiLabelBinarizer
        # Ignore unknown symptoms silently using classes_ intersection
        valid_symptoms = [s for s in clean_symptoms if s in self.mlb.classes_]
        
        # If no valid symptoms are found and they didn't report "none"
        if not valid_symptoms and "none" not in clean_symptoms:
            valid_symptoms = ["none"]

        symptoms_encoded = self.mlb.transform([valid_symptoms])
        
        # Combine with duration
        X_input = np.hstack((symptoms_encoded, [[duration_days]]))
        
        # Predict probability
        probabilities = self.model.predict_proba(X_input)[0]
        max_prob_index = np.argmax(probabilities)
        
        condition = self.model.classes_[max_prob_index]
        confidence = probabilities[max_prob_index]
        
        return {
            "suspected_condition": condition,
            "confidence": round(float(confidence), 2)
        }

# Singleton instance to load model only once at startup
predictor = DiseasePredictor()
