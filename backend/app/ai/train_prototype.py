import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MultiLabelBinarizer
import joblib
import os

# 1. Define typical disease symptom profiles
disease_profiles = {
    "Healthy": {"symptoms": ["none"], "duration": 0},
    "Suspected Foot and Mouth Disease (FMD)": {"symptoms": ["fever", "blisters", "limping", "salivation"], "duration": 3},
    "Suspected Lumpy Skin Disease (LSD)": {"symptoms": ["fever", "nodules", "swelling", "loss_of_appetite"], "duration": 5},
    "Suspected Mastitis": {"symptoms": ["swelling", "fever", "pain"], "duration": 2},
    "Suspected Pneumonia": {"symptoms": ["cough", "fever", "nasal_discharge"], "duration": 4}
}

# 2. Generate Synthetic Dataset
data = []
labels = []
np.random.seed(42)

for _ in range(500):
    # Pick a random disease
    disease = np.random.choice(list(disease_profiles.keys()))
    base_symptoms = disease_profiles[disease]["symptoms"].copy()
    
    # Introduce some noise (randomly remove or add a symptom to simulate real-world messy data)
    if np.random.rand() > 0.3 and disease != "Healthy":
        base_symptoms.pop(np.random.randint(len(base_symptoms)))
    
    duration = disease_profiles[disease]["duration"] + np.random.randint(-1, 2)
    duration = max(0, duration) # Prevent negative duration
    
    data.append({"symptoms": base_symptoms, "duration_days": duration})
    labels.append(disease)

df = pd.DataFrame(data)

# 3. Preprocessing & Feature Engineering
# Convert list of symptoms into 0/1 columns
mlb = MultiLabelBinarizer()
symptoms_encoded = mlb.fit_transform(df['symptoms'])
symptom_classes = mlb.classes_

# Create final feature matrix
X_features = np.hstack((symptoms_encoded, df[['duration_days']].values))
y_labels = np.array(labels)

# 4. Train Model
clf = RandomForestClassifier(n_estimators=50, random_state=42)
clf.fit(X_features, y_labels)

# 5. Save the Model and the Binarizer
os.makedirs('app/ai/ml_models', exist_ok=True)
joblib.dump(clf, 'app/ai/ml_models/rf_disease_model.joblib')
joblib.dump(mlb, 'app/ai/ml_models/mlb_symptoms.joblib')

print("✅ Model trained and saved successfully at app/ai/ml_models/")
