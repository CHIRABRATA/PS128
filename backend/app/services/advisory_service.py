import os
import logging
import requests
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_KEY_1 = os.getenv("GEMINI_API_KEY_1", os.getenv("GEMINI_API_KEY", ""))
GEMINI_KEY_2 = os.getenv("GEMINI_API_KEY_2", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

def _call_gemini(api_key: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

def _call_groq(api_key: str, model_name: str, prompt: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "You are a concise veterinary advisor giving brief emergency instructions to farmers."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]

def generate_farmer_advisory(analysis_data: Dict[str, Any], language: str = "English") -> Dict[str, Any]:
    yolo_res = analysis_data.get("yolo_vision_analysis") or {}
    yolo_condition = (
        yolo_res.get("primary_prediction")
        if yolo_res.get("visual_anomaly_detected")
        else None
    )
    ml_condition = analysis_data.get("disease_prediction", {}).get("suspected_condition")
    disease = yolo_condition if yolo_condition else (ml_condition or "Unspecified Condition")
    risk_level = analysis_data.get("overall_risk_level", "ELEVATED")
    risk_score = analysis_data.get("overall_risk_score", 50)
    iot_anomalies = analysis_data.get("iot_telemetry_analysis", {}).get("anomalies", [])
    weather_risk = analysis_data.get("weather_analysis", {}).get("vector_breeding_risk", "NORMAL")
    is_outbreak = analysis_data.get("outbreak_surge_analysis", {}).get("is_outbreak_spike", False)

    # CONCISE MOBILE-FRIENDLY PROMPT (< 150 words)
    prompt = f"""
    Create a VERY SHORT emergency advisory for a farmer in language: {language}.
    Maximum length: 150 words total. Use plain bullet points only. No long paragraphs, no markdown tables.
    Never use the words "DIAGNOSIS" or "DIAGNOSED".
    Use terms such as:
    - preliminary assessment
    - possible condition
    - suspected condition
    - model signal
    Do not present the ML prediction as a confirmed veterinary diagnosis.

    PRELIMINARY ASSESSMENT & CONTEXT:
    - Disease: {disease} (Risk Level: {risk_level}, Score: {risk_score}/100)
    - IoT Anomalies: {', '.join(iot_anomalies) if iot_anomalies else 'None'}
    - Environmental Risk: Mosquito/Vector Breeding Risk is {weather_risk}
    - Local Area Spike: {'YES (Regional Surge Active)' if is_outbreak else 'No'}

    FORMAT EXACTLY AS:
    🚨 **PRELIMINARY ASSESSMENT:** 1-sentence warning using "suspected condition" or "possible condition" in simple language.
    ⚡ **3 IMMEDIATE ACTIONS:**
    1. Action 1 (Isolation / Treatment)
      2. Action 2 (Contact Vet)
    3. Action 3 (Vector Control / Disinfection)
    📞 **EMERGENCY VET:** Call local officer immediately.
    """

    providers = [
        ("Gemini (Key 1)", lambda: _call_gemini(GEMINI_KEY_1, prompt)),
        ("Gemini (Key 2)", lambda: _call_gemini(GEMINI_KEY_2, prompt)),
        (f"Groq ({GROQ_MODEL})", lambda: _call_groq(GROQ_KEY, GROQ_MODEL, prompt))
    ]

    advisory_text = None
    used_provider = None

    for name, func in providers:
        try:
            logger.info(f"Attempting advisory generation using {name}...")
            advisory_text = func()
            used_provider = name
            logger.info(f"Successfully generated advisory using {name}")
            break
        except Exception as e:
            logger.warning(f"Provider {name} failed: {e}. Trying next fallback...")

    if not advisory_text:
        advisory_text = (
            f"🚨 CRITICAL WARNING ({risk_level}): Suspected {disease}.\n"
            f"1. Isolate sick animals immediately.\n"
            f"2. Call local veterinarian.\n"
            f"3. Disinfect entry points with bleach water."
        )
        used_provider = "Static Fallback"

    return {
        "language": language,
        "advisory": advisory_text,
        "provider_used": used_provider
    }
