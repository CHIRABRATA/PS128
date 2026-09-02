import os
import re
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

DATASET_PATH = "data/animal_disease_prediction.csv"

def clean_temp(val):
    """Extracts floating point temperature value from strings like '39.5°C' or '40.1Â°C'."""
    if pd.isna(val):
        return 38.5
    match = re.search(r"[-+]?\d*\.\d+|\d+", str(val))
    return float(match.group()) if match else 38.5

def train_kaggle_model():
    if not os.path.exists(DATASET_PATH):
        print(f"File not found at {DATASET_PATH}. Please download it from Kaggle and place it in the data/ folder.")
        return

    print("Loading Kaggle dataset...")
    df = pd.read_csv(DATASET_PATH)

    # 1. Clean temperature column
    if "Body_Temp" in df.columns:
        df["Body_Temp_Clean"] = df["Body_Temp"].apply(clean_temp)
    else:
        df["Body_Temp_Clean"] = 38.5

    # 2. Combine multi-column text symptoms into a single string
    symptom_cols = [c for c in df.columns if c.startswith("Symptom_")]
    
    def combine_symptoms(row):
        symptom_list = []
        for col in symptom_cols:
            val = str(row[col]).strip()
            if val and val.lower() not in ["nan", "none", "no"]:
                symptom_list.append(val)
        
        # Add binary symptom flags if 'Yes'
        flag_cols = ["Appetite_Loss", "Vomiting", "Diarrhea", "Coughing", "Labored_Breathing", "Lameness", "Skin_Lesions", "Nasal_Discharge", "Eye_Discharge"]
        for flag in flag_cols:
            if flag in row and str(row[flag]).strip().lower() == "yes":
                symptom_list.append(flag.replace("_", " "))
                
        return " ".join(symptom_list)

    df["combined_symptoms"] = df.apply(combine_symptoms, axis=1)

    # 3. Vectorize text features
    vectorizer = TfidfVectorizer(ngram_range=(1, 2))
    X = vectorizer.fit_transform(df["combined_symptoms"])
    y = df["Disease_Prediction"]

    # 4. Train Random Forest Model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    # 5. Save model artifacts
    os.makedirs("app/ml_artifacts", exist_ok=True)
    joblib.dump(model, "app/ml_artifacts/livestock_model.pkl")
    joblib.dump(vectorizer, "app/ml_artifacts/vectorizer.pkl")

    print(f"Successfully trained on {len(df)} records across {y.nunique()} disease classes!")
    print("Artifacts saved to app/ml_artifacts/")

if __name__ == "__main__":
    train_kaggle_model()
