import os
import re
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier

DATASET_PATH = "data/animal_disease_prediction.csv"

def clean_num(val, default):
    if pd.isna(val):
        return default
    match = re.search(r"[-+]?\d*\.\d+|\d+", str(val))
    return float(match.group()) if match else default

def find_column(df, possible_names):
    """Finds the first matching column name from a list of possibilities regardless of case/spaces."""
    df_cols_clean = {str(col).strip().lower(): col for col in df.columns}
    for name in possible_names:
        clean_name = name.strip().lower()
        if clean_name in df_cols_clean:
            return df_cols_clean[clean_name]
    return None

def train_enhanced_model():
    if not os.path.exists(DATASET_PATH):
        print(f"Dataset missing at {DATASET_PATH}")
        return

    print("Loading dataset for species-aware multi-modal training...")
    df = pd.read_csv(DATASET_PATH)
    print(f"Detected dataset columns: {list(df.columns)}")

    # 1. Resolve column names dynamically
    temp_col = find_column(df, ["Body_Temp", "Body_Temperature", "Temperature", "BodyTemp", "Temp"])
    heart_col = find_column(df, ["Heart_Rate", "HeartRate", "Pulse", "Pulse_Rate"])
    animal_col = find_column(df, ["Animal_Type", "Animal", "Species", "AnimalType"])
    target_col = find_column(df, ["Disease_Prediction", "Disease", "Condition", "Prediction", "Target"])

    if not target_col:
        raise KeyError(f"Could not find a target disease column in {list(df.columns)}")

    # 2. Clean numerical telemetry
    if temp_col:
        df["Body_Temp_Clean"] = df[temp_col].apply(lambda x: clean_num(x, 38.5))
    else:
        print("Warning: Body Temperature column not found. Defaulting to 38.5°C.")
        df["Body_Temp_Clean"] = 38.5

    if heart_col:
        df["Heart_Rate_Clean"] = df[heart_col].apply(lambda x: clean_num(x, 80.0))
    else:
        print("Warning: Heart Rate column not found. Defaulting to 80.0 bpm.")
        df["Heart_Rate_Clean"] = 80.0

    if animal_col:
        df["Animal_Type_Clean"] = df[animal_col].fillna("Cow").astype(str).str.strip().str.capitalize()
    else:
        df["Animal_Type_Clean"] = "Cow"

    # 3. Combine text and binary symptom features
    symptom_cols = [c for c in df.columns if c.lower().startswith("symptom")]
    flag_cols = ["Appetite_Loss", "Vomiting", "Diarrhea", "Coughing", "Labored_Breathing", "Lameness", "Skin_Lesions", "Nasal_Discharge", "Eye_Discharge"]

    def combine_symptoms(row):
        symptom_list = []
        for col in symptom_cols:
            val = str(row[col]).strip()
            if val and val.lower() not in ["nan", "none", "no"]:
                symptom_list.append(val)
        for flag in flag_cols:
            matching_flag_col = find_column(df, [flag])
            if matching_flag_col and str(row[matching_flag_col]).strip().lower() == "yes":
                symptom_list.append(flag.replace("_", " "))
        return " ".join(symptom_list) if symptom_list else "unspecified symptoms"

    df["combined_symptoms"] = df.apply(combine_symptoms, axis=1)

    # 4. Separate features and targets
    X = df[["Animal_Type_Clean", "Body_Temp_Clean", "Heart_Rate_Clean", "combined_symptoms"]]
    y = df[target_col]

    # 5. Multi-modal Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("species", OneHotEncoder(handle_unknown="ignore"), ["Animal_Type_Clean"]),
            ("vitals", StandardScaler(), ["Body_Temp_Clean", "Heart_Rate_Clean"]),
            ("text", TfidfVectorizer(ngram_range=(1, 2)), "combined_symptoms")
        ]
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=150, random_state=42))
    ])

    print("Training species-aware RandomForest model...")
    pipeline.fit(X, y)

    # 6. Export unified model pipeline
    os.makedirs("app/ml_artifacts", exist_ok=True)
    joblib.dump(pipeline, "app/ml_artifacts/species_aware_pipeline.pkl")
    print(f"Successfully trained on {len(df)} records across {y.nunique()} disease classes.")
    print("Pipeline exported to app/ml_artifacts/species_aware_pipeline.pkl")

if __name__ == "__main__":
    train_enhanced_model()
